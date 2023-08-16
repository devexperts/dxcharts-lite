/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Bounds } from '../../model/bounds.model';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CustomIcon, FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { redrawBackgroundArea } from '../../drawers/chart-background.drawer';
import { Drawer } from '../../drawers/drawing-manager';
import { DateTimeFormatter } from '../../model/date-time.formatter';
import { ChartModel } from '../chart/chart.model';
import { EconomicEvent, EventsModel, EventType, EventWithId } from './events.model';

interface CreatedCustomIcon {
	img: HTMLImageElement;
	svgHeight: number;
}

const eventsSizesDict = {
	'rhombus-small': 4,
	rhombus: 6,
	'rhombus-large': 8,
};

const getIconHash = (type: EventType, state: keyof CustomIcon) => `${type}_${state}`;

export class EventsDrawer implements Drawer {
	// cache of created icons
	private customIcons: Record<string, CreatedCustomIcon> = {};

	constructor(
		private backgroundCanvas: CanvasModel,
		private canvasModel: CanvasModel,
		private chartModel: ChartModel,
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private model: EventsModel,
		private formatterProvider: () => DateTimeFormatter,
	) {
		const iconsConfig = this.config.components.events.icons;
		if (iconsConfig) {
			this.createCustomIcon('earnings', iconsConfig.earnings);
			this.createCustomIcon('dividends', iconsConfig.dividends);
			this.createCustomIcon('splits', iconsConfig.splits);
			this.createCustomIcon('conference-calls', iconsConfig.conferenceCalls);
		}
	}

	/**
	 * Creates a custom icon for a given event type.
	 * @param {EventType} type - The type of the event.
	 * @param {CustomIcon} [icon] - The custom icon object containing the normal and hover images.
	 * @returns {void}
	 */
	createCustomIcon(type: EventType, icon?: CustomIcon) {
		if (icon) {
			const normal = this.createIconImage(icon.normal);
			const hover = this.createIconImage(icon.hover);
			this.customIcons[getIconHash(type, 'normal')] = normal;
			this.customIcons[getIconHash(type, 'hover')] = hover;
		}
	}

	/**
	 * Creates an icon image from a string containing SVG data.
	 * @param {string} iconString - The string containing SVG data.
	 * @returns {Object} An object containing an Image object and the height of the SVG element.
	 */
	createIconImage(iconString: string) {
		const parser = new DOMParser();
		const svgSelector = parser.parseFromString(iconString, 'text/html').querySelector('svg');
		let svgHeight = 0;
		if (svgSelector) {
			svgHeight = parseInt(svgSelector.getAttribute('height') ?? '', 10);
		}
		const svg64 = btoa(iconString);
		const b64Start = 'data:image/svg+xml;base64,';
		const image64 = b64Start + svg64;
		const img = new Image();
		img.src = image64;
		return {
			img,
			svgHeight,
		};
	}

	/**
	 * Draws events on the chart canvas if they are visible according to the configuration.
	 * The events are filtered by type and then iterated over to draw them on the chart.
	 * If a custom icon is available in the cache, it is used to draw the event, otherwise a default event is drawn.
	 * If the event is currently being hovered over, a vertical line is drawn and a label is added to the x-axis.
	 * @returns {void}
	 */
	draw(): void {
		if (!this.config.components.events.visible) {
			return;
		}

		const bounds = this.canvasBoundsContainer.getBounds(CanvasElement.EVENTS);
		const chartBounds = this.canvasBoundsContainer.getBounds(CanvasElement.ALL_PANES);

		const ctx = this.canvasModel.ctx;
		ctx.save();

		this.model.events
			.filter(e => this.config.components.events.eventsVisibility[e.type])
			.forEach(event => {
				const x = this.chartModel.candleFromTimestamp(event.timestamp).xCenter(this.chartModel.scaleModel);
				if (x > chartBounds.x && x < chartBounds.x + chartBounds.width) {
					const color = this.config.colors.events[event.type].color;
					ctx.strokeStyle = color;

					// check custom icon in cache
					if (this.customIcons[getIconHash(event.type, 'hover')] !== undefined) {
						this.drawCustomSvgEvent(ctx, x, bounds, event);
					} else {
						this.drawDefaultEvent(ctx, x, bounds, event, color);
					}
					// draw vertical line and label for the hovered event
					if (this.model.hoveredEvent.getValue() === event) {
						ctx.beginPath();
						ctx.moveTo(x, chartBounds.y);
						ctx.lineTo(x, bounds.y + bounds.height / 2);
						ctx.stroke();
						ctx.closePath();
						if (this.config.components.xAxis.visible) {
							this.drawLabel(x, event);
						}
					}
				}
			});

		ctx.restore();
	}

	/**
	 * Draws a custom SVG event on a canvas context.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {number} x - The x coordinate of the event.
	 * @param {Bounds} bounds - The bounds of the event.
	 * @param {EventWithId} event - The event to draw.
	 * @returns {void}
	 */
	drawCustomSvgEvent(ctx: CanvasRenderingContext2D, x: number, bounds: Bounds, event: EventWithId) {
		const y = bounds.y + bounds.height / 2;
		const normal = this.customIcons[getIconHash(event.type, 'normal')];
		const hover = this.customIcons[getIconHash(event.type, 'hover')];
		if (this.model.hoveredEvent.getValue() === event) {
			ctx.drawImage(hover.img, x - hover.svgHeight / 2, y - hover.svgHeight / 2);
		} else {
			ctx.drawImage(normal.img, x - normal.svgHeight / 2, y - normal.svgHeight / 2);
		}
	}

	/**
	 * Draws a default event on a canvas context.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {number} x - The x coordinate of the event.
	 * @param {Bounds} bounds - The bounds of the event.
	 * @param {EventWithId} event - The event to draw.
	 * @param {string} color - The color of the event.
	 * @returns {void}
	 */
	drawDefaultEvent(ctx: CanvasRenderingContext2D, x: number, bounds: Bounds, event: EventWithId, color: string) {
		const y = bounds.y + bounds.height / 2;
		ctx.fillStyle = color;
		// draw figure
		ctx.lineWidth = 1.5; // 1.5 pixels
		const size = getEventSize(event);
		ctx.beginPath();
		ctx.moveTo(x - size, y);
		ctx.lineTo(x, y - size);
		ctx.lineTo(x + size, y);
		ctx.lineTo(x, y + size);
		ctx.closePath();
		if (this.model.hoveredEvent.getValue() === event) {
			ctx.fill();
		} else {
			ctx.stroke();
		}
	}

	/**
	 * This function is responsible for drawing a label on the canvas at a given x coordinate. The label contains a formatted timestamp of a given event. The function takes two parameters: x, which is the x coordinate where the label will be drawn, and event, which is an object containing information about the event, including its timestamp and type.
	 * The function first gets the canvas context and the bounds of the x-axis. It then retrieves the font family, font height, and top padding from the configuration object. The y coordinate of the label is calculated based on the font height, top padding, and the y coordinate of the x-axis bounds. The font is set using the retrieved font family and font height.
	 * The timestamp of the event is formatted using a formatter provider function. The width of the label is calculated using the canvas context's measureText() method. The function then calls another function, redrawBackgroundArea(), to hide the regular x-axis label that may overlap with the event label.
	 * Finally, the function sets the fill style of the canvas context to the color associated with the event type in the configuration object. The label text is then drawn on the canvas context at the calculated x and y coordinates.
	 */
	drawLabel(x: number, event: EventWithId) {
		const ctx = this.canvasModel.ctx;
		const xAxisBounds = this.canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
		const fontFamily = this.config.components.xAxis.fontFamily;
		const fontHeight = this.config.components.xAxis.fontSize;
		const offsetTop = this.config.components.xAxis.padding.top ?? 0;
		const y = xAxisBounds.y + fontHeight - 1 + offsetTop;
		ctx.font = `${fontHeight}px ${fontFamily}`;
		const labelText = this.formatterProvider()(event.timestamp);
		const width = ctx.measureText(labelText).width;
		// label can overlap with regular x-axis label, so we need to hide regular x-axis label
		redrawBackgroundArea(
			this.backgroundCanvas.ctx,
			ctx,
			x - width / 2,
			xAxisBounds.y + 1,
			width,
			xAxisBounds.height - 1,
		);

		ctx.fillStyle = this.config.colors.events[event.type].color;
		ctx.fillText(labelText, x - width / 2, y);
	}

	/**
	 * Returns an array of canvas IDs.
	 *
	 * @returns {Array<string>} An array containing the ID of the canvas model.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}

/**
 * Returns the size of an event based on its style
 * @param {EconomicEvent} event - The event to get the size of
 * @returns {number} - The size of the event
 
*/
export function getEventSize(event: EconomicEvent) {
	return eventsSizesDict[event.style];
}
