/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer, CanvasElement } from '../../../canvas/canvas-bounds-container';
import { YAxisConfig } from '../../../chart.config';
import { Bounds } from '../../../model/bounds.model';
import { CanvasModel } from '../../../model/canvas.model';
import { ChartBaseElement } from '../../../model/chart-base-element';
import {
	DataSeriesModel,
	DataSeriesPoint,
	VisualSeriesPoint,
	defaultValueFormatter,
} from '../../../model/data-series.model';
import { ScaleModel } from '../../../model/scale.model';
import { HighLowProvider, mergeHighLow } from '../../../model/scaling/auto-scale.model';
import { Pixel, Price, Unit } from '../../../model/scaling/viewport.model';
import { uuid } from '../../../utils/uuid.utils';
import { ChartBaseModel } from '../../chart/chart-base.model';
import { createYExtentFormatters } from '../../chart/price.formatter';
import { DragNDropYComponent } from '../../dran-n-drop_helper/drag-n-drop-y.component';
import { YAxisComponent } from '../../y_axis/y-axis.component';
import { PaneHitTestController } from '../pane-hit-test.controller';
import { PaneComponent, YExtentFormatters } from '../pane.component';

export interface YExtentCreationOptions {
	scale: ScaleModel;
	order: number;
	useDefaultHighLow: boolean;
	cursor: string;
	paneFormatters: YExtentFormatters;
	increment: number | null;
	initialYAxisState: YAxisConfig;
	inverse: boolean;
	lockToPriceRatio: boolean;
}

export class YExtentComponent extends ChartBaseElement {
	public yAxis: YAxisComponent;
	public mainDataSeries?: DataSeriesModel;

	constructor(
		public paneUUID: string,
		public idx: number,
		public paneComponent: PaneComponent,
		private chartBaseModel: ChartBaseModel<'candle'>,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private hitTestController: PaneHitTestController,
		public dynamicObjectsCanvasModel: CanvasModel,
		public readonly scale: ScaleModel,
		createYAxisComponent: (
			formatter: (value: number) => string,
			dataSeriesProvider: () => DataSeriesModel | undefined,
		) => YAxisComponent,
		public readonly dragNDrop: DragNDropYComponent,
		public dataSeries: Set<DataSeriesModel> = new Set(),
		public formatters: YExtentFormatters = {
			regular: defaultValueFormatter,
		},
	) {
		super();
		this.addChildEntity(scale);
		this.setValueFormatters(createYExtentFormatters(this));
		this.yAxis = createYAxisComponent(this.valueFormatter.bind(this), () => this.mainDataSeries);
		this.addChildEntity(this.yAxis);
	}

	protected doDeactivate(): void {
		super.doDeactivate();
		this.dataSeries.forEach(ds => {
			this.paneComponent.seriesRemovedSubject.next(ds);
			ds.deactivate();
		});
	}

	public getYAxisBounds = (): Bounds => {
		return this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID_Y_AXIS(this.paneUUID, this.idx));
	};

	public yAxisHT = this.canvasBoundsContainer.getBoundsHitTest(
		CanvasElement.PANE_UUID_Y_AXIS(this.paneUUID, this.idx),
	);

	/**
	 * Returns the bounds of the scale model.
	 * @returns {Bounds} The bounds of the scale model.
	 */
	public getBounds(): Bounds {
		return this.scale.getBounds();
	}

	public getBaseline() {
		return this.mainDataSeries?.getBaseline() ?? 1;
	}

	private toVisualPoints = (points: DataSeriesPoint[]): VisualSeriesPoint[] =>
		points.map(p => new VisualSeriesPoint(this.chartBaseModel.dataFromTimestamp(p.timestamp).centerUnit, p.close));

	/**
	 * Creates a new DataSeriesModel object.
	 * @returns {DataSeriesModel} - The newly created DataSeriesModel object.
	 */
	public createDataSeries(): DataSeriesModel {
		const series = new DataSeriesModel(this, uuid(), this.hitTestController.getNewDataSeriesHitTestId());
		series.toVisualPoints = this.toVisualPoints;
		return series;
	}

	/**
	 * Adds a new data series to the chart.
	 * @param {DataSeriesModel} series - The data series to be added.
	 * @returns {void}
	 */
	public addDataSeries(series: DataSeriesModel): void {
		this.dataSeries.add(series);
		if (this.dataSeries.size === 1) {
			this.mainDataSeries = series;
		}
		this.paneComponent.updateView();
		this.paneComponent.seriesAddedSubject.next(series);
	}

	toY = (value: Price): Pixel => {
		return this.mainDataSeries?.view.toY(value) ?? 1;
	};

	/**
	 * Removes a data series from the chart.
	 *
	 * @param {DataSeriesModel} series - The data series to be removed.
	 * @returns {void}
	 */
	public removeDataSeries(series: DataSeriesModel): void {
		this.dataSeries.delete(series);
		this.paneComponent.updateView();
		this.paneComponent.seriesRemovedSubject.next(series);
	}

	public valueFormatter = (value: Unit, dataSeries?: DataSeriesModel) => {
		const formatter = this.formatters[this.yAxis.getAxisType()] ?? this.formatters.regular;
		return formatter(value, dataSeries);
	};

	get regularFormatter() {
		return this.formatters.regular;
	}

	/**
	 * Sets the pane value formatters for the current instance.
	 * @param {YExtentFormatters} formatters - The pane value formatters to be set.
	 */
	setValueFormatters(formatters: YExtentFormatters) {
		this.formatters = formatters;
	}

	/**
	 * Returns the regular value from Y coordinate.
	 * @param {number} y - The Y coordinate.
	 * @returns {number} - The regular value.
	 */
	regularValueFromY(y: number) {
		return this.mainDataSeries?.view.priceFromY(y) ?? this.scale.fromY(y);
	}
}

export const createDefaultYExtentHighLowProvider = (extent: YExtentComponent): HighLowProvider => ({
	isHighLowActive: () => true,
	calculateHighLow: state => {
		const highLows = Array.from(extent.dataSeries)
			.filter(ds => ds.highLowProvider.isHighLowActive())
			.map(ds => ds.highLowProvider.calculateHighLow(state));
		return mergeHighLow(highLows);
	},
});
