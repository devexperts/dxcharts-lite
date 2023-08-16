/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { YExtentComponent } from '../components/pane/extent/y-extent-component';
import { DataSeriesYAxisLabelsProvider } from '../components/y_axis/price_labels/data-series-y-axis-labels.provider';
import { binarySearch, create2DArray, lastOf, slice2DArray } from '../utils/array.utils';
import { floorToDPR } from '../utils/device/device-pixel-ratio.utils';
import { MathUtils } from '../utils/math.utils';
import { merge } from '../utils/merge.utils';
import { AtLeastOne, cloneUnsafe } from '../utils/object.utils';
import { ChartBaseElement } from './chart-base-element';
import { DataSeriesView } from './data-series-view';
import {
	DEFAULT_DATA_SERIES_CONFIG,
	DataSeriesConfig,
	DataSeriesPaintConfig,
	DataSeriesType,
} from './data-series.config';
import { HighLowWithIndex, ScaleModel } from './scale.model';
import { HighLowProvider } from './scaling/auto-scale.model';
import { Index, Unit, Viewable } from './scaling/viewport.model';

/**
 * Properties are named in order to match VisualCandle interface
 */
export class VisualSeriesPoint {
	constructor(public centerUnit: Unit, public close: Unit) {}
	/**
	 * returns y coordinate in pixels
	 */
	y(viewable: Viewable): Unit {
		return floorToDPR(viewable.toY(this.close));
	}
	/**
	 * returns x coordinate in pixels
	 */
	x(viewable: Viewable): Unit {
		return floorToDPR(viewable.toX(this.centerUnit));
	}

	clone(): VisualSeriesPoint {
		return new VisualSeriesPoint(this.centerUnit, this.close);
	}
}

export interface DataSeriesPoint {
	timestamp: number;
	close: Unit;
}

export interface DataSeriesViewportIndexes {
	dataIdxStart: Index;
	dataIdxEnd: Index;
}

/**
 * DataSeriesModel represents single time series chart.
 * Usually data source is presented as a one-dimension array, but here it can be presented as two-dimension array
 * If the data is presented as two-dim array when every data array will be drawn as a separate time-series
 * For example, linear chart type will be drawn with gaps on the chart
 */
export class DataSeriesModel<
	D extends DataSeriesPoint = DataSeriesPoint,
	V extends VisualSeriesPoint = VisualSeriesPoint,
> extends ChartBaseElement {
	public name: string = '';

	public hovered = false;
	public yAxisLabelProvider: DataSeriesYAxisLabelsProvider;
	public readonly config: DataSeriesConfig;
	public scaleModel: ScaleModel;
	public view: DataSeriesView;
	protected _dataPoints: D[][] = [];
	public pricePrecisions = [2];
	/**
	 * Should be used for paint tools like rectangular drawing or diff cloud
	 */
	public linkedDataSeriesModels: DataSeriesModel<D, V>[] = [];

	// provides high-low regarding axis type
	public highLowProvider: HighLowProvider;

	get dataPoints2D(): D[][] {
		return this._dataPoints;
	}

	get dataPoints(): D[] {
		return this._dataPointsFlat;
	}

	protected _dataPointsFlat: D[] = [];

	set dataPoints(points: D[][] | D[]) {
		// createTwoDimArray here and below is needed to support two-dimension arrays
		this._dataPoints = create2DArray(points);
		this._dataPointsFlat = this._dataPoints.flat();
		this.visualPoints = this._toVisualPoints(this._dataPoints);
	}

	protected _visualPoints: V[][] = [];
	protected _visualPointsFlat: V[] = [];

	// start/end data index in viewport
	dataIdxStart: Index = 0;
	dataIdxEnd: Index = 0;

	get visualPoints(): V[] {
		return this._visualPointsFlat;
	}

	get visualPoints2D(): V[][] {
		return this._visualPoints;
	}

	set visualPoints(points: V[][] | V[]) {
		this._visualPoints = create2DArray(points);
		this._visualPointsFlat = this._visualPoints.flat();
	}

	constructor(
		public extentComponent: YExtentComponent,
		public id: number,
		_config: AtLeastOne<DataSeriesConfig> = cloneUnsafe(DEFAULT_DATA_SERIES_CONFIG),
	) {
		super();
		this.config = merge(_config, DEFAULT_DATA_SERIES_CONFIG);
		this.scaleModel = extentComponent.scaleModel;
		this.view = new DataSeriesView(
			this,
			this.scaleModel,
			() => this.extentComponent.getAxisType(),
			this.getBaseLine,
		);
		this.yAxisLabelProvider = new DataSeriesYAxisLabelsProvider(
			this,
			this.config,
			extentComponent.getYAxisBounds,
			extentComponent.yAxisComponent?.state,
		);
		this.highLowProvider = createDataSeriesModelHighLowProvider(this);
		extentComponent.addDataSeries(this);
		this.activate();
	}

	protected doActivate(): void {
		this.addRxSubscription(this.scaleModel.xChanged.subscribe(() => this.recalculateDataViewportIndexes()));
		this.addRxSubscription(this.scaleModel.scaleInversedSubject.subscribe(() => this.recalculateVisualPoints()));
	}

	/**
	 * Sets the data points and recalculates internal state
	 * @param {DataSeriesPoint[][] | DataSeriesPoint[]} points - The data points to set for the model. Can be an array of arrays or a single array.
	 * @returns {void}
	 */
	public setDataPoints(points: D[][] | D[]) {
		this.dataPoints = points;
		this.extentComponent.paneComponent.updateView();
	}

	/**
	 * Returns the paint configuration object for a specific series part, or the default paint configuration object
	 * if the specified series part is not defined in the current DataSeriesView configuration.
	 *
	 * @param {number} seriesPart - The index of the series part to get the paint configuration for.
	 * @returns {DataSeriesPaintConfig} The paint configuration object for the specified series part, or the default paint configuration object.
	 */
	public getPaintConfig = (seriesPart: number): DataSeriesPaintConfig => {
		return this.config.paintConfig[seriesPart] ?? this.config.paintConfig[0];
	};

	protected _toVisualPoints(data: D[][]): V[][] {
		return data.map(d => this.toVisualPoints(d));
	}

	/**
	 * Moves the DataSeriesModel to the given extent.
	 * @param extent
	 */
	public moveToExtent(extent: YExtentComponent) {
		this.extentComponent.removeDataSeries(this);
		this.extentComponent = extent;
		this.scaleModel = extent.scaleModel;
		this.view = new DataSeriesView(
			this,
			this.scaleModel,
			() => this.extentComponent.getAxisType(),
			this.getBaseLine,
		);
		this.yAxisLabelProvider.yAxisBoundsProvider = extent.getYAxisBounds;
		this.yAxisLabelProvider.axisState = extent.yAxisComponent?.state;
		// shut down old subscriptions
		this.deactivate();
		// and apply new ones (with updated scaleModel)
		this.activate();
		extent.addDataSeries(this);
	}

	/**
	 * Transforms the given array of data points of type D into an array of visual points of type V.
	 * Each visual point object contains a centerUnit property with the index of the point in the input array,
	 * and a close property with the close value of the point.
	 *
	 * @param {D[]} data - The array of data points to transform into visual points.
	 * @returns {V[]} An array of visual points, each with a centerUnit and close property.
	 */
	public toVisualPoints(data: D[]): V[] {
		// @ts-ignore
		return data.map((point, idx) => ({ centerUnit: idx, close: point.close }));
	}

	public setType(type: DataSeriesType) {
		this.config.type = type;
		this.extentComponent.dataSeriesCanvasModel.fireDraw();
	}

	/**
	 * Recalculates the visual points of the DataSeriesView based on the current data points.
	 * The visual points are stored in the visualPoints property of the DataSeriesView.
	 * Should be called 1 time when data are set / updated to chart.
	 */
	recalculateVisualPoints() {
		this.visualPoints = this._toVisualPoints(this.dataPoints2D);
	}

	/**
	 * Recalculates the indexes of the start and end points of the data viewport,
	 * based on the current xStart and xEnd values of the scale model, or on the given xStart and xEnd parameters.
	 *
	 * @param {number} [xStart=this.scaleModel.xStart] - The start value of the viewport on the x-axis. Defaults to the current xStart value of the scale model.
	 * @param {number} [xEnd=this.scaleModel.xEnd] - The end value of the viewport on the x-axis. Defaults to the current xEnd value of the scale model.
	 */
	public recalculateDataViewportIndexes(xStart = this.scaleModel.xStart, xEnd = this.scaleModel.xEnd) {
		const { dataIdxStart, dataIdxEnd } = this.calculateDataViewportIndexes(xStart, xEnd);
		this.dataIdxStart = dataIdxStart;
		this.dataIdxEnd = dataIdxEnd;
	}

	/**
	 * Calculates and returns the indexes of the start and end points of the data viewport,
	 * based on the given start and end units on the x-axis.
	 *
	 * @param {Unit} xStart - The start value of the viewport on the x-axis.
	 * @param {Unit} xEnd - The end value of the viewport on the x-axis.
	 * @returns {DataSeriesViewportIndexes} An object containing the calculated start and end indexes of the data viewport.
	 */
	public calculateDataViewportIndexes(xStart: Unit, xEnd: Unit): DataSeriesViewportIndexes {
		const dataIdxStart = binarySearch(this.visualPoints, xStart, i => i.centerUnit).index;
		const dataIdxEnd = binarySearch(this.visualPoints, xEnd, i => i.centerUnit).index;
		return {
			dataIdxStart,
			dataIdxEnd,
		};
	}

	/**
	 * Formats the given numerical value using the default value formatter.
	 *
	 * @param {number} value - The numerical value to be formatted.
	 * @returns {string} The formatted value as a string.
	 */
	public valueFormatter(value: number) {
		return defaultValueFormatter(value);
	}

	/**
	 * Returns the close value of the visual point at the given index, or 1 if the visual point is not defined.
	 * The index defaults to the data index start of the DataSeriesView.
	 *
	 * @param {number} [idx=this.dataIdxStart] - The index of the visual point to retrieve the close value for.
	 * @returns {Unit} The close value of the visual point at the given index, or 1 if the visual point is not defined.
	 */
	public getBaseLine = (idx = this.dataIdxStart): Unit => this.visualPoints[idx]?.close ?? 1;

	/**
	 * Returns the string representation of the close value of the given visual point.
	 *
	 * @param {VisualSeriesPoint} point - The visual point to get the string representation of the close value for.
	 * @returns {string} The string representation of the close value of the given visual point.
	 */
	public getTextForPoint = (point: VisualSeriesPoint): string => `${point.close}`;

	/**
	 * Returns a two-dimensional array of the visual points in the viewport of the DataSeriesView.
	 * The viewport range can be customized by providing start and end units on the x-axis.
	 * If start or end units are not provided, the current viewport range of the DataSeriesView is used.
	 *
	 * @param {number} [xStart] - The start value of the viewport range on the x-axis.
	 * @param {number} [xEnd] - The end value of the viewport range on the x-axis.
	 * @returns {V[][]} A two-dimensional array of the visual points in the viewport of the DataSeriesView.
	 */
	public getSeriesInViewport(xStart?: number, xEnd?: number): V[][] {
		let dataIdxStart = this.dataIdxStart;
		let dataIdxEnd = this.dataIdxEnd;
		if (xEnd !== undefined && xStart !== undefined) {
			const res = this.calculateDataViewportIndexes(xStart, xEnd);
			dataIdxStart = res.dataIdxStart;
			dataIdxEnd = res.dataIdxEnd;
		}
		return slice2DArray(this.visualPoints2D, dataIdxStart, dataIdxEnd);
	}

	/**
	 * Returns last visible on the screen data series value
	 * @param seriesIndex
	 */
	public getLastVisualSeriesPoint = (): V | undefined => {
		const points = this.visualPoints;
		const endIdx = binarySearch(points, this.scaleModel.xEnd, i => i.centerUnit).index;
		return points[endIdx];
	};

	/**
	 * Return last overall data series value (even if not visible)
	 * @param seriesIndex
	 */
	public getLastDataSeriesPoint = (): V | undefined => {
		const points = this.visualPoints;
		return lastOf(points);
	};
}

export const calculateDataSeriesHighLow = (visualCandles: VisualSeriesPoint[]): HighLowWithIndex => {
	const result = {
		high: Number.MIN_SAFE_INTEGER,
		low: Number.MAX_SAFE_INTEGER,
		highIdx: 0,
		lowIdx: 0,
	};
	for (let i = 0; i < visualCandles.length; i++) {
		const candle = visualCandles[i];
		if (candle.close > result.high) {
			result.high = candle.close;
			result.highIdx = i;
		}
		if (candle.close < result.low) {
			result.low = candle.close;
			result.lowIdx = i;
		}
	}
	return result;
};

const createDataSeriesModelHighLowProvider = (dataSeries: DataSeriesModel): HighLowProvider => ({
	isHighLowActive: () => dataSeries.config.highLowActive,
	calculateHighLow: state => {
		const highLow = calculateDataSeriesHighLow(dataSeries.getSeriesInViewport(state?.xStart, state?.xEnd).flat());
		return {
			...highLow,
			high: dataSeries.view.toAxisUnits(highLow.high),
			low: dataSeries.view.toAxisUnits(highLow.low),
		};
	},
});

export const defaultValueFormatter = (value: number) => {
	const DEFAULT_PRECISION = 5;

	const calcFraction = (val: number): number => Math.ceil(Math.log(Math.abs(val)) * Math.LOG10E);
	const calcPrecision = (val: number, maxPrecision: number = DEFAULT_PRECISION): number =>
		Math.max(0, maxPrecision - Math.max(0, calcFraction(val)));

	const resPrecision = calcPrecision(value);
	return MathUtils.makeDecimal(value, resPrecision);
};
