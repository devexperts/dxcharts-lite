import { BarType, FullChartColors, FullChartConfig } from '../../chart.config';
import { ClearCanvasDrawer } from '../../drawers/clear-canvas.drawer';
import { CompositeDrawer } from '../../drawers/composite.drawer';
import { DrawingManager } from '../../drawers/drawing-manager';
import { PriceMovement } from '../../model/candle-series.model';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { DataSeriesType } from '../../model/data-series.config';
import { PaneManager } from '../pane/pane-manager.component';
import {
	resolveColorForArea,
	resolveColorForBar,
	resolveColorForBaseLine,
	resolveColorForCandle,
	resolveColorForHistogram,
	resolveColorForLine,
	resolveColorForScatterPlot,
	resolveColorForTrendAndHollow,
	resolveDefaultColorForLabel,
} from './label-color.functions';
import { YAxisDrawer } from './y-axis.drawer';

export type LabelColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => string;

export class YAxisGlobalComponent extends ChartBaseElement {
	private labelsColorByChartTypeMap: Partial<Record<DataSeriesType, LabelColorResolver>> = {};
	public drawer: CompositeDrawer;

	constructor(
		config: FullChartConfig,
		drawingManager: DrawingManager,
		mainCanvasModel: CanvasModel,
		yAxisLabelsCanvasModel: CanvasModel,
		paneManager: PaneManager,
	) {
		super();
		this.registerDefaultLabelColorResolver();
		const yAxisCompositeDrawer = new CompositeDrawer();
		this.drawer = yAxisCompositeDrawer;
		const clearYAxis = new ClearCanvasDrawer(yAxisLabelsCanvasModel);
		yAxisCompositeDrawer.addDrawer(clearYAxis, 'YAXIS_CLEAR');

		drawingManager.addDrawer(yAxisCompositeDrawer, 'Y_AXIS');

		//#region init YAxisDrawers
		const yAxisDrawer = new YAxisDrawer(config, mainCanvasModel, paneManager);
		yAxisCompositeDrawer.addDrawer(yAxisDrawer);

		// const yAxisLabelsDrawer = new YAxisPriceLabelsDrawer(
		// 	() => this.yAxisModel.yAxisLabelsModel.orderedLabels,
		// 	yAxisLabelsCanvasModel,
		// 	this.backgroundCanvasModel,
		// 	this.state,
		// 	this.canvasBoundsContainer,
		// 	this.config.colors.yAxis,
		// 	this.yAxisModel.yAxisLabelsModel.customLabels,
		// );
		// yAxisCompositeDrawer.addDrawer(yAxisLabelsDrawer);
		//#endregion
	}

	/**
	 * Registers default label color resolvers for different chart types.
	 * @private
	 * @function
	 * @name registerDefaultLabelColorResolver
	 * @returns {void}
	 */
	private registerDefaultLabelColorResolver() {
		this.registerLabelColorResolver('candle', resolveColorForCandle);
		this.registerLabelColorResolver('bar', resolveColorForBar);
		this.registerLabelColorResolver('line', resolveColorForLine);
		this.registerLabelColorResolver('area', resolveColorForArea);
		this.registerLabelColorResolver('scatterPlot', resolveColorForScatterPlot);
		this.registerLabelColorResolver('histogram', resolveColorForHistogram);
		this.registerLabelColorResolver('baseline', resolveColorForBaseLine);
		this.registerLabelColorResolver('trend', resolveColorForTrendAndHollow);
		this.registerLabelColorResolver('hollow', resolveColorForTrendAndHollow);
	}

	/**
	 * Registers a label color resolver for a specific chart type.
	 *
	 * @param {BarType} chartType - The type of chart for which the label color resolver is being registered.
	 * @param {LabelColorResolver} resolver - The function that will be used to resolve the color of the labels for the specified chart type.
	 * @returns {void}
	 */
	public registerLabelColorResolver(chartType: BarType, resolver: LabelColorResolver) {
		this.labelsColorByChartTypeMap[chartType] = resolver;
	}

	/**
	 * Returns a function that resolves the color for a label based on the type of data series.
	 * @param {DataSeriesType} candlesType - The type of data series.
	 * @returns {Function} - A function that resolves the color for a label.
	 * If there is no color mapping for the given data series type, it returns the default color resolver function.
	 */
	public getLabelsColorResolver(candlesType: DataSeriesType) {
		return this.labelsColorByChartTypeMap[candlesType] ?? resolveDefaultColorForLabel;
	}
}
