/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer, CanvasElement } from '../../../canvas/canvas-bounds-container';
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
import { Unit } from '../../../model/scaling/viewport.model';
import { ChartBaseModel } from '../../chart/chart-base.model';
import { createYExtentFormatters } from '../../chart/price.formatter';
import { DragNDropYComponent } from '../../dran-n-drop_helper/drag-n-drop-y.component';
import { PriceAxisType } from '../../labels_generator/numeric-axis-labels.generator';
import { YAxisComponent } from '../../y_axis/y-axis.component';
import { PaneHitTestController } from '../pane-hit-test.controller';
import { PaneComponent, YExtentFormatters } from '../pane.component';

export interface YExtentCreationOptions {
	scaleModel: ScaleModel;
	order: number;
	useDefaultHighLow: boolean;
	cursor: string;
	paneFormatters: YExtentFormatters;
	increment: number | null;
}

export class YExtentComponent extends ChartBaseElement {
	private mainDataSeries?: DataSeriesModel;

	constructor(
		public paneUuid: string,
		public idx: number,
		public paneComponent: PaneComponent,
		private chartBaseModel: ChartBaseModel<'candle'>,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private hitTestController: PaneHitTestController,
		public dataSeriesCanvasModel: CanvasModel,
		public readonly scaleModel: ScaleModel,
		public readonly yAxisComponent: YAxisComponent,
		public readonly dragNDrop: DragNDropYComponent,
		public dataSeries: Set<DataSeriesModel> = new Set(),
		public formatters: YExtentFormatters = {
			regular: defaultValueFormatter,
		},
	) {
		super();
		this.addChildEntity(scaleModel);
		this.addChildEntity(yAxisComponent);
		this.setValueFormatters(createYExtentFormatters(this));
	}

	protected doDeactivate(): void {
		super.doDeactivate();
		this.dataSeries.forEach(ds => ds.deactivate());
	}

	public getYAxisBounds = (): Bounds => {
		return this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID_Y_AXIS(this.paneUuid, this.idx));
	};

	public yAxisHT = this.canvasBoundsContainer.getBoundsHitTest(
		CanvasElement.PANE_UUID_Y_AXIS(this.paneUuid, this.idx),
	);

	/**
	 * Returns the bounds of the scale model.
	 * @returns {Bounds} The bounds of the scale model.
	 */
	public getBounds(): Bounds {
		return this.scaleModel.getBounds();
	}

	private toVisualPoints = (points: DataSeriesPoint[]): VisualSeriesPoint[] =>
		points.map(p => new VisualSeriesPoint(this.chartBaseModel.dataFromTimestamp(p.timestamp).centerUnit, p.close));

	/**
	 * Creates a new DataSeriesModel object.
	 * @returns {DataSeriesModel} - The newly created DataSeriesModel object.
	 */
	public createDataSeries(): DataSeriesModel {
		const series = new DataSeriesModel(this, this.hitTestController.getNewDataSeriesHitTestId());
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
	}

	/**
	 * Removes a data series from the chart.
	 *
	 * @param {DataSeriesModel} series - The data series to be removed.
	 * @returns {void}
	 */
	public removeDataSeries(series: DataSeriesModel): void {
		this.dataSeries.delete(series);
		this.paneComponent.updateView();
	}

	// TODO hack, remove when each pane will have separate y-axis component
	/**
	 * Returns the type of the y-axis component for the current pane.
	 *
	 * @returns {PriceAxisType} The 'regular' type of the y-axis component for the current pane.
	 *
	 */
	public getAxisType(): PriceAxisType {
		return 'regular';
	}

	public valueFormatter = (value: Unit, dataSeries?: DataSeriesModel) => {
		const formatter = this.formatters[this.getAxisType()] ?? this.formatters.regular;
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
		return this.mainDataSeries?.view.priceFromY(y) ?? this.scaleModel.fromY(y);
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
