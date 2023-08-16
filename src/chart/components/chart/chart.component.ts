/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable } from 'rxjs';
import { CHART_UUID, CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { ChartBaseElement } from '../../model/chart-base-element';
import { BarType, ChartConfigComponentsOffsets, FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { BackgroundDrawer } from '../../drawers/chart-background.drawer';
import { AreaDrawer } from '../../drawers/chart-type-drawers/area.drawer';
import { BarDrawer } from '../../drawers/chart-type-drawers/bar.drawer';
import { BaselineDrawer } from '../../drawers/chart-type-drawers/baseline.drawer';
import { CandleDrawer } from '../../drawers/chart-type-drawers/candle.drawer';
import { HistogramDrawer as MainChartHistogramDrawer } from '../../drawers/chart-type-drawers/histogram.drawer';
import { LineDrawer } from '../../drawers/chart-type-drawers/line.drawer';
import { ScatterPlotDrawer } from '../../drawers/chart-type-drawers/scatter-plot.drawer';
import { CandleSeriesWrapper } from '../../drawers/data-series-drawers/candle-series-wrapper';
import { ColorCandleDrawer } from '../../drawers/data-series-drawers/color-candle.drawer';
import { DifferenceCloudDrawer } from '../../drawers/data-series-drawers/difference-cloud.drawer';
import { HistogramDrawer } from '../../drawers/data-series-drawers/histogram.drawer';
import { LinearDrawer } from '../../drawers/data-series-drawers/linear.drawer';
import { PointsDrawer } from '../../drawers/data-series-drawers/points.drawer';
import { TextDrawer } from '../../drawers/data-series-drawers/text.drawer';
import { TriangleDrawer } from '../../drawers/data-series-drawers/triangle.drawer';
import { DataSeriesDrawer, SeriesDrawer } from '../../drawers/data-series.drawer';
import { DrawingManager, HIT_TEST_PREFIX } from '../../drawers/drawing-manager';
import { HTDataSeriesDrawer } from '../../drawers/ht-data-series.drawer';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { BaselineModel } from '../../model/baseline.model';
import { CandleSeriesModel } from '../../model/candle-series.model';
import { Candle } from '../../model/candle.model';
import { DataSeriesType } from '../../model/data-series.config';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';
import { ScaleModel } from '../../model/scale.model';
import { Timestamp, Unit } from '../../model/scaling/viewport.model';
import { keys } from '../../utils/object.utils';
import { PriceIncrementsUtils } from '../../utils/price-increments.utils';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { PaneManager } from '../pane/pane-manager.component';
import {
	defaultCandleTransformer,
	hollowCandleTransformer,
	trendCandleTransformer,
} from './candle-transformer.functions';
import { deleteCandlesIndex } from './candle.functions';
import { CandleWidthCalculator, ChartModel, LastCandleLabelHandler, VisualCandleCalculator } from './chart.model';
import { PrependedCandlesData } from './chart-base.model';
import { TrendHistogramDrawer } from '../../drawers/data-series-drawers/trend-histogram.drawer';

/**
 * Represents a financial instrument to be displayed on a chart
 * @class
 * @property {string} symbol - The symbol of the instrument
 * @property {string} [description] - The description of the instrument
 * @property {Array<number>} [priceIncrements=[0.01]] - An array of possible price step values on the price axis
 * @property {boolean} [bondFraction] - A flag indicating whether the instrument is a bond fraction or not
 */
export class ChartInstrument {
	symbol: string = 'MOCK';
	description?: string;
	/**
	 * defines possible price step values on price axis
	 */
	priceIncrements?: Array<number> = [0.01];
}

export type PartialCandle = Partial<Candle> & { timestamp: Timestamp; close: number };

export interface CandleSeries {
	candles: PartialCandle[];
	instrument?: ChartInstrument;
}

export class ChartComponent extends ChartBaseElement {
	public readonly baselineModel: BaselineModel;
	private readonly backgroundDrawer: BackgroundDrawer;
	private readonly dataSeriesDrawers: Record<DataSeriesType, SeriesDrawer> = {};
	private readonly dataSeriesDrawer: DataSeriesDrawer;
	constructor(
		public readonly chartModel: ChartModel,
		public canvasModel: CanvasModel,
		private config: FullChartConfig,
		private scaleModel: ScaleModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private drawingManager: DrawingManager,
		private hitTestCanvasModel: HitTestCanvasModel,
		private canvasInputListener: CanvasInputListenerComponent,
		backgroundCanvasModel: CanvasModel,
		chartPanComponent: ChartPanComponent,
		paneManager: PaneManager,
		cursorHandler: CursorHandler,
	) {
		super();
		this.addChildEntity(this.chartModel);
		this.registerDefaultCandlesTransformers();
		this.baselineModel = new BaselineModel(
			this.chartModel,
			chartPanComponent,
			this.canvasModel,
			this.canvasInputListener,
			this.config,
			this.canvasBoundsContainer,
			cursorHandler,
		);
		this.addChildEntity(this.baselineModel);
		//#region main chart drawers
		const hTChartDrawer = new HTDataSeriesDrawer(this.dataSeriesDrawers, this.hitTestCanvasModel, paneManager);
		this.drawingManager.addDrawerBefore(hTChartDrawer, HIT_TEST_PREFIX + 'DATA_SERIES', 'HIT_TEST_EVENTS');
		//#endregion
		//#region data series drawers
		this.dataSeriesDrawer = new DataSeriesDrawer(paneManager, canvasModel, this.dataSeriesDrawers);
		this.drawingManager.addDrawer(this.dataSeriesDrawer, 'DATA_SERIES');
		this.registerDefaultDataSeriesDrawers();
		//#endregion
		this.backgroundDrawer = new BackgroundDrawer(backgroundCanvasModel, this.config);
		drawingManager.addDrawer(this.backgroundDrawer, 'MAIN_BACKGROUND');
		cursorHandler.setCursorForCanvasEl(CanvasElement.PANE_UUID(CHART_UUID), config.components.chart.cursor);
	}

	/**
	 * This method overrides the doActivate method of the parent class and calls it.
	 * It does not take any parameters and does not return anything.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();
	}

	/**
	 * Registers default candle transformers.
	 * @private
	 * @function
	 * @returns {void}
	 */
	private registerDefaultCandlesTransformers() {
		this.registerCandlesTransformer('candle', defaultCandleTransformer);
		this.registerCandlesTransformer('trend', trendCandleTransformer);
		this.registerCandlesTransformer('hollow', hollowCandleTransformer);
	}

	get barTypeValues(): Array<BarType> {
		// @ts-ignore
		return keys(this.dataSeriesDrawers);
	}

	public strToBarType = (str: string): BarType => this.barTypeValues.find(t => t === str) ?? 'candle';

	/**
	 * You can use this method to determine logic of visual candle transformation for specified chart type.
	 * @param chartType
	 * @param transformer
	 */
	public registerCandlesTransformer(chartType: BarType, transformer: VisualCandleCalculator) {
		this.chartModel.registerCandlesTransformer(chartType, transformer);
	}

	/**
	 * You can use this method to modify labels for last candle.
	 * @param chartType
	 * @param handler
	 */
	public registerLastCandleLabelHandler(chartType: BarType, handler: LastCandleLabelHandler) {
		this.chartModel.registerLastCandleLabelHandler(chartType, handler);
	}

	/**
	 * You can use this method to determine chart width calculation for specified chart type.
	 * @param chartType
	 * @param calculator
	 */
	public registerCandlesWidthCalculator(chartType: BarType, calculator: CandleWidthCalculator) {
		this.chartModel.registerCandlesWidthCalculator(chartType, calculator);
	}

	/**
	 * In future this drawers should have same type as main series
	 */
	private registerDefaultDataSeriesDrawers() {
		const candleDrawer = new CandleDrawer(this.config.components.chart);
		this.registerDataSeriesTypeDrawer('candle', candleDrawer);
		this.registerDataSeriesTypeDrawer('trend', candleDrawer);
		this.registerDataSeriesTypeDrawer('hollow', candleDrawer);
		this.registerDataSeriesTypeDrawer('bar', new BarDrawer(this.config.components.chart));
		this.registerDataSeriesTypeDrawer('line', new LineDrawer(this.config.components.chart));
		this.registerDataSeriesTypeDrawer('scatterPlot', new ScatterPlotDrawer(this.config.colors.scatterPlot));
		this.registerDataSeriesTypeDrawer('area', new AreaDrawer(this.config.components.chart));
		this.registerDataSeriesTypeDrawer(
			'baseline',
			new BaselineDrawer(this.baselineModel, this.canvasBoundsContainer),
		);
		this.registerDataSeriesTypeDrawer(
			'histogram',
			new MainChartHistogramDrawer(this.config.components.chart.histogram),
		);

		const mainChartBoundsProvider = () => this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(CHART_UUID));
		this.registerDataSeriesTypeDrawer('LINEAR', new LinearDrawer());
		this.registerDataSeriesTypeDrawer('HISTOGRAM', new HistogramDrawer());
		this.registerDataSeriesTypeDrawer('TREND_HISTOGRAM', new TrendHistogramDrawer());
		this.registerDataSeriesTypeDrawer('POINTS', new PointsDrawer());
		this.registerDataSeriesTypeDrawer(
			'COLOR_CANDLE',
			new CandleSeriesWrapper(new ColorCandleDrawer(this.chartModel), this.config, mainChartBoundsProvider),
		);
		this.registerDataSeriesTypeDrawer('TEXT', new TextDrawer(this.config));
		this.registerDataSeriesTypeDrawer('TRIANGLE', new TriangleDrawer());
		this.registerDataSeriesTypeDrawer('DIFFERENCE', new DifferenceCloudDrawer());
	}

	/**
	 * Sets the chart type of main candle series.
	 * @param type - new type
	 */
	public setChartType(type: BarType): void {
		this.config.components.chart.type = type;
		this.chartModel.rememberCurrentTimeframe();
		this.chartModel.mainCandleSeries.setType(type);
		this.chartModel.mainCandleSeries.updateCandleSeriesColors({
			...this.config.colors,
		});
		this.chartModel.mainCandleSeries.recalculateVisualPoints();
		this.chartModel.chartTypeChanged.next(type);
	}

	/**
	 * Resets chart scale to default according to config.components.chart.defaultZoomCandleWidth.
	 */
	public resetChartScale() {
		this.chartModel.doBasicScale();
	}

	/**
	 * Sets the timestamp range of the chart by setting the x-axis scale.
	 * @param {Timestamp} start - The start timestamp of the range.
	 * @param {Timestamp} end - The end timestamp of the range.
	 * @returns {void}
	 */
	public setTimestampRange(start: Timestamp, end: Timestamp): void {
		return this.chartModel.setTimestampRange(start, end);
	}

	/**
	 * Moves the viewport to exactly xStart..xEnd place.
	 * @param xStart - viewport start in units
	 * @param xEnd - viewport end in units
	 */
	public setXScale(xStart: Unit, xEnd: Unit) {
		return this.scaleModel.setXScale(xStart, xEnd);
	}

	/**
	 * Sets the visibility of the wicks in the chart.
	 * @param {boolean} isShow - A boolean value indicating whether to show or hide the wicks.
	 * @returns {void}
	 */
	public setShowWicks(isShow: boolean) {
		this.config.components.chart.showWicks = isShow;
		this.canvasModel.fireDraw();
	}

	/**
	 * Used to set the main series to chart.
	 * @param series
	 */
	public setMainSeries(series: CandleSeries) {
		const instrument = series.instrument ?? this.chartModel.mainCandleSeries.instrument;
		this.chartModel.mainCandleSeries.instrument = instrument;
		this.chartModel.setAllSeries(
			{
				candles: series.candles,
				instrument,
			},
			this.chartModel.getSecondarySeries().map(series => {
				const instrument = series.instrument ?? this.chartModel.mainCandleSeries.instrument;
				const originalCandles = series.dataPoints;
				// reset the idx of candles to calculate them again
				deleteCandlesIndex(originalCandles);
				return {
					candles: originalCandles,
					instrument,
				};
			}),
		);
		this.updatePriceIncrementsIfNeeded(instrument);
	}

	/**
	 * Adds new secondary chart series.
	 * @param series
	 */
	public setSecondarySeries(series: CandleSeries): CandleSeriesModel | undefined {
		const instrument = series.instrument ?? this.chartModel.mainCandleSeries.instrument;
		const candleSeriesModel = this.chartModel.setSecondaryCandleSeries(series.candles, instrument);
		this.updatePriceIncrementsIfNeeded(instrument);
		if (candleSeriesModel) {
			return candleSeriesModel;
		}
	}

	/**
	 * Sets the main and secondary series in one bulk operation.
	 * Reindexing and visual rerender happens at the same time.
	 * @param mainSeries
	 * @param secondarySeries
	 */
	public setAllSeries(mainSeries: CandleSeries, secondarySeries: CandleSeries[] = []): void {
		const instrument = mainSeries.instrument ?? this.chartModel.mainCandleSeries.instrument;
		this.updatePriceIncrementsIfNeeded(instrument);
		secondarySeries.forEach(series => {
			const instrument = series.instrument ?? this.chartModel.mainCandleSeries.instrument;
			this.updatePriceIncrementsIfNeeded(instrument);
		});
		this.chartModel.setAllSeries(mainSeries, secondarySeries);
	}

	/**
	 * Converts candle index to chart x coordinate
	 */
	public toXFromCandleIndex(idx: number): number {
		return this.chartModel.toX(idx);
	}

	/**
	 * Converts timestamp to chart x coordinate
	 */
	public toXFromTimestamp(timestamp: number): number {
		const xCandle = this.chartModel.candleFromTimestamp(timestamp);
		return xCandle.xCenter(this.chartModel.scaleModel);
	}

	/**
	 * Converts price to chart y coordinate
	 */
	public toY(price: number): number {
		return this.chartModel.toY(price);
	}

	/**
	 * Updates the main and secondary series in one bulk operation.
	 * Reindexing and visual rerender happens at the same time.
	 * @param mainSeries {CandleSeries}
	 * @param secondarySeries {CandleSeries[]}
	 */
	public updateAllSeries(mainSeries: CandleSeries, secondarySeries: CandleSeries[] = []): void {
		this.chartModel.updateAllSeries(mainSeries, secondarySeries);
		this.canvasModel.fireDraw();
	}

	/**
	 * Removes all data points from the main candle series that are newer than the given timestamp.
	 * Can be useful for data replay.
	 * @param startTimestamp
	 */
	public removeDataFrom(timestamp: Timestamp) {
		this.chartModel.removeDataFrom(timestamp);
	}

	/**
	 * Removes chart candles series.
	 * @param instrument
	 */
	public removeSecondarySeries(series: CandleSeriesModel) {
		this.chartModel.removeSecondaryCandleSeries(series);
	}

	/**
	 * Adds new candles array to the existing one at the start, mostly used in lazy loading
	 * @param target - initial candles array
	 * @param prependUpdate - additional candles array, which will be added to the target array
	 */
	public prependCandles(target: Candle[], prependUpdate: Candle[]) {
		this.chartModel.prependCandles(target, prependUpdate);
	}

	/**
	 * Adds new candle to the chart
	 * @param candle - new candle
	 * @param instrument - name of the instrument to update
	 */
	public addLastCandle(candle: Candle, instrumentSymbol?: string) {
		this.chartModel.addLastCandle(candle, instrumentSymbol);
	}

	/**
	 * Updates last candle value
	 * @param candle - updated candle
	 * @param instrument - name of the instrument to update
	 */
	public updateLastCandle(candle: Candle, instrumentSymbol?: string) {
		this.chartModel.updateLastCandle(candle, instrumentSymbol);
	}

	/**
	 * Updates candle series for instrument. By default takes main instrument.
	 * @param candles
	 * @param instrument
	 */
	public updateCandles(candles: Array<Candle>, instrumentSymbol?: string): void {
		this.chartModel.updateCandles(candles, instrumentSymbol);
	}

	/**
	 * Sets offsets to viewport.
	 * @param offsets - new offsets
	 */
	public setOffsets(offsets: Partial<ChartConfigComponentsOffsets>) {
		this.chartModel.setOffsets(offsets);
	}

	/**
	 * Returns a SeriesDrawer object based on the provided drawerType.
	 * @param {BarType} drawerType - The type of the drawer to be returned.
	 * @returns {SeriesDrawer | undefined} - The SeriesDrawer object corresponding to the provided drawerType or undefined if not found.
	 */
	public getDataSeriesDrawer(drawerType: BarType): SeriesDrawer | undefined {
		return this.dataSeriesDrawers[drawerType];
	}

	/**
	 * Registers a new chart type drawer or overrides default drawer if drawerType is {BarType}.
	 * @param drawerType {string} - a unique name for the drawer, could be {BarType} - in this case will override default drawer for the type
	 * @param drawer {ChartTypeDrawer} - an implementation of the drawer
	 */
	public registerDataSeriesTypeDrawer(drawerType: DataSeriesType, drawer: SeriesDrawer) {
		this.dataSeriesDrawers[drawerType] = drawer;
	}

	//#endregion
	/**
	 * Updates the price increments of a given instrument if they are not valid or not defined.
	 * If the price increments are not valid or not defined, it will set them to a default value.
	 * @param {ChartInstrument} instrument - The instrument to update the price increments for.
	 */
	private updatePriceIncrementsIfNeeded(instrument: ChartInstrument) {
		if (
			!instrument.priceIncrements ||
			!PriceIncrementsUtils.validatePriceIncrementsOrPrecisions(instrument.priceIncrements)
		) {
			instrument.priceIncrements = [
				PriceIncrementsUtils.autoDetectIncrementOfValueRange(this.scaleModel.yEnd - this.scaleModel.yStart),
			];
		}
	}

	//#region public events
	/**
	 * Returns an Observable that emits a void value whenever the offsetsChanged event is triggered.
	 * @returns {Observable<void>} An Observable that emits a void value whenever the offsetsChanged event is triggered.
	 */
	public observeOffsetsChanged(): Observable<void> {
		return this.chartModel.offsetsChanged;
	}

	/**
	 * Returns an Observable that emits the BarType whenever the chart type is changed.
	 * @returns {Observable<BarType>} An Observable that emits the BarType whenever the chart type is changed.
	 */
	public observeChartTypeChanged(): Observable<BarType> {
		return this.chartModel.chartTypeChanged;
	}

	/**
	 * Returns an Observable that emits a void value when the candles in the chart model change.
	 * The Observable is obtained by calling the observeCandlesChanged method of the chartModel object.
	 * @returns {Observable<void>} An Observable that emits a void value when the candles in the chart model change.
	 */
	public observeCandlesChanged(): Observable<void> {
		return this.chartModel.observeCandlesChanged();
	}

	/**
	 * Returns an Observable that emits a void value when the candles are updated in the chart model.
	 * The Observable is obtained from the candlesUpdatedSubject of the chartModel.
	 * @returns {Observable<void>} Observable that emits a void value when the candles are updated.
	 */
	public observeCandlesUpdated(): Observable<void> {
		return this.chartModel.candlesUpdatedSubject;
	}

	/**
	 * Returns an Observable that emits a void value whenever the candlesPrependSubject is triggered.
	 * @returns {Observable<PrependedCandlesData>} An Observable that emits a PrependedCandlesData whenever the candles are added to the end.
	 */
	public observeCandlesPrepended(): Observable<PrependedCandlesData> {
		return this.chartModel.candlesPrependSubject;
	}

	//#endregion
}
