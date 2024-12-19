/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Bounds } from '../../model/bounds.model';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { ChartConfigComponentsEventsIcons, FullChartConfig, EventColors } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { Drawer } from '../../drawers/drawing-manager';
import { DateTimeFormatter } from '../../model/date-time.formatter';
import { ChartModel } from '../chart/chart.model';
import { EconomicEvent, EventsModel, EventWithId } from './events.model';
import { createCustomIcon, CustomIconImage, drawCustomSvgIcon, getIconHash } from './events-custom-icons';
import { Point } from '../../inputlisteners/canvas-input-listener.component';

const eventsSizesDict = {
	'rhombus-small': 4,
	rhombus: 6,
	'rhombus-large': 8,
};

const iconTypes: Array<keyof ChartConfigComponentsEventsIcons> = [
	'earnings',
	'dividends',
	'splits',
	'conference-calls',
];

export class EventsDrawer implements Drawer {
	// cache of created icons
	private customIcons: Record<string, CustomIconImage> = {};

	constructor(
		private canvasModel: CanvasModel,
		private chartModel: ChartModel,
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private model: EventsModel,
		private formatterProvider: () => DateTimeFormatter,
	) {
		const iconsConfig = this.config.components.events.icons;
		if (iconsConfig) {
			iconTypes.forEach(type => {
				const customIcon = createCustomIcon(type, iconsConfig[type]);
				if (customIcon) {
					this.customIcons[getIconHash(customIcon.type, 'normal')] = customIcon.normal;
					this.customIcons[getIconHash(customIcon.type, 'hover')] = customIcon.hover;
				}
			});
		}
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
				const x = this.chartModel.candleFromTimestamp(event.timestamp).xCenter(this.chartModel.scale);
				if (x > chartBounds.x && x < chartBounds.x + chartBounds.width) {
					const colors = this.config.colors.events[event.type];
					ctx.strokeStyle = colors.line ?? colors.normal ?? colors.color;

					// check custom icon in cache
					if (this.customIcons[getIconHash(event.type, 'hover')] !== undefined) {
						const point: Point = { x, y: bounds.y + bounds.height / 2 };
						const isHovered = this.model.hoveredEvent.getValue() === event;
						drawCustomSvgIcon(ctx, this.customIcons, point, event.type, isHovered);
					} else {
						this.drawDefaultEvent(ctx, x, bounds, event, colors);
					}
					// draw vertical line and label for the hovered event
					if (this.model.hoveredEvent.getValue() === event) {
						const line = this.config.components.events.line;
						const width = line && line[event.type] && line[event.type]?.width;
						const dash = line && line[event.type] && line[event.type]?.dash;

						ctx.lineWidth = width ?? 1;
						ctx.beginPath();
						ctx.setLineDash(dash ?? []);
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
	 * Draws a default event on a canvas context.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {number} x - The x coordinate of the event.
	 * @param {Bounds} bounds - The bounds of the event.
	 * @param {EventWithId} event - The event to draw.
	 * @param {EventColors} colors - The colors of the event.
	 * @returns {void}
	 */
	drawDefaultEvent(
		ctx: CanvasRenderingContext2D,
		x: number,
		bounds: Bounds,
		event: EventWithId,
		colors: EventColors,
	) {
		const y = bounds.y + bounds.height / 2;
		ctx.fillStyle = colors.normal ?? colors.color;
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
			ctx.fillStyle = colors.hover ?? colors.color;
			ctx.fill();
		} else {
			ctx.strokeStyle = colors.normal ?? colors.color;
			ctx.stroke();
		}
	}

	/**
	 * This function is responsible for drawing a label on the canvas at a given x coordinate. The label contains a formatted timestamp of a given event. The function takes two parameters: x, which is the x coordinate where the label will be drawn, and event, which is an object containing information about the event, including its timestamp and type.
	 * The function first gets the canvas context and the bounds of the x-axis. It then retrieves the font family, font height, and top padding from the configuration object. The y coordinate of the label is calculated based on the font height, top padding, and the y coordinate of the x-axis bounds. The font is set using the retrieved font family and font height.
	 * The timestamp of the event is formatted using a formatter provider function. The width of the label is calculated using the canvas context's measureText() method. The function then draws rectangle with xAxis background, to be on to hide the regular x-axis label that may overlap with the event label.
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
		ctx.fillStyle = this.config.colors.xAxis.backgroundColor;
		ctx.strokeStyle = this.config.colors.xAxis.backgroundColor;
		ctx.fillRect(x - width / 2, xAxisBounds.y + 1, width, xAxisBounds.height - 1);

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
