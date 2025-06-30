/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject, merge } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { CHART_UUID, CanvasBoundsContainer, CanvasElement } from '../canvas/canvas-bounds-container';
import { FullChartConfig } from '../chart.config';
import { ChartModel } from '../components/chart/chart.model';
import { PaneManager } from '../components/pane/pane-manager.component';
import { CanvasInputListenerComponent } from '../inputlisteners/canvas-input-listener.component';
import { CandleHover, CandleHoverProducerPart } from '../model/candle-hover';
import { ChartBaseElement } from '../model/chart-base-element';
import { CompareSeriesHover, CompareSeriesHoverProducerPart } from '../model/compare-series-hover';
import { DateTimeFormatter, recalculateXFormatter } from '../model/date-time.formatter';
import { ScaleModel } from '../model/scale.model';
import VisualCandle from '../model/visual-candle';
import { isMobile } from '../utils/device/browser.utils';
import { CrossEvent, CrossEventProducerComponent } from './cross-event-producer.component';
import { TimeZoneModel } from '../model/time-zone.model';
import { checkChartIsMoving, MainCanvasTouchHandler } from './main-canvas-touch.handler';

export interface BaseHover {
	readonly x: number;
	readonly y: number;
	readonly timestamp: number;
	readonly timeFormatted: string;
	readonly paneId: string;
}

export interface HoverParts {
	readonly candleHover: CandleHover | undefined;
	readonly compareSeriesHover: CompareSeriesHover[] | undefined;
	[key: string]: unknown;
}

export interface Hover extends BaseHover, HoverParts {}
export interface HoverProducerPart<T = unknown> {
	getData(hover: BaseHover): T | undefined;
}

export interface HoverProducerParts {
	candleHover: CandleHoverProducerPart;
	compareSeriesHover: CompareSeriesHoverProducerPart;
	[key: string]: HoverProducerPart;
}

type HoverProducerPartsEntries = [
	['candleHover', CandleHoverProducerPart],
	['compareSeriesHover', CompareSeriesHoverProducerPart],
	...[string, HoverProducerPart][],
];

/**
 * Produces the Hover event.
 * Hover is used for displaying values in legend and NOT related to displaying cross tool.
 */
export class HoverProducerComponent extends ChartBaseElement {
	public hoverSubject: BehaviorSubject<Hover | null> = new BehaviorSubject<Hover | null>(null);
	get hover(): Hover | null {
		return this.hoverSubject.getValue();
	}
	public longTouchActivatedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
	private hoverProducerParts: HoverProducerParts;

	xFormatter: DateTimeFormatter = () => '';
	constructor(
		private crossEventProducer: CrossEventProducerComponent,
		private scale: ScaleModel,
		private config: FullChartConfig,
		private chartModel: ChartModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private paneManager: PaneManager,
		private timeZoneModel: TimeZoneModel,
		private mainCanvasTouchHandler: MainCanvasTouchHandler,
		private formatterFactory: (format: string) => (timestamp: number) => string,
	) {
		super();
		const candleHoverProducerPart = new CandleHoverProducerPart(this.chartModel);
		const compareSeriesHoverProducerPart = new CompareSeriesHoverProducerPart(this.chartModel);
		this.hoverProducerParts = {
			candleHover: candleHoverProducerPart,
			compareSeriesHover: compareSeriesHoverProducerPart,
		};
	}

	/**
	 * This method is responsible for activating the chart hover functionality. It subscribes to several observables to
	 * update the hover when the chart is updated or when the user interacts with it. It also handles special behavior
	 * for mobile devices, such as disabling panning and showing the cross tool on long touch.
	 *
	 * @protected
	 * @memberof ChartHover
	 * @returns {void}
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			// required for initial legend initialization, do not show cross tool
			this.chartModel.candlesSetSubject
				.pipe(
					// check the scale is valid before doing candle-based hover event
					switchMap(() => this.scale.initialViewportValidSubject.pipe(filter(Boolean))),
				)
				.subscribe(() => {
					const lastCandle = this.chartModel.getLastVisualCandle();
					lastCandle && this.createAndFireHoverFromCandle(lastCandle);
				}),
		);
		this.addRxSubscription(
			this.chartModel.candlesUpdatedSubject.subscribe(() => {
				// update hover if its timestamp is equal or greater than last candle's one
				const lastCandle = this.chartModel.getLastVisualCandle();
				if (this.hover !== null && lastCandle !== undefined) {
					if (lastCandle.candle.timestamp <= this.hover.timestamp) {
						this.updateHover(lastCandle);
					}
				}
			}),
		);
		this.addRxSubscription(
			this.crossEventProducer.crossSubject.subscribe((cross: CrossEvent | null) => {
				if (cross === null) {
					this.hoverSubject.next(null);
				} else {
					this.createAndFireHover(cross);
				}
			}),
		);
		this.addRxSubscription(this.scale.xChanged.subscribe(() => this.fireLastCross()));
		this.addRxSubscription(
			merge(this.chartModel.candlesSetSubject, this.timeZoneModel.observeTimeZoneChanged()).subscribe(() =>
				this.recalculateCrossToolXFormatter(),
			),
		);
		//#region crosstool touch events, special handling for mobile
		this.addRxSubscription(
			this.canvasInputListener.observeTouchStart().subscribe(event => {
				this.crossEventProducer.crossToolTouchInfo.isCommonTap = true;
				const { clientX, clientY } = event.touches[0];

				// if common tap - fire hover
				if (!this.longTouchActivatedSubject.getValue()) {
					const paneId = this.paneManager.getPaneIfHit({ x: clientX, y: clientY })?.uuid || '';
					this.createAndFireHover([clientX, clientY, paneId]);
				} else {
					// update crosstool placement coordinates
					this.crossEventProducer.crossToolTouchInfo.temp = {
						x: clientX - this.canvasBoundsContainer.canvasOnPageLocation.x,
						y: clientY - this.canvasBoundsContainer.canvasOnPageLocation.y,
					};
				}
			}),
		);
		// on long touch - disable panning and show cross tool
		const hitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES);
		this.addRxSubscription(
			this.canvasInputListener.observeLongTouchStart(hitTest).subscribe(event => {
				this.crossEventProducer.crossToolHover = null;
				this.crossEventProducer.crossToolTouchInfo.isCommonTap = false;
				// don't lock chart and show crosshair if chart is being moved, crosstool is not enabled or we do pinch event
				const longTouchCrosshairPredicate =
					this.mainCanvasTouchHandler.canvasTouchInfo.isMoving ||
					this.chartModel.config.components.crossTool.type === 'none' ||
					event.touches.length > 1;

				if (longTouchCrosshairPredicate) {
					return;
				}

				this.longTouchActivatedSubject.next(true);
				this.crossEventProducer.crossToolTouchInfo.isSet = false;

				const x = event.touches[0].clientX - this.canvasBoundsContainer.canvasOnPageLocation.x;
				const y = event.touches[0].clientY - this.canvasBoundsContainer.canvasOnPageLocation.y;

				this.crossEventProducer.crossToolTouchInfo.fixed = {
					x,
					y,
				};

				const paneId = this.paneManager.getPaneIfHit({ x, y })?.uuid || '';
				this.createAndFireHover([x, y, paneId]);
				this.crossEventProducer.crossSubject.next([x, y, paneId]);
				this.paneManager.chartPanComponent.setChartPanningOptions(false, false);
			}),
		);
		this.addRxSubscription(
			this.canvasInputListener.observeTouchEndDocument().subscribe(event => {
				const { clientX, clientY } = event.changedTouches[0];
				const { fixed, temp } = this.crossEventProducer.crossToolTouchInfo;

				const x = clientX - this.canvasBoundsContainer.canvasOnPageLocation.x;
				const y = clientY - this.canvasBoundsContainer.canvasOnPageLocation.y;

				// common tap without moving, hide crosstool
				if (
					this.crossEventProducer.crossToolTouchInfo.isCommonTap &&
					!checkChartIsMoving(x, temp.x, y, temp.y)
				) {
					this.paneManager.chartPanComponent.setChartPanningOptions(true, true);
					this.longTouchActivatedSubject.next(false);
					this.crossEventProducer.fireCrossClose();
					this.crossEventProducer.crossToolHover = null;
					this.crossEventProducer.crossToolTouchInfo.isSet = false;
					return;
				}

				if (!this.crossEventProducer.crossToolTouchInfo.isSet) {
					this.crossEventProducer.crossToolTouchInfo.isSet = true;
					// previous fixed goes to temporary to prevent crosstool jumps outside the candle on candle update tick
					this.crossEventProducer.crossToolTouchInfo.temp = {
						x: this.crossEventProducer.crossToolTouchInfo.fixed.x,
						y: this.crossEventProducer.crossToolTouchInfo.fixed.y,
					};
					this.crossEventProducer.crossToolTouchInfo.fixed = {
						x,
						y,
					};
					this.crossEventProducer.crossToolTouchInfo.isSet = true;
				} else {
					const pane = this.crossEventProducer.crossToolHover?.paneId ?? 'CHART';
					const paneBounds = this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(pane));

					const paneYStart = paneBounds.y + 5;
					const paneYEnd = paneBounds.y + paneBounds.height - 5;

					const xDiff = x - temp.x;
					const yDiff = y - temp.y;

					const newX = fixed.x < 0 ? 0 : fixed.x > paneBounds.width ? paneBounds.width : (fixed.x += xDiff);
					const newY = fixed.y < paneYStart ? paneYStart : fixed.y > paneYEnd ? paneYEnd : (fixed.y += yDiff);
					this.crossEventProducer.crossToolTouchInfo.fixed = { x: newX, y: newY };
				}
			}),
		);
		//#endregion
	}

	/**
	 * Recalculates the cross tool X formatter.
	 * @function
	 * @private
	 * @returns {void}
	 */
	private recalculateCrossToolXFormatter() {
		const xAxisLabelFormat = this.config.components.crossTool.xAxisLabelFormat;
		this.xFormatter = recalculateXFormatter(xAxisLabelFormat, this.chartModel.getPeriod(), this.formatterFactory);
	}

	/**
	 * Creates a hover object from a VisualCandle object.
	 * @param {VisualCandle} candle - The VisualCandle object to create the hover from.
	 * @returns {Hover | undefined} - The created hover object or undefined if the input is invalid.
	 */
	private createHoverFromCandle(candle: VisualCandle): Hover | undefined {
		const x = candle.xCenter(this.scale);
		const y = this.scale.toY(candle.close);
		return this.createHover(x, y, CHART_UUID);
	}

	/**
	 * Creates a hover object based on the provided x and y coordinates.
	 * @param {number} x - The x coordinate of the hover.
	 * @param {number} y - The y coordinate of the hover.
	 * @param {string} uuid
	 * @returns {Hover | undefined} - The hover object or undefined if there are no candles in the chart model.
	 * @todo Check if uuid is still useful here.
	 */
	public createHover(x: number, y: number, uuid: string): Hover | undefined {
		if (this.chartModel.getCandles().length === 0) {
			return;
		}

		const candle = this.chartModel.candleFromX(x, true);
		const timestamp = candle.timestamp;

		const hover: BaseHover = {
			x,
			y,
			timestamp,
			timeFormatted: this.xFormatter(timestamp),
			paneId: uuid,
		};
		// eslint-disable-next-line no-restricted-syntax
		const combinedHoverParts = (Object.entries(this.hoverProducerParts) as HoverProducerPartsEntries).reduce(
			(res, part) => ({ ...res, [part[0]]: part[1].getData(hover) }),
			// eslint-disable-next-line no-restricted-syntax
			{} as HoverParts,
		);
		return {
			...hover,
			...combinedHoverParts,
		};
	}

	/**
	 * Creates a hover from a VisualCandle object and fires it.
	 * @param {VisualCandle} candle - The VisualCandle object to create the hover from.
	 */
	createAndFireHoverFromCandle(candle: VisualCandle) {
		const hover = this.createHoverFromCandle(candle);
		this.fireHover(hover);
	}

	/**
	 * Update current hover using a VisualCandle and fires it.
	 * @param {VisualCandle} candle - The VisualCandle object to create the hover from.
	 */
	updateHover(candle: VisualCandle) {
		const updatedHover = this.createHoverFromCandle(candle);
		if (this.hover && updatedHover) {
			const hover: Hover = {
				...updatedHover,
				x: this.hover.x,
				y: this.hover.y,
			};
			this.fireHover(hover);
		}
	}

	/**
	 * Creates a hover element at the specified coordinates and fires it with the option to show the cross tool
	 * @param {CrossEvent} [x,y] - The coordinates where the hover element will be created
	 * @param {boolean} [showCrossTool=true] - Whether to show the cross tool or not
	 * @returns {void}
	 */
	createAndFireHover([x, y, uuid]: CrossEvent) {
		const hover = this.createHover(x, y, uuid);
		this.fireHover(hover);
	}

	/**
	 * Private method that handles the hover event. If a hover event is provided, it sets the last hover to the provided hover.
	 * If the device is mobile and the cross tool type is not 'none', it sets the active candle to the hovered candle only when a long tap is detected.
	 * The showCrossToolOverride is set to true only when a long tap is detected on mobile devices, otherwise it is set to the value of showCrossTool parameter.
	 * Finally, it fires the EVENT_HOVER event with the provided hover and showCrossToolOverride.
	 * If no hover event is provided, it fires the EVENT_CLOSE_HOVER event.
	 *
	 * @param {Hover} [hover] - The hover event to handle.
	 * @returns {void}
	 */
	private fireHover(hover?: Hover) {
		if (hover) {
			// special handling for mobile
			// set active candle + show cross tool only when crosstool is active
			if (isMobile() && this.config.components.crossTool.type !== 'none') {
				const crossToolHover = this.crossEventProducer.crossToolHover;
				const candle = crossToolHover
					? crossToolHover.candleHover?.visualCandle.candle
					: hover.candleHover?.visualCandle.candle;
				candle && this.chartModel.mainCandleSeries.setActiveCandle(candle);
			}
			this.hoverSubject.next(hover);
		} else {
			this.crossEventProducer.fireCrossClose();
		}
	}

	/**
	 * Fires the last hover update if there is a last cross.
	 */
	public fireLastCross() {
		// fire last hover update
		const lastCross = this.crossEventProducer.crossSubject.getValue();
		if (lastCross) {
			this.createAndFireHover(lastCross);
		}
	}

	/**
	 * Registers a hover producer part with the given id.
	 *
	 * @param {string} id - The id of the hover producer part.
	 * @param {HoverProducerPart} hoverProducerPart - The hover producer part to register.
	 * @returns {void}
	 */
	registerHoverProducerPart(id: string, hoverProducerPart: HoverProducerPart): void {
		this.hoverProducerParts = {
			...this.hoverProducerParts,
			[id]: hoverProducerPart,
		};
	}

	/**
	 * Removes a hover producer part from the hoverProducerParts object.
	 * @param {string} id - The id of the hover producer part to be removed.
	 * @returns {void}
	 */
	unregisterHoverProducerPart(id: string): void {
		delete this.hoverProducerParts[id];
	}
}
