/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject, merge } from 'rxjs';
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

export interface BaseHover {
	readonly x: number;
	readonly y: number;
	readonly timestamp: number;
	readonly timeFormatted: string;
	readonly paneId: string;
}

export interface HoverParts {
	readonly candleHover: CandleHover | undefined;
	readonly compareSeriesHover: CompareSeriesHover[];
	[key: string]: unknown;
}

export interface Hover extends BaseHover, HoverParts {}
export interface HoverProducerPart<T = unknown> {
	getData(hover: BaseHover): T;
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
	private longTouchActivated: boolean = false;
	private hoverProducerParts: HoverProducerParts;
	xFormatter: DateTimeFormatter = () => '';
	constructor(
		private crossEventProducer: CrossEventProducerComponent,
		private scaleModel: ScaleModel,
		private config: FullChartConfig,
		private chartModel: ChartModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private paneManager: PaneManager,
		private timeZoneModel: TimeZoneModel,
		private formatterFactory: (format: string) => (timestamp: number | Date) => string,
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
			this.chartModel.candlesSetSubject.subscribe(() => {
				// required for initial legend initialization, do not show cross tool
				const lastCandle = this.chartModel.getLastVisualCandle();
				lastCandle && this.createAndFireHoverFromCandle(lastCandle);
			}),
		);
		this.addRxSubscription(
			this.chartModel.candlesUpdatedSubject.subscribe(() => {
				// update hover if it was the last candle
				const lastCandle = this.chartModel.getLastVisualCandle();
				if (this.hover !== null && lastCandle !== undefined) {
					if (lastCandle.candle.timestamp === this.hover.timestamp) {
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
		this.addRxSubscription(this.scaleModel.xChanged.subscribe(() => this.fireLastCross()));
		this.addRxSubscription(
			this.canvasInputListener.observeTouchStart().subscribe(event => {
				const x = event.touches[0].clientX;
				const y = event.touches[0].clientY - this.canvasBoundsContainer.canvasOnPageLocation.y;
				const candle = this.chartModel.candleFromX(x, true);
				if (candle) {
					this.createAndFireHover([x, y, '']);
				}
			}),
		);

		// special handling for mobile
		// on long touch - disable panning and show cross tool
		const hitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES);
		this.addRxSubscription(
			this.canvasInputListener.observeLongTouch(hitTest).subscribe(event => {
				this.paneManager.chartPanComponent.deactivatePanHandlers();
				this.longTouchActivated = true;
				const x = event.touches[0].clientX;
				const y = event.touches[0].clientY - this.canvasBoundsContainer.canvasOnPageLocation.y;
				this.createAndFireHover([x, y, '']);
			}),
		);
		this.addRxSubscription(
			this.canvasInputListener.observeTouchEndDocument().subscribe(() => {
				this.paneManager.chartPanComponent.activateChartPanHandlers();
				if (this.longTouchActivated) {
					this.longTouchActivated = false;
					this.crossEventProducer.fireCrossClose();
				}
			}),
		);
		this.addRxSubscription(
			merge(this.chartModel.candlesSetSubject, this.timeZoneModel.observeTimeZoneChanged()).subscribe(() =>
				this.recalculateCrossToolXFormatter(),
			),
		);
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
		const x = candle.xCenter(this.chartModel.scaleModel);
		const y = this.chartModel.scaleModel.toY(candle.close);
		return this.createHover(x, y, CHART_UUID);
	}

	/**
	 * Creates a hover object based on the provided x and y coordinates.
	 * @param {number} x - The x coordinate of the hover.
	 * @param {number} y - The y coordinate of the hover.
	 * @returns {Hover | undefined} - The hover object or undefined if there are no candles in the chart model.
	 * @todo Check if uuid is still useful here.
	 */
	private createHover(x: number, y: number, uuid: string): Hover | undefined {
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
	 * @param {boolean} [showCrossTool=true] - A boolean value indicating whether to show the cross tool or not.
	 * @returns {void}
	 */
	private fireHover(hover?: Hover) {
		if (hover) {
			// special handling for mobile
			// set active candle + show cross tool only when long tap
			if (isMobile() && this.config.components.crossTool.type !== 'none') {
				const candle = hover.candleHover?.visualCandle.candle;
				candle && this.chartModel.mainCandleSeries.setActiveCandle(candle);
			}
			// const showCrossToolOverride = isMobile() ? this.longTouchActivated : showCrossTool;
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
