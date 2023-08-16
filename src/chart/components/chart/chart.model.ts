/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable, Subject, merge } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';
import { ChartBaseElement } from '../../model/chart-base-element';
import {
	CHART_UUID,
	CanvasBoundsContainer,
	CanvasElement,
	areBoundsChanged,
} from '../../canvas/canvas-bounds-container';
import { BarType, ChartConfigComponentsOffsets, FullChartConfig, getDefaultConfig } from '../../chart.config';
import { CanvasModel, MIN_SUPPORTED_CANVAS_SIZE } from '../../model/canvas.model';
import EventBus from '../../events/event-bus';
import { ChartResizeHandler, PickedDOMRect } from '../../inputhandlers/chart-resize.handler';
import { CandleSeriesColors, CandleSeriesModel, PartialCandleSeriesColors } from '../../model/candle-series.model';
import { Candle, copyCandle } from '../../model/candle.model';
import { DataSeriesType } from '../../model/data-series.config';
import { MainCandleSeriesModel } from '../../model/main-candle-series.model';
import { ScaleModel } from '../../model/scale.model';
import { candleEdgesConstrait } from '../../model/scaling/constrait.functions';
import { Index, Pixel, Price, Timestamp, Unit, pixelsToUnits } from '../../model/scaling/viewport.model';
import VisualCandle from '../../model/visual-candle';
import { merge as mergeObj } from '../../utils/merge.utils';
import { PaneManager } from '../pane/pane-manager.component';
import { PaneComponent } from '../pane/pane.component';
import { LabelGroup } from '../y_axis/price_labels/y-axis-labels.model';
import { createBasicScaleViewportTransformer, createTimeFrameViewportTransformer } from './basic-scale';
import { calculateCandleWidth } from './candle-width-calculator.functions';
import { deleteCandlesIndex, prepareCandle, reindexCandles } from './candle.functions';
import { ChartBaseModel } from './chart-base.model';
import { CandleSeries, ChartInstrument, PartialCandle } from './chart.component';
import { fakeCandle } from './fake-candles';
import { SecondaryChartColorsPool } from './secondary-chart-colors-pool';
import { binarySearch, lastOf } from '../../utils/array.utils';
import { searchCandleIndex } from '../../utils/candles.utils';
import { floor, round } from '../../utils/math.utils';

export type VisualCandleCalculator = (
	candle: Candle,
	options: { width: Unit; x: Unit; prevCandle?: Candle; activeCandle?: Candle },
) => VisualCandle;
export type LastCandleLabelHandler = (labels: LabelGroup, candleSeries: CandleSeriesModel) => void;
export type CandleWidthCalculator = (candle: Candle) => Unit;

export class ChartModel extends ChartBaseElement {
	private prevChartWidth = 0;
	private prevYWidth = 0;

	candleSeries: Array<CandleSeriesModel> = [];

	get mainCandleSeries(): CandleSeriesModel {
		return this.candleSeries[0];
	}

	get secondaryCandleSeries(): Array<CandleSeriesModel> {
		return this.candleSeries.filter(s => s !== this.mainCandleSeries);
	}

	public readonly nextCandleTimeStampSubject: Subject<void> = new Subject<void>();
	public readonly axisTypeSetSubject: Subject<PriceAxisType> = new Subject<PriceAxisType>();
	public readonly chartTypeChanged: Subject<BarType> = new Subject<BarType>();
	public readonly mainInstrumentChangedSubject: Subject<ChartInstrument> = new Subject<ChartInstrument>();
	public readonly scaleInversedSubject: Subject<void> = new Subject<void>();
	public readonly offsetsChanged = new Subject<void>();
	private candlesTransformersByChartType: Partial<Record<BarType, VisualCandleCalculator>> = {};
	lastCandleLabelsByChartType: Partial<Record<BarType, LastCandleLabelHandler>> = {};
	private candleWidthByChartType: Partial<Record<BarType, CandleWidthCalculator>> = {};
	secondaryChartColors: SecondaryChartColorsPool;
	// TODO try to remove this state
	lastTimeFrame: TimeFrameRange = [0, 0];
	basicScaleViewportTransformer;
	timeFrameViewportTransformer;
	private FAKE_CANDLES_DEFAULT = 100;
	public readonly pane: PaneComponent;
	constructor(
		public chartBaseModel: ChartBaseModel<'candle'>,
		private paneManager: PaneManager,
		public bus: EventBus,
		private canvasModel: CanvasModel,
		public config: FullChartConfig,
		public scaleModel: ScaleModel,
		public formatterFactory: (format: string) => (timestamp: number) => string,
		public mainCanvasParent: Element,
		private canvasBoundsContainer: CanvasBoundsContainer,
		public chartResizeHandler: ChartResizeHandler,
	) {
		super();
		this.chartTypeChanged.next(this.config.components.chart.type);
		this.secondaryChartColors = new SecondaryChartColorsPool(this.config);
		const candleSeries = new MainCandleSeriesModel(
			this.chartBaseModel,
			this.paneManager.paneComponents[CHART_UUID].mainYExtentComponent,
			this.paneManager.hitTestController.getNewDataSeriesHitTestId(),
			this.bus,
			this.scaleModel,
			new ChartInstrument(),
			this.candlesTransformersByChartType,
			this.candleWidthByChartType,
			{ ...this.config.colors },
		);
		candleSeries.config.type = this.config.components.chart.type;
		this.candleSeries.push(candleSeries);

		scaleModel.addXConstraint((_, state) =>
			candleEdgesConstrait(
				state,
				this.mainCandleSeries.visualPoints,
				this.config.components.chart.minCandlesOffset,
				scaleModel.getBounds(),
			),
		);
		this.basicScaleViewportTransformer = createBasicScaleViewportTransformer(scaleModel);
		this.timeFrameViewportTransformer = createTimeFrameViewportTransformer(scaleModel, this);
		this.pane = this.paneManager.paneComponents[CHART_UUID];
	}

	get candlesUpdatedSubject() {
		return this.chartBaseModel.dataUpdatedSubject;
	}

	get candlesSetSubject() {
		return this.chartBaseModel.dataSetSubject;
	}

	get candlesRemovedSubject() {
		return this.chartBaseModel.dataRemovedSubject;
	}

	get candlesPrependSubject() {
		return this.chartBaseModel.dataPrependSubject;
	}

	/**
	 * Method that activates the canvas bounds container and subscribes to its bounds changes and bar resizer changes.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			this.canvasBoundsContainer
				.observeBoundsChanged(CanvasElement.PANE_UUID(CHART_UUID))
				.pipe(distinctUntilChanged(areBoundsChanged))
				.subscribe(bounds => {
					this.handleChartResize(bounds);
				}),
		);
	}

	/**
	 * This method keeps the same candle width on chart canvas resize, so chart candles aren't squeezed when canvas becomes smaller
	 * If chart width was changed after Yaxis width changed, scale will be adjusted to right/left, and visually nothing will be changed
	 * @private
	 * @param nextCB - Next chart bounds
	 */
	private handleChartResize(nextCB: PickedDOMRect) {
		if (nextCB.width > MIN_SUPPORTED_CANVAS_SIZE.width && nextCB.height > MIN_SUPPORTED_CANVAS_SIZE.height) {
			const nextChartWidth = this.getEffectiveChartWidth();
			const nextYAxisWidth = this.getEffectiveYAxisWidth();

			if (this.prevChartWidth === 0) {
				this.scaleModel.isViewportValid() ? this.scaleModel.recalculateZoom() : this.doBasicScale();
				this.prevChartWidth = nextChartWidth;
				this.prevYWidth = nextYAxisWidth;
				return;
			}

			// YAxis width changed, so chart width will be changed too, but we need adjust scale to right/left
			if (nextYAxisWidth !== this.prevYWidth) {
				if (this.config.scale.keepZoomXOnYAxisChange) {
					const unitDiff = pixelsToUnits(nextYAxisWidth - this.prevYWidth, this.scaleModel.zoomX);
					this.scaleModel.setXScale(this.scaleModel.xStart, this.scaleModel.xEnd - unitDiff);
				} else {
					this.scaleModel.recalculateZoomX();
				}
				this.prevYWidth = nextYAxisWidth;
				this.prevChartWidth = nextChartWidth;
				return;
			}

			// YAxis has the same width, so keep the same candle width on chart resize
			const unitDiff = pixelsToUnits(nextChartWidth - this.prevChartWidth, this.scaleModel.zoomX);
			this.scaleModel.setXScale(this.scaleModel.xStart - unitDiff, this.scaleModel.xEnd);
			// height also could be changed - we need correct zoomY
			this.scaleModel.recalculateZoomY();
			this.prevYWidth = nextYAxisWidth;
			this.prevChartWidth = nextChartWidth;
		}
	}

	/**
	 * Sets the main candle series with the provided candles and instrument.
	 * @param {Array<Candle>} candles - The array of candles to set as the main candle series.
	 * @param {ChartInstrument} instrument - The instrument to set for the main candle series.
	 * @returns {void}
	 */
	setMainCandleSeries(candles: Array<Candle>, instrument: ChartInstrument) {
		this.mainCandleSeries.instrument = instrument;

		this.setAllSeries(
			{
				candles,
				instrument,
			},
			this.getSecondarySeries().map(series => {
				const originalCandles = series.dataPoints;
				// reset the idx of candles to calculate them again
				deleteCandlesIndex(originalCandles);
				return {
					candles: originalCandles,
					instrument: series.instrument,
				};
			}),
		);
	}

	/**
	 * Sets a secondary candle series based on the provided candles array and instrument.
	 * @param {Array<Candle>} candles - An array of candles to set as the secondary candle series.
	 * @param {ChartInstrument} instrument - The instrument to set as the secondary candle series. Defaults to the main candle series instrument.
	 * @param {boolean} recalculateAndUpdate - A boolean indicating whether to recalculate and update the candle series. Defaults to true.
	 * @returns {CandleSeriesModel | undefined} - The newly created secondary candle series model or undefined if it could not be created.
	 */
	setSecondaryCandleSeries(
		candles: Array<PartialCandle>,
		instrument: ChartInstrument = this.mainCandleSeries.instrument,
		recalculateAndUpdate = true,
	): CandleSeriesModel | undefined {
		const prepareCandleCandles = sortCandles(candles.map(prepareCandle));
		// set correct indexes based on main candles timestamp
		const reindexCandles = this.reindexCandlesBasedOnSeries(this.mainCandleSeries.dataPoints, prepareCandleCandles);
		// ensure there are no gaps in new candles
		const secondaryCandles = this.secondarySeriesAdjustments(this.mainCandleSeries.dataPoints, reindexCandles);
		// create a new secondary series model if it doesn't already exist
		const isSymbolExist = this.secondaryCandleSeries.some(
			candleSeries => candleSeries.instrument.symbol === instrument.symbol,
		);
		const candleSeriesModel = isSymbolExist
			? this.secondaryCandleSeries.find(candleSeries => candleSeries.instrument.symbol === instrument.symbol)
			: this.createSecondaryCandleSeriesModel(instrument);
		if (!candleSeriesModel) {
			return;
		}
		candleSeriesModel.dataPoints = secondaryCandles;
		if (recalculateAndUpdate) {
			// calculate X and Y bounds
			this.scaleModel.doAutoScale();
			// now the visual candles
			candleSeriesModel.recalculateVisualPoints();
			this.candlesSetSubject.next();
			this.bus.fireDraw([this.canvasModel.canvasId]);
		}
		return candleSeriesModel;
	}
	/**
	 * Shouldn't be called outside chart-core, use ChartComponent#setAllSeries instead
	 * @param mainSeries
	 * @param secondarySeries
	 */
	setAllSeries(mainSeries: CandleSeries, secondarySeries: CandleSeries[] = []): void {
		this.mainCandleSeries.instrument = mainSeries.instrument ?? this.mainCandleSeries.instrument;
		if (mainSeries.instrument) {
			this.mainInstrumentChangedSubject.next(mainSeries.instrument);
		}
		this.rememberCurrentTimeframe();
		const prepareCandleCandles = sortCandles(mainSeries.candles.map(prepareCandle));
		this.mainCandleSeries.clearData();
		reindexCandles(prepareCandleCandles);
		this.mainCandleSeries.dataPoints = prepareCandleCandles;
		// deactivate deleted series
		this.secondaryCandleSeries
			.filter(series => {
				return secondarySeries.filter(s => s.instrument?.symbol === series.instrument.symbol).length === 0;
			})
			.forEach(series => this.removeSecondaryCandleSeries(series));
		// re-create series
		secondarySeries.map(series => this.setSecondaryCandleSeries(series.candles, series.instrument, false));
		// do visual recalculations
		this.candleSeries.forEach(series => {
			series.recalculateDataViewportIndexes();
			series.recalculateVisualPoints();
		});
		this.chartBaseModel.recalculatePeriod();
		this.autoScaleOnCandles();
		this.scaleModel.doAutoScale();
		this.candlesSetSubject.next();
		this.bus.fireDraw([this.canvasModel.canvasId]);
	}

	/**
	 * This function checks if the autoScaleOnCandles state is true. If it is, it calls the doBasicScale() function and then calls the autoScale() function with a true parameter.
	 * @function
	 * @name autoScaleOnCandles
	 * @memberof ClassName
	 * @returns {void}
	 */
	autoScaleOnCandles() {
		if (this.scaleModel.state.autoScaleOnCandles) {
			this.doBasicScale();
			this.scaleModel.autoScale(true);
		}
	}

	/**
	 * Applies the basic scale viewport transformer to the visual points of the main candle series and fires a draw event.
	 */
	doBasicScale() {
		this.basicScaleViewportTransformer(this.mainCandleSeries.visualPoints);
		this.bus.fireDraw();
	}

	/**
	 * Changes the time frame scale to the previous one and redraws the chart.
	 * @param {boolean | null} zoomIn - If true, zooms in the chart, if false, zooms out the chart, if null, does not zoom.
	 * @returns {void}
	 */
	doPreviousTimeFrameScale(zoomIn: boolean | null = null) {
		this.timeFrameViewportTransformer(this.lastTimeFrame, zoomIn);
		if (this.scaleModel.state.autoScaleOnCandles) {
			this.scaleModel.doAutoScale(true);
		}
		this.bus.fireDraw();
	}

	/**
	 * Saves the current timeframe by getting the start and end timestamps of the visual candles in the main candle series.
	 * If there are no visual candles, the last timeframe is not updated.
	 */
	rememberCurrentTimeframe() {
		const visualCandles = this.mainCandleSeries.visualPoints;
		if (visualCandles.length !== 0) {
			this.lastTimeFrame = [
				this.candleFromX(this.scaleModel.toX(this.scaleModel.xStart), true).timestamp,
				this.candleFromX(this.scaleModel.toX(this.scaleModel.xEnd), true).timestamp,
			];
		}
	}

	/**
	 * Shouldn't be called outside chart-core, use ChartComponent#updateAllSeries instead
	 * @param mainSeries
	 * @param secondarySeries
	 */
	updateAllSeries(mainSeries: CandleSeries, secondarySeries: CandleSeries[] = []): void {
		mainSeries = { ...mainSeries };
		if (!mainSeries.instrument) {
			mainSeries.instrument = this.mainCandleSeries.instrument;
		}
		const allSeries = [mainSeries, ...secondarySeries];
		if (
			!this.candleSeries.every(s => allSeries.find(ss => ss.instrument?.symbol === s.instrument.symbol)) ||
			secondarySeries.length !== this.secondaryCandleSeries.length
		) {
			console.error('All series update failed. Instruments for series are different.');
			return;
		}

		const preparedCandles = sortCandles(mainSeries.candles.map(prepareCandle));
		const updateResult = updateCandles(this.mainCandleSeries.dataPoints, preparedCandles);
		const updatedCandles = updateResult.candles;
		reindexCandles(updatedCandles);
		this.mainCandleSeries.dataPoints = updatedCandles;

		// re-create series
		secondarySeries.map(series => {
			const preparedCandles = sortCandles(series.candles.map(prepareCandle));
			const updatedCandles = updateCandles(
				this.findSecondarySeriesBySymbol(series.instrument?.symbol ?? '')?.dataPoints ?? [],
				preparedCandles,
			).candles;
			return this.setSecondaryCandleSeries(updatedCandles, series.instrument, false);
		});

		// do visual recalculations
		this.candleSeries.forEach(series => {
			series.recalculateVisualPoints();
			series.recalculateDataViewportIndexes();
		});

		// caclulate offset width for prepanded candles
		const prependedCandlesWidth = this.chartBaseModel.mainVisualPoints
			.slice(0, updateResult.prepended)
			.reduce((acc, cur) => acc + cur.width, 0);
		this.scaleModel.moveXStart(this.scaleModel.xStart + prependedCandlesWidth);
		this.candlesPrependSubject.next({
			prependedCandlesWidth,
			preparedCandles,
		});

		this.chartBaseModel.recalculatePeriod();
		this.candlesUpdatedSubject.next();
		this.bus.fireDraw();
	}

	/**
	 * Removes all data points from the main candle series that are newer than the given timestamp.
	 * Can be useful for data replay.
	 * @param startTimestamp
	 */
	public removeDataFrom(startTimestamp: Timestamp) {
		Object.values(this.paneManager.paneComponents).forEach(pane => {
			pane.dataSeries.forEach(series => {
				const searchResult = binarySearch(series.dataPoints, startTimestamp, p => p.timestamp);
				const index = searchResult.exact ? searchResult.index : searchResult.index + 1;
				series.dataPoints = series.dataPoints.slice(0, index);
			});
		});
		this.candlesRemovedSubject.next();
		this.candlesUpdatedSubject.next();
		this.canvasModel.fireDraw();
	}

	/**
	 * Creates a secondary candle series model for a given instrument.
	 * @param {ChartInstrument} instrument - The instrument for which the secondary candle series model is created.
	 * @returns {CandleSeriesModel | undefined} - The created secondary candle series model or undefined if it cannot be created.
	 */
	public createSecondaryCandleSeriesModel(instrument: ChartInstrument): CandleSeriesModel | undefined {
		const candleSeriesConfig: CandleSeriesColors = {
			...this.config.colors,
			...this.secondaryChartColors.takeColorFromPool(instrument.symbol),
		};
		return this.createCandleSeriesModel(instrument, candleSeriesConfig);
	}

	/**
	 * Creates a new CandleSeriesModel object and adds it to the chart.
	 * @param {ChartInstrument} instrument - The instrument to be displayed in the chart.
	 * @param {CandleSeriesColors} [colors] - Optional colors for the candle series.
	 * @returns {CandleSeriesModel} - The newly created CandleSeriesModel object.
	 */
	private createCandleSeriesModel(instrument: ChartInstrument, colors?: CandleSeriesColors): CandleSeriesModel {
		const candleSeries = new CandleSeriesModel(
			this.paneManager.paneComponents[CHART_UUID].mainYExtentComponent,
			this.paneManager.hitTestController.getNewDataSeriesHitTestId(),
			this.bus,
			this.scaleModel,
			instrument,
			this.candlesTransformersByChartType,
			this.candleWidthByChartType,
			colors,
		);
		candleSeries.config.type = 'line';
		this.candleSeries.push(candleSeries);
		return candleSeries;
	}

	/**
	 * Removes a secondary candle series from the chart and returns its colors.
	 * @param {CandleSeriesModel} series - The candle series to be removed.
	 * @returns {CandleSeriesColors | undefined} - The colors of the removed series or undefined if the series was not found.
	 */
	public removeSecondaryCandleSeries(series: CandleSeriesModel): CandleSeriesColors | undefined {
		this.secondaryChartColors.addColorToPool(series.instrument.symbol);
		this.candleSeries = this.candleSeries.filter(s => s !== series);
		series.deactivate();
		this.paneManager.paneComponents[CHART_UUID].removeDataSeries(series);
		this.scaleModel.doAutoScale();
		return series.colors;
	}

	/**
	 * Adjusts secondary series to present them nicely with main series:
	 * - fill gaps in secondarySeries with fake candles OHLC of same price (=close price)
	 * - do not add any candles which are not in main series
	 * @param mainSeries - main series
	 * @param secondarySeries - secondarySeries to adjust
	 */
	private secondarySeriesAdjustments(mainSeries: Array<Candle>, secondarySeries: Array<Candle>): Array<Candle> {
		const result: Array<Candle> = [];
		mainSeries.forEach(mainCandle => {
			const idx = mainCandle.idx ?? 0;
			const compareCandle = secondarySeries[idx];
			if (!compareCandle) {
				// take first candle to left or right
				// check left direction first
				let candle = findFirstNotEmptyCandle(secondarySeries, idx, -1);
				if (!candle) {
					candle = findFirstNotEmptyCandle(secondarySeries, idx, 1);
				}
				if (candle) {
					// copy the candle and simplify it's OHLC
					const fakeCandle = copyCandle(candle, idx, true);
					result.push(fakeCandle);
				}
			} else {
				result.push(compareCandle);
			}
		});
		return result;
	}

	/**
	 * Updates the configuration of the secondary candle series with the provided colors and instrument symbol.
	 * @param {PartialCandleSeriesColors} config - The partial configuration object containing the colors to update.
	 * @param {string} instrumentSymbol - The symbol of the instrument to update the colors for.
	 * @param {DataSeriesType} chartType - The type of chart to update the series to.
	 * @returns {void}
	 */
	public updateSecondaryCandleSeriesConfig(
		config: PartialCandleSeriesColors,
		instrumentSymbol: string,
		chartType: DataSeriesType,
	) {
		const candleSeriesConfig: CandleSeriesColors = mergeObj(config, getDefaultConfig().colors);
		this.secondaryChartColors.updateColorConfig(instrumentSymbol, candleSeriesConfig);
		const seriesToUpdate = this.findSecondarySeriesBySymbol(instrumentSymbol);
		if (seriesToUpdate) {
			seriesToUpdate.config.type = chartType;
			seriesToUpdate.updateCandleSeriesColors(candleSeriesConfig);
			this.bus.fireDraw([this.canvasModel.canvasId]);
		}
		this.bus.fireDraw([this.canvasModel.canvasId]);
	}

	/**
	 * Sets the autoScale property of the scaleModel object.
	 * @param {boolean} auto - The value to be set for the autoScale property.
	 * @returns {void}
	 */
	public setAutoScale(auto: boolean): void {
		this.scaleModel.autoScale(auto);
	}

	/**
	 * Returns the effective width of the Y axis.
	 *
	 * @function
	 * @name getEffectiveYAxisWidth
	 * @returns {number} The effective width of the Y axis.
	 */
	getEffectiveYAxisWidth() {
		const yAxis = this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID_Y_AXIS(CHART_UUID));
		return yAxis.width;
	}

	/**
	 * Returns the effective width of the chart.
	 *
	 * @function
	 * @returns {number} The effective width of the chart.
	 */
	getEffectiveChartWidth() {
		const chart = this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(CHART_UUID));
		return chart.width;
	}

	/**
	 * Returns the effective height of the chart.
	 *
	 * @returns {number} The effective height of the chart.
	 */
	getEffectiveChartHeight() {
		const chart = this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(CHART_UUID));
		return chart.height;
	}

	/**
	 * Updates the offsets of the chart components and redraws the chart.
	 * @param {Partial<ChartConfigComponentsOffsets>} offsets - The new offsets to be applied to the chart components.
	 * @returns {void}
	 */
	setOffsets(offsets: Partial<ChartConfigComponentsOffsets>) {
		this.scaleModel.updateOffsets(offsets);
		const lastIdx = this.getCandlesCountWithRightOffset();
		const visualCandles = this.mainCandleSeries.visualPoints;
		if (this.hasCandles() && lastIdx >= visualCandles.length) {
			this.scaleModel.setXScale(this.scaleModel.xStart, this.candleFromIdx(lastIdx).startUnit);
		}
		this.offsetsChanged.next();
		this.bus.fireDraw();
	}

	/**
	 * Returns the offsets of the chart components.
	 * @returns {ChartConfigComponentsOffsets} The offsets of the chart components.
	 */
	getOffsets(): ChartConfigComponentsOffsets {
		return this.scaleModel.getOffsets();
	}

	/**
	 * Converts "y" in pixels to: price / percent / other value.
	 * @param y - source value in pixels
	 */
	fromY(y: Pixel): Unit {
		return this.scaleModel.fromY(y);
	}

	/**
	 * Converts "y" in pixels to price
	 * @param y - source value in pixels
	 * @param candleSeriesModel - (optional) candle series
	 */
	priceFromY(y: Pixel, candleSeriesModel?: CandleSeriesModel): Price {
		const series = candleSeriesModel ?? this.mainCandleSeries;
		return series.view.priceFromY(y);
	}

	/**
	 * Converts "x" in pixels to timestamp
	 * @param x - source value in pixels
	 */
	fromX(x: Pixel): Timestamp {
		return this.scaleModel.fromX(x);
	}

	toY = (value: Price): Pixel => {
		return this.mainCandleSeries.view.toY(value);
	};

	/**
	 * Converts index to pixel.
	 * @param idx - index of candle
	 */
	toX(idx: Index): Pixel {
		const visualCandle = this.candleFromIdx(idx);
		// lineX is the middle of candle - it's correct
		return this.scaleModel.toX(visualCandle.centerUnit);
	}

	/**
	 * Returns the baseline of the main candle series.
	 * @returns {Unit} The baseline of the main candle series.
	 */
	public getBaseLine(): Unit {
		return this.mainCandleSeries.getBaseLine();
	}

	/**
	 * Transforms X coordinate (relative to canvas element) to Candle object.
	 * If extrapolate = false, then it takes leftmost/rightmost existing candle
	 */
	public candleFromX(
		x: Pixel,
		extrapolate: boolean = false,
		selectedCandleSeries: CandleSeriesModel = this.mainCandleSeries,
	): Candle {
		const unit = this.scaleModel.fromX(x);
		return this.candleFromUnit(unit, extrapolate, selectedCandleSeries);
	}

	/**
	 * Returns a candle object based on the provided unit, which is searched for in the visualPoints array of the selectedCandleSeries.
	 * If extrapolate is true and the unit is outside the visualPoints array, a fake candle is returned.
	 * If extrapolate is false and the unit is outside the visualPoints array, null is returned.
	 * If the unit is within the visualPoints array, the corresponding candle object is returned.
	 *
	 * @param {Unit} unit - The unit to search for in the visualPoints array.
	 * @param {boolean} extrapolate - Whether to extrapolate a fake candle if the unit is outside the visualPoints array.
	 * @param {CandleSeriesModel} selectedCandleSeries - The candle series to search in. Defaults to the mainCandleSeries.
	 * @returns {Candle} - The corresponding candle object, or null if extrapolate is false and the unit is outside the visualPoints array.
	 */
	public candleFromUnit(
		unit: Unit,
		extrapolate: boolean = false,
		selectedCandleSeries: CandleSeriesModel = this.mainCandleSeries,
	): Candle {
		const result = binarySearch(selectedCandleSeries.visualPoints, unit, i => i.startUnit);
		const visualCandleSource = selectedCandleSeries.visualPoints;
		const lastVisualCandle = this.getLastVisualCandle();
		if (
			visualCandleSource[result.index] !== undefined &&
			(unit < 0 || (lastVisualCandle && unit > lastVisualCandle.startUnit + lastVisualCandle.width))
		) {
			result.index += round(
				(unit - visualCandleSource[result.index].centerUnit) / this.mainCandleSeries.meanCandleWidth,
			);
		}
		const candleIdx = result.index;
		const safeIdx = Math.max(Math.min(visualCandleSource.length - 1, candleIdx), 0);
		if ((candleIdx < 0 || candleIdx >= visualCandleSource.length) && extrapolate) {
			// fake candle
			return fakeCandle(this.mainCandleSeries.dataPoints, candleIdx, this.chartBaseModel.period);
		} else {
			// real candle
			return (
				visualCandleSource[safeIdx]?.candle ??
				fakeCandle(this.mainCandleSeries.dataPoints, safeIdx, this.chartBaseModel.period)
			);
		}
	}

	/**
	 * For given timestamp finds the closest candle in dataset.
	 * @param timestamp
	 */
	public candleFromTimestamp(timestamp: Timestamp, shouldExtrapolate: boolean = true): VisualCandle {
		return this.chartBaseModel.dataFromTimestamp(timestamp, shouldExtrapolate);
	}

	/**
	 * For given index returns the closest visual candle, or fake candle with correct X coordinate.
	 * @param idx - index of candle
	 */
	public candleFromIdx(idx: Index): VisualCandle {
		return this.chartBaseModel.dataFromIdx(idx);
	}

	/**
	 * Check whether model is ready for drawing.
	 */
	isReady(): boolean {
		// Do not check canvas size: we should check width only when resize event has occurred
		return this.canvasModel.isReady() && this.hasCandles();
	}

	/**
	 * You can use this method to determine logic of visual candle transformation for specified chart type.
	 * @param chartType
	 * @param calculator
	 */
	public registerCandlesTransformer(chartType: BarType, calculator: VisualCandleCalculator) {
		this.candlesTransformersByChartType[chartType] = calculator;
	}

	/**
	 * You can use this method to determine chart width calculation for specified chart type.
	 * @param chartType
	 * @param calculator
	 */
	public registerCandlesWidthCalculator(chartType: BarType, calculator: CandleWidthCalculator) {
		this.candleWidthByChartType[chartType] = calculator;
	}

	/**
	 * You can use this method to modify labels for last candle.
	 * @param chartType
	 * @param handler
	 */
	public registerLastCandleLabelHandler(chartType: BarType, handler: LastCandleLabelHandler) {
		this.lastCandleLabelsByChartType[chartType] = handler;
	}

	/**
	 * Checks if the main candle series has visual points.
	 * @returns {boolean} Returns true if the main candle series has visual points, otherwise false.
	 */
	hasCandles() {
		return this.mainCandleSeries.visualPoints.length !== 0;
	}

	/**
	 * Returns a visual candle object from the main candle series based on the provided index.
	 * @param {Index} idx - The index of the visual candle to retrieve.
	 * @returns {VisualCandle|undefined} - The visual candle object or undefined if it doesn't exist.
	 */
	getVisualCandle(idx: Index): VisualCandle | undefined {
		const indexToGrab = idx - (this.mainCandleSeries.visualPoints[0]?.candle?.idx ?? 0);
		return this.mainCandleSeries.visualPoints[indexToGrab];
	}

	/**
	 * Returns the index of the first data point in the main candle series.
	 *
	 * @returns {number} The index of the first data point in the main candle series.
	 */
	public getFirstIdx() {
		return this.mainCandleSeries.dataIdxStart;
	}

	/**
	 * Returns the last index of the data in the mainCandleSeries.
	 *
	 * @returns {number} - The last index of the data in the mainCandleSeries.
	 */
	public getLastIdx() {
		return this.mainCandleSeries.dataIdxEnd;
	}

	/**
	 * Returns the timestamp of the first candle in the viewport dataset
	 * @param dataBased - if false will return timestamp which matches first viewport point even if candle is not available
	 * @returns {Timestamp} The timestamp of the first candle
	 */
	getFirstTimestamp(dataBased = true): Timestamp {
		if (dataBased) {
			return this.candleFromIdx(this.getFirstIdx()).candle.timestamp;
		} else {
			return this.candleFromUnit(this.scaleModel.xStart, true).timestamp;
		}
	}

	/**
	 * Returns the timestamp of the last candle in the viewport candle array
	 * @param dataBased - if false will return timestamp which matches first viewport point even if candle is not available
	 * @returns {Timestamp} The timestamp of the last candle
	 */
	getLastTimestamp(dataBased = true): Timestamp {
		if (dataBased) {
			return this.candleFromIdx(this.getLastIdx()).candle.timestamp;
		} else {
			return this.candleFromUnit(this.scaleModel.xEnd, true).timestamp;
		}
	}

	/**
	 * Sets the timestamp range of the chart by setting the x-axis scale.
	 * @param {Timestamp} start - The start timestamp of the range.
	 * @param {Timestamp} end - The end timestamp of the range.
	 * @returns {void}
	 */
	setTimestampRange(start: Timestamp, end: Timestamp): void {
		const startUnit = this.candleFromTimestamp(start).startUnit;
		const endCandle = this.candleFromTimestamp(end);
		const endUnit = endCandle.startUnit + endCandle.width;
		return this.scaleModel.setXScale(startUnit, endUnit);
	}

	/**
	 * Returns the last candle of the main candle series.
	 * @returns {Candle | undefined} The last candle of the main candle series or undefined if the series is empty.
	 */
	getLastCandle(): Candle | undefined {
		const candles = this.mainCandleSeries.dataPoints;
		return lastOf(candles);
	}

	/**
     * Returns the last visual candle of the main candle series.
     * @returns {VisualCandle | undefined} The last visual candle of the main candle series or undefined if the series is empty.
      
    */
	getLastVisualCandle(): VisualCandle | undefined {
		const candles = this.mainCandleSeries.visualPoints;
		return lastOf(candles);
	}

	/**
	 * Calculates the maximum number of candles that can fit in the chart width based on the minimum candle width
	 * @returns {number} - The maximum number of candles that can fit in the chart width
	 */
	getMaxCandlesFitLength() {
		return floor(this.getEffectiveChartWidth() / this.config.components.chart.minWidth);
	}

	/**
	 * Returns an array of CandleSeriesModel objects representing the secondary candle series.
	 * @returns {Array<CandleSeriesModel>} An array of CandleSeriesModel objects representing the secondary candle series.
	 */
	getSecondarySeries(): Array<CandleSeriesModel> {
		return this.secondaryCandleSeries;
	}

	/**
	 * Checks if a given symbol matches the symbol of a given CandleSeriesModel's instrument.
	 * @param {CandleSeriesModel} series - The CandleSeriesModel to check.
	 * @param {ChartInstrument['symbol']} symbol - The symbol to compare with the instrument's symbol.
	 * @returns {boolean} - Returns true if the symbol matches the instrument's symbol, false otherwise.
	 */
	private isSeriesInstrument(series: CandleSeriesModel, symbol: ChartInstrument['symbol']): boolean {
		return series.instrument.symbol === symbol;
	}

	/**
	 * Returns an array of CandleSeriesModel objects that match the provided symbol.
	 *
	 * @param {string} symbol - The symbol to search for.
	 * @returns {CandleSeriesModel[]} - An array of CandleSeriesModel objects that match the provided symbol.
	 */
	public findSeriesBySymbol(symbol: ChartInstrument['symbol']): CandleSeriesModel[] {
		return this.candleSeries.filter(series => this.isSeriesInstrument(series, symbol));
	}

	/**
	 * Finds a secondary candle series by symbol
	 *
	 * @param {string} symbol - The symbol of the chart instrument
	 * @returns {CandleSeriesModel | undefined} - The secondary candle series or undefined if not found
	 */
	public findSecondarySeriesBySymbol(symbol: ChartInstrument['symbol']): CandleSeriesModel | undefined {
		return this.secondaryCandleSeries.find(series => this.isSeriesInstrument(series, symbol));
	}

	/**
	 * Reindexes candles based on a given series.
	 * @private
	 * @param {Array<Candle>} baseSeries - The base series to search for candles.
	 * @param {Array<Candle>} series - The series to reindex.
	 * @returns {Array<Candle>} - The reindexed series.
	 */
	private reindexCandlesBasedOnSeries(baseSeries: Array<Candle>, series: Array<Candle>) {
		return series.reduce((candles: Array<Candle>, candle: Candle) => {
			const timestamp = candle.timestamp;
			// find index of candle in baseSeries
			const result = searchCandleIndex(timestamp, false, baseSeries, this.chartBaseModel.period);
			if (result.index >= 0 && result.index < baseSeries.length) {
				candle.idx = result.index;
				candles[result.index] = candle;
			}
			return candles;
		}, []);
	}

	public getPeriod(): number {
		return this.chartBaseModel.period;
	}

	/**
	 * Checks if a given candle is within the viewport.
	 * @param {number} idx - The index of the candle to check.
	 * @returns {boolean} - True if the candle is within the viewport, false otherwise.
	 */
	isCandleInViewport(idx: number): boolean {
		return this.getFirstIdx() <= idx && idx <= this.getLastIdx();
	}

	/**
	 * Updates candles in series. Default is main series.
	 * Any number of candles may be provided - they would be matched by their index and updated.
	 * @param candles - any list of new (updated) candles
	 * @param instrument - name of instrument to update
	 */
	// I'd like to keep this method, for me one generic method is more convenient than 3 (updateLastCandle, addLastCandle, prepend...)
	public updateCandles(
		candles: Array<Candle>,
		instrumentSymbol: string = this.mainCandleSeries.instrument.symbol,
	): void {
		const isMainSymbol = this.mainCandleSeries.instrument.symbol === instrumentSymbol;
		const seriesList = this.findSeriesBySymbol(instrumentSymbol);

		if (seriesList.length === 0) {
			console.warn("updateCandles failed. Can't find series", instrumentSymbol);
			return;
		}

		seriesList.forEach(series => {
			const curCandles = series.dataPoints;

			let isNewCandle = false;
			let isInView = false;
			let lastCandle: Candle | undefined;

			candles.forEach(candle => {
				if (!candle) {
					return;
				}
				// detect index of updating candle
				const result = searchCandleIndex(candle.timestamp, true, curCandles, this.getPeriod());
				const idx = Math.min(result.index, curCandles.length);
				isNewCandle = isNewCandle || idx === curCandles.length;
				// update the candle and index
				curCandles[idx] = candle;
				candle.idx = idx;
				// set serie with new candle
				series.dataPoints = curCandles;
				series.recalculateDataViewportIndexes();
				isInView = isInView || this.isCandleInViewport(idx);
				const isOutRangeCurrentCandles = idx >= curCandles.length - 1;
				const isBeforeCurrentLastCandle = lastCandle && candle.timestamp < lastCandle.timestamp;
				if (isOutRangeCurrentCandles && !isBeforeCurrentLastCandle) {
					lastCandle = candle;
				}
				// we can move chart only when update is for main symbol
				// TODO we can have two series with the same instruments - this logic doesn't cover this case
				if (isNewCandle && lastCandle && isMainSymbol && isInView) {
					const widthCalculator =
						this.candleWidthByChartType[this.config.components.chart.type] ?? calculateCandleWidth;
					this.scaleModel.moveXStart(this.scaleModel.xStart + widthCalculator(lastCandle));
				}
			});

			if (lastCandle) {
				series.updateCurrentPrice(lastCandle.close);
			}

			if (isInView && lastCandle && candles.length === 1) {
				// can apply some optimization
				// series.recalculateOnlyLastVisualCandle();
				// TODO apply optimization
				this.bus.fireDraw([this.canvasModel.canvasId]);
			} else {
				series.recalculateVisualPoints();
			}
		});
		this.scaleModel.doAutoScale();
		this.candlesUpdatedSubject.next();
	}

	/**
	 * Triggers when candles set or updated
	 */
	public observeCandlesChanged(): Observable<void> {
		return merge(this.candlesSetSubject, this.candlesUpdatedSubject);
	}

	/**
	 * Returns an array of Candle objects representing the data points of the main candle series.
	 * @returns {Array<Candle>} An array of Candle objects.
	 */
	public getCandles(): Array<Candle> {
		return this.mainCandleSeries.dataPoints;
	}

	/***
	 * Returns candles array which consists of real candles and fake candles if from and to can't be satisfied with real ones.
	 * @param from - if not specified set to first candle timestamp
	 * @param to - if not specified set to last candle timestamp + right offset
	 */
	public getCandlesWithFake(from: number = 0, to?: number): Candle[] {
		let candles = this.getCandles().slice();
		const candlesCount = this.getCandlesCount();
		const _to = to ?? candlesCount + this.FAKE_CANDLES_DEFAULT;
		candles = candles.slice(Math.max(0, from), Math.min(candlesCount, _to));
		// add fake candles if needed
		const append: Candle[] = [];
		const prepend: Candle[] = [];
		for (let i = candlesCount; i < _to; i++) {
			append.push(fakeCandle(this.mainCandleSeries.dataPoints, i, this.getPeriod()));
		}
		const toPrepend = Math.min(0, _to);
		for (let i = from; i < toPrepend; i++) {
			prepend.push(fakeCandle(this.mainCandleSeries.dataPoints, i, this.getPeriod()));
		}
		return [...prepend, ...candles, ...append];
	}

	/**
	 * Returns the number of candles in the main candle series.
	 *
	 * @returns {number} The number of candles in the main candle series.
	 */
	public getCandlesCount() {
		return this.mainCandleSeries.dataPoints.length;
	}

	/**
	 * Returns the number of candles with the right offset.
	 * @returns {number} - The number of candles with the right offset.
	 */
	public getCandlesCountWithRightOffset() {
		return this.getCandlesCount() + this.getOffsets().right;
	}

	/**
	 * Clears the data of all candle series in the chart.
	 */
	clearData() {
		this.candleSeries.forEach(candleSeries => candleSeries.clearData());
	}

	/**
	 * Adds new candles array to the existing one at the start, mostly used in lazy loading
	 * @param target - initial candles array
	 * @param prependUpdate - additional candles array, which will be added to the target array
	 */
	public prependCandles(target: Candle[], prependUpdate: Candle[]): UpdateCandlesResult {
		const targetCopy = target.slice();
		const prepend: Candle[] = [];

		prependUpdate.forEach(c => {
			const result = searchCandleIndex(c.timestamp, false, target);
			const idx = result.index;
			if (idx < 0) {
				prepend.push(c);
			} else if (target[idx].timestamp === c.timestamp) {
				targetCopy[idx] = c;
			} else {
				console.warn(`Couldn't update candle with timestamp ${c.timestamp}`);
			}
		});

		return {
			prepended: prepend.length,
			candles: [...prepend, ...targetCopy],
		};
	}

	/**
	 * Adds new candle to the chart
	 * @param candle - new candle
	 * @param instrument - name of the instrument to update
	 */
	public addLastCandle(candle: Candle, instrumentSymbol: string = this.mainCandleSeries.instrument.symbol) {
		this.updateCandles([candle], instrumentSymbol);
	}

	/**
	 * Updates last candle value
	 * @param candle - updated candle
	 * @param instrument - name of the instrument to update
	 */
	public updateLastCandle(candle: Candle, instrumentSymbol: string = this.mainCandleSeries.instrument.symbol): void {
		this.updateCandles([candle], instrumentSymbol);
	}
}

export interface UpdateCandlesResult {
	prepended: number;
	appended?: number;
	candles: Candle[];
}

const sortCandles = (candles: Candle[]): Candle[] =>
	candles.slice().sort((a, b) => (a.timestamp === b.timestamp ? 0 : a.timestamp > b.timestamp ? 1 : -1));

const findFirstNotEmptyCandle = (candles: Array<Candle>, startIdx: number, iterateStep: number): Candle | undefined => {
	if (startIdx >= candles.length) {
		return candles[candles.length - 1];
	}
	for (let i = startIdx; i < candles.length && i >= 0; i += iterateStep) {
		const candle = candles[i];
		if (candle) {
			return candle;
		}
	}
};

export type TimeFrameRange = [number, number];

/**
 * Updates target array using update array.
 * If there is a candle with the same timestamp as in target array then it will be replaced
 * If the candle timestamp from update is somewhere between target candles then it will be ignored
 * If the update candle timestamp is beyond target, then it will be prepended/appended to target
 * @param target {Candle[]} - sorted candles
 * @param update {Candle[]} - sorted candles
 */
const updateCandles = (target: Candle[], update: Candle[]): UpdateCandlesResult => {
	const targetCopy = target.slice();
	const prepend: Candle[] = [];
	const append: Candle[] = [];

	update.forEach(c => {
		const result = searchCandleIndex(c.timestamp, true, target);
		const idx = result.index;
		if (idx < 0) {
			prepend.push(c);
		} else if (idx >= target.length) {
			append.push(c);
		} else if (target[idx].timestamp === c.timestamp) {
			targetCopy[idx] = c;
		} else {
			console.warn(`Couldn't update candle with timestamp ${c.timestamp}`);
		}
	});

	return {
		prepended: prepend.length,
		appended: append.length,
		candles: [...prepend, ...targetCopy, ...append],
	};
};
