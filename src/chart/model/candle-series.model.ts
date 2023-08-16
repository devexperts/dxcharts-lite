/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable, Subject } from 'rxjs';
import { BarType, FullChartColors, getDefaultConfig } from '../chart.config';
import { defaultCandleTransformer } from '../components/chart/candle-transformer.functions';
import { calculateCandleWidth } from '../components/chart/candle-width-calculator.functions';
import { ChartInstrument } from '../components/chart/chart.component';
import { CandleWidthCalculator, VisualCandleCalculator } from '../components/chart/chart.model';
import { YExtentComponent } from '../components/pane/extent/y-extent-component';
import EventBus from '../events/event-bus';
import { lastOf } from '../utils/array.utils';
import { merge } from '../utils/merge.utils';
import { DeepPartial } from '../utils/object.utils';
import { PriceIncrementsUtils } from '../utils/price-increments.utils';
import { calculateCandlesHighLow, createCandleSeriesHighLowProvider } from './candle-series-high-low.provider';
import { BASIC_CANDLE_WIDTH, Candle, nameDirection } from './candle.model';
import { DataSeriesType } from './data-series.config';
import { DataSeriesModel } from './data-series.model';
import { HighLowWithIndex, ScaleModel, getDefaultHighLowWithIndex } from './scale.model';
import { Unit } from './scaling/viewport.model';
import VisualCandle from './visual-candle';

export type PriceMovement = 'up' | 'down' | 'none';

const DEFAULT_CANDLE_SERIES_CONFIG: CandleSeriesColors = getDefaultConfig().colors;

export class CandleSeriesModel extends DataSeriesModel<Candle, VisualCandle> {
	// high low in absolute price values
	zippedHighLow: HighLowWithIndex = getDefaultHighLowWithIndex();

	activeCandle?: Candle;

	currentPrice: number | undefined;
	previousPrice: number | undefined;
	lastPriceMovement: PriceMovement = 'none';

	lastVisualCandleChangedSubject: Subject<void> = new Subject<void>();

	get dataPoints(): Candle[] {
		return super.dataPoints;
	}

	set dataPoints(points: Candle[] | Candle[][]) {
		super.dataPoints = points;
		this.applyPriceMovement();
	}

	private _instrument: ChartInstrument;

	get instrument(): ChartInstrument {
		return this._instrument;
	}

	set instrument(instrument: ChartInstrument) {
		this._instrument = instrument;
		this.pricePrecisions = PriceIncrementsUtils.computePrecisions(instrument.priceIncrements ?? [0.01]);
	}

	// start/end candle index in viewport
	meanCandleWidth: Unit = BASIC_CANDLE_WIDTH;

	constructor(
		extentComponent: YExtentComponent,
		id: number,
		private eventBus: EventBus,
		scaleModel: ScaleModel,
		instrument: ChartInstrument,
		private readonly candlesTransformersByChartType: Partial<Record<DataSeriesType, VisualCandleCalculator>>,
		private readonly candleWidthByChartType: Partial<Record<DataSeriesType, CandleWidthCalculator>>,
		public colors: CandleSeriesColors = DEFAULT_CANDLE_SERIES_CONFIG,
	) {
		super(extentComponent, id);
		this._instrument = instrument;
		this.instrument = instrument;
		this.highLowProvider = createCandleSeriesHighLowProvider(this);
		this.scaleModel = scaleModel;
		this.name = instrument.symbol;
	}

	/**
	 * Recalculates data viewport indexes based on xStart and xEnd parameters or values from scaleModel.
	 * Calls superclass method for calculation, recalculates zipped high/low data points, and fires draw event.
	 *
	 * @param {number} [xStart=this.scaleModel.xStart] - Start index of visible data range.
	 * @param {number} [xEnd=this.scaleModel.xEnd] - End index of visible data range.
	 * @returns {void}
	 */
	recalculateDataViewportIndexes(xStart = this.scaleModel.xStart, xEnd = this.scaleModel.xEnd) {
		super.recalculateDataViewportIndexes(xStart, xEnd);
		this.recalculateZippedHighLow();
		this.eventBus.fireDraw();
	}

	/**
	 * Calculates the price movement of the last candle by comparing the open and close prices.
	 * Sets the lastPriceMovement property of the instance with the name of the direction of the price movement.
	 *
	 * @returns {void}
	 */
	private applyPriceMovement() {
		const lastCandle = lastOf(this.dataPoints);
		if (lastCandle) {
			this.lastPriceMovement = nameDirection(lastCandle.open, lastCandle.close);
		}
	}

	/**
	 * Should be called 1 time when candles are set / updated to chart.
	 */
	recalculateVisualPoints() {
		super.recalculateVisualPoints();
		this.recalculateMeanCandleWidth(this.visualPoints);
	}

	/**
	 * Used for optimization when we have to update only the last candle
	 * @doc-tags tricky
	 */
	// recalculateOnlyLastVisualCandle() {
	// 	const prev = this.visualPointsFlat[this.visualPointsFlat.length - 2];
	// 	const last = this.visualPointsFlat[this.visualPointsFlat.length - 1];
	// 	if (last && prev) {
	// 		const startX = this.visualPointsFlat[prev.idx ?? 0].startUnit;
	// 		const updatedCandle = lastOf(this.toVisualCandles([prev, last], startX));
	// 		if (updatedCandle) {
	// 			this.visualCandleSource[this.visualCandleSource.length - 1] = updatedCandle;
	// 			this.lastVisualCandleChangedSubject.next();
	// 			this.eventBus.fire(EVENT_DRAW_LAST_CANDLE);
	// 		}
	// 	}
	// }

	/**
	 * Recalculates and returns the zipped high-low values for the visible data range.
	 * Uses the visualPoints, dataIdxStart, and dataIdxEnd properties of the instance to calculate high-low values.
	 *
	 * @returns {HighLowWithIndex} - An object containing the high-low values along with their corresponding indexes.
	 */
	recalculateZippedHighLow(): HighLowWithIndex {
		return (this.zippedHighLow = calculateCandlesHighLow(
			this.visualPoints.slice(this.dataIdxStart, this.dataIdxEnd),
		));
	}

	/**
	 * Updates the current price and the last price movement.
	 * Compares the current price with the previous price, and sets the lastPriceMovement property accordingly.
	 *
	 * @param {number} currentPrice - The current price of the asset.
	 * @returns {void}
	 */
	public updateCurrentPrice(currentPrice: number) {
		this.previousPrice = this.currentPrice || currentPrice;
		this.currentPrice = currentPrice;
		if (this.currentPrice !== this.previousPrice) {
			this.lastPriceMovement = this.currentPrice > this.previousPrice ? 'up' : 'down';
		}
	}

	/**
	 * Updates the colors used to render the candlestick series and recalculates the visual points.
	 * Merges the newConfig object with the existing colors object of the instance.
	 * Calls the recalculateVisualPoints method of the instance to update the visual points using the new color configuration.
	 *
	 * @param {PartialCandleSeriesColors} newConfig - The new color configuration to be merged with the existing colors object.
	 * @returns {void}
	 */
	public updateCandleSeriesColors(newConfig: PartialCandleSeriesColors): void {
		this.colors = merge(newConfig, this.colors);
		this.recalculateVisualPoints();
	}

	/**
	 * Returns an observable that emits an event when the last visual candle changes.
	 * Returns the observable associated with the lastVisualCandleChangedSubject of the instance.
	 *
	 * @returns {Observable<void>} - An observable that emits an event when the last visual candle changes.
	 */
	public observeLastVisualCandleChanged(): Observable<void> {
		return this.lastVisualCandleChangedSubject.asObservable();
	}

	doDeactivate(): void {
		super.doDeactivate();
	}

	/**
	 * Transforms candles list into visual candles.
	 * NOTE: should be used only on FULL candles array, no single transformations, since candle coordinates depend on each other.
	 * OR provide startX :)
	 * @param candles
	 * @param startX
	 */
	public toVisualPoints(candles: Array<Candle>, startX = 0): Array<VisualCandle> {
		if (candles.length === 0) {
			return [];
		}
		const type = this.config.type;
		const visualCandles: VisualCandle[] = [];
		let accumulatedWidth = startX;
		const calculator = this.candleWidthByChartType[type] ?? calculateCandleWidth;
		for (let i = 0; i < candles.length; i++) {
			const candle = candles[i];
			const prevCandle: Candle | undefined = candles[i - 1];
			const width = calculator(candle);
			// x - middle of candle
			const x = accumulatedWidth + width / 2;
			const transformer = this.candlesTransformersByChartType[type] ?? defaultCandleTransformer;
			visualCandles.push(transformer(candle, { x, width, prevCandle, activeCandle: this.activeCandle }));
			accumulatedWidth += width;
		}
		return visualCandles;
	}

	/**
	 * Recalculates the mean candle width using the given array of visual candles.
	 * Calculates the sum of widths of all visual candles and divides it by the total number of candles to get the mean candle width.
	 * Sets the meanCandleWidth property of the instance with the calculated value.
	 *
	 * @param {VisualCandle[]} visualCandles - An array of visual candles to be used for mean candle width calculation.
	 * @returns {void}
	 */
	public recalculateMeanCandleWidth(visualCandles: VisualCandle[]) {
		if (visualCandles.length !== 0) {
			this.meanCandleWidth = visualCandles.reduce((acc, cur) => acc + cur.width, 0) / visualCandles.length;
		} else {
			this.meanCandleWidth = BASIC_CANDLE_WIDTH;
		}
	}

	/**
	 * Sets the active candle for the chart and recalculates the visual points.
	 * Sets the activeCandle property of the instance with the provided candle parameter.
	 * Calls the recalculateVisualPoints method of the instance to recalculate the visual points using the new active candle.
	 *
	 * @param {Candle} candle - The candle to be set as active candle.
	 * @returns {void}
	 */
	public setActiveCandle(candle: Candle) {
		this.activeCandle = candle;
		this.recalculateVisualPoints();
	}

	/**
	 * Clears all the data and visual elements from the chart.
	 * Sets the dataPoints property of the instance to an empty array.
	 * Calls the clearVisualCandles and clearPrices methods of the instance to clear the visual elements from the chart.
	 *
	 * @returns {void}
	 */
	public clearData() {
		this.dataPoints = [];
		this.clearVisualCandles();
		this.clearPrices();
	}

	/**
	 * Clears the price-related properties of the instance.
	 * Sets the previousPrice, currentPrice and lastPriceMovement properties of the instance to undefined, undefined, and 'none' respectively.
	 *
	 * @returns {void}
	 */
	public clearPrices() {
		this.previousPrice = undefined;
		this.currentPrice = undefined;
		this.lastPriceMovement = 'none';
	}

	/**
	 * Clears the visualPoints property of the instance.
	 * Sets the visualPoints property of the instance to an empty array.
	 *
	 * @returns {void}
	 */
	public clearVisualCandles() {
		this.visualPoints = [];
	}
}

/**
 * Checks if the provided chart type is linked.
 * @param {BarType} chartType - The type of chart to check.
 * @returns {boolean} - Returns true if the chart type is linked, false otherwise.
 */
export function isLinked(chartType: BarType) {
	switch (chartType) {
		case 'line':
		case 'area':
			return true;
		default:
			return false;
	}
}

export type CandleSeriesColors = FullChartColors;

export type PartialCandleSeriesColors = DeepPartial<CandleSeriesColors>;
