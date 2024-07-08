/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { CanvasAnimation } from '../../animation/canvas-animation';
import {
	areBoundsChanged,
	CanvasBoundsContainer,
	CanvasElement,
	HitBoundsTest,
} from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { FullChartConfig, YAxisConfig } from '../../chart.config';
import { DrawingManager } from '../../drawers/drawing-manager';
import EventBus from '../../events/event-bus';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { Bounds } from '../../model/bounds.model';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { DataSeriesModel } from '../../model/data-series.model';
import { ScaleModel, SyncedByXScaleModel } from '../../model/scale.model';
import { Pixel, Price, Unit } from '../../model/scaling/viewport.model';
import { firstOf, flatMap, lastOf } from '../../utils/array.utils';
import { Unsubscriber } from '../../utils/function.utils';
import { AtLeastOne } from '../../utils/object.utils';
import { ChartBaseModel } from '../chart/chart-base.model';
import { createCandlesOffsetProvider } from '../chart/data-series.high-low-provider';
import { DragNDropYComponent } from '../dran-n-drop_helper/drag-n-drop-y.component';
import { GridComponent } from '../grid/grid.component';
import { PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { NumericYAxisLabelsGenerator } from '../y_axis/numeric-y-axis-labels.generator';
import { YAxisComponent } from '../y_axis/y-axis.component';
import {
	createDefaultYExtentHighLowProvider,
	YExtentComponent,
	YExtentCreationOptions,
} from './extent/y-extent-component';
import { PaneHitTestController } from './pane-hit-test.controller';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';
import { ChartResizeHandler } from '../../inputhandlers/chart-resize.handler';

export class PaneComponent extends ChartBaseElement {
	/**
	 * Pane hit test (without Y-Axis and resizer)
	 */
	public ht: HitBoundsTest;

	public yExtentComponents: YExtentComponent[] = [];

	get scale() {
		return this.mainExtent.scale;
	}

	get yAxis() {
		return this.mainExtent.yAxis;
	}

	get dataSeries() {
		return flatMap(this.yExtentComponents, c => Array.from(c.dataSeries));
	}

	get visible() {
		return this.canvasBoundsContainer.graphsHeightRatio[this.uuid] > 0;
	}

	public mainExtent: YExtentComponent;

	constructor(
		public chartBaseModel: ChartBaseModel<'candle'>,
		private mainCanvasModel: CanvasModel,
		private yAxisLabelsCanvasModel: CanvasModel,
		public readonly dynamicObjectsCanvasModel: CanvasModel,
		private hitTestController: PaneHitTestController,
		private config: FullChartConfig,
		private mainScale: ScaleModel,
		private drawingManager: DrawingManager,
		private chartPanComponent: ChartPanComponent,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasAnimation: CanvasAnimation,
		private cursorHandler: CursorHandler,
		public eventBus: EventBus,
		private canvasBoundsContainer: CanvasBoundsContainer,
		public readonly uuid: string,
		public seriesAddedSubject: Subject<DataSeriesModel>,
		public seriesRemovedSubject: Subject<DataSeriesModel>,
		private hitTestCanvasModel: HitTestCanvasModel,
		private chartResizeHandler: ChartResizeHandler,
		options?: AtLeastOne<YExtentCreationOptions>,
	) {
		super();
		const yExtentComponent = this.createExtentComponent(options);
		this.mainExtent = yExtentComponent;
		this.ht = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.PANE_UUID(uuid), {
			// this is needed to reduce cross event fire zone, so cross event won't be fired when hover resizer
			// maybe we need to rework it, this isn't perfect - top and bottom panes will have small no-hover area
			extensionY: -this.config.components.paneResizer.dragZone,
		});
	}

	/**
	 * Method that activates the canvas bounds container and recalculates the zoom Y of the scale model.
	 * @protected
	 * @function
	 * @returns {void}
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			this.canvasBoundsContainer
				.observeBoundsChanged(CanvasElement.PANE_UUID(this.uuid))
				.pipe(distinctUntilChanged(areBoundsChanged))
				.subscribe(() => {
					this.yExtentComponents.forEach(c => c.scale.recalculateZoomY());
					this.dynamicObjectsCanvasModel.fireDraw();
				}),
		);
	}

	public toY(price: Price): Pixel {
		return this.mainExtent.mainDataSeries?.view.toY(price) ?? this.scale.toY(price);
	}

	/**
	 * Creates a new GridComponent instance with the provided parameters.
	 * @param {string} uuid - The unique identifier of the pane.
	 * @param {ScaleModel} scaleModel - The scale model used to calculate the scale of the grid.
	 * @param {NumericYAxisLabelsGenerator} yAxisLabelsGenerator - The generator used to create the labels for the y-axis.
	 * @returns {GridComponent} - The newly created GridComponent instance.
	 */
	private createGridComponent(
		uuid: string,
		scale: ScaleModel,
		yAxisLabelsGenerator: NumericYAxisLabelsGenerator,
		yAxisState: YAxisConfig,
	) {
		const chartPaneId = CanvasElement.PANE_UUID(uuid);
		const gridComponent = new GridComponent(
			this.mainCanvasModel,
			scale,
			this.config,
			yAxisState,
			`PANE_${uuid}_grid_drawer`,
			this.drawingManager,
			() => this.canvasBoundsContainer.getBounds(chartPaneId),
			() => this.canvasBoundsContainer.getBounds(chartPaneId),
			() => [],
			() => yAxisLabelsGenerator.generateNumericLabels(),
		);
		return gridComponent;
	}

	/**
	 * Creates a handler for Y-axis panning of the chart.
	 * @private
	 * @param {string} uuid - The unique identifier of the chart pane.
	 * @param {ScaleModel} scaleModel - The scale model of the chart.
	 * @returns {Unsubscriber}
	 */
	private createYPanHandler(uuid: string, scale: ScaleModel): [Unsubscriber, DragNDropYComponent] {
		const chartPaneId = CanvasElement.PANE_UUID(uuid);
		const dragNDropComponent = this.chartPanComponent.chartAreaPanHandler.registerChartYPanHandler(
			scale,
			this.canvasBoundsContainer.getBoundsHitTest(chartPaneId),
		);
		return [
			() => {
				this.chartPanComponent.chartAreaPanHandler.removeChildEntity(dragNDropComponent);
				dragNDropComponent.disable();
			},
			dragNDropComponent,
		];
	}

	private addCursors(extentIdx: number, yAxisComponent: YAxisComponent): Unsubscriber {
		const paneYAxis = CanvasElement.PANE_UUID_Y_AXIS(this.uuid, extentIdx);
		this.cursorHandler.setCursorForCanvasEl(paneYAxis, yAxisComponent.state.cursor);
		return () => this.cursorHandler.removeCursorForCanvasEl(paneYAxis);
	}

	public createExtentComponent(options?: AtLeastOne<YExtentCreationOptions>) {
		const extentIdx = this.yExtentComponents.length;
		const chartPaneId = CanvasElement.PANE_UUID(this.uuid);
		const getBounds = () => this.canvasBoundsContainer.getBounds(chartPaneId);
		const scaleModel =
			options?.scale ?? new SyncedByXScaleModel(this.mainScale, this.config, getBounds, this.canvasAnimation);
		const initialYAxisState = options?.initialYAxisState;
		const [unsub, dragNDrop] = this.createYPanHandler(this.uuid, scaleModel);

		// creating partially resolved constructor except formatter & dataSeriesProvider - bcs it's not possible to provide formatter
		// before y-extent is created
		const createYAxisComponent = (
			formatter: (value: number) => string,
			dataSeriesProvider: () => DataSeriesModel | undefined,
		) =>
			new YAxisComponent(
				this.eventBus,
				this.config,
				this.yAxisLabelsCanvasModel,
				scaleModel,
				this.canvasInputListener,
				this.canvasBoundsContainer,
				this.chartPanComponent,
				this.cursorHandler,
				formatter,
				dataSeriesProvider,
				this.uuid,
				extentIdx,
				this.hitTestCanvasModel,
				this.chartResizeHandler,
				initialYAxisState,
			);

		const yExtentComponent = new YExtentComponent(
			this.uuid,
			extentIdx,
			this,
			this.chartBaseModel,
			this.canvasBoundsContainer,
			this.hitTestController,
			this.dynamicObjectsCanvasModel,
			scaleModel,
			createYAxisComponent,
			dragNDrop,
		);
		yExtentComponent.addSubscription(unsub);
		yExtentComponent.addSubscription(this.addCursors(extentIdx, yExtentComponent.yAxis));

		options?.paneFormatters && yExtentComponent.setValueFormatters(options.paneFormatters);

		const useDefaultHighLow = options?.useDefaultHighLow ?? true;
		if (useDefaultHighLow) {
			scaleModel.autoScaleModel.setHighLowProvider(
				'default',
				createCandlesOffsetProvider(
					() => ({ top: 10, bottom: 10, left: 0, right: 0, visible: true }),
					createDefaultYExtentHighLowProvider(yExtentComponent),
				),
			);
		}

		const gridComponent = this.createGridComponent(
			this.uuid,
			scaleModel,
			yExtentComponent.yAxis.model.labelsGenerator,
			yExtentComponent.yAxis.state,
		);
		yExtentComponent.addChildEntity(gridComponent);

		yExtentComponent.activate();
		this.yExtentComponents.push(yExtentComponent);
		this.canvasBoundsContainer.updateYAxisWidths();
		return yExtentComponent;
	}

	public removeExtentComponent(extentComponent: YExtentComponent) {
		extentComponent.disable();
		this.yExtentComponents.splice(extentComponent.idx, 1);
		// re-index extents
		this.yExtentComponents.forEach((c, idx) => (c.idx = idx));
		this.canvasBoundsContainer.updateYAxisWidths();
	}

	/**
	 * This method updates the view by calling the doAutoScale method of the scaleModel and firing the Draw event using the eventBus.
	 * @private
	 */
	public updateView() {
		this.yExtentComponents.forEach(c => {
			c.scale.doAutoScale();
			c.yAxis.model.labelsGenerator.generateNumericLabels();
		});
		this.canvasBoundsContainer.updateYAxisWidths();
		this.eventBus.fireDraw();
	}

	/**
	 * Merges all the y-axis extents on the pane into one.
	 */
	public mergeYExtents() {
		for (let i = 1; i < this.yExtentComponents.length; i++) {
			const extent = this.yExtentComponents[i];
			extent.dataSeries.forEach(s => s.moveToExtent(this.mainExtent));
			extent.disable();
		}
		this.canvasBoundsContainer.updateYAxisWidths();
		this.yExtentComponents = [this.mainExtent];
	}

	public getYAxisBounds = (): Bounds => {
		return this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID_Y_AXIS(this.uuid));
	};

	/**
	 * Returns the bounds of the pane component.
	 */
	public getBounds(): Bounds {
		return this.mainExtent.getBounds();
	}

	/**
	 * Creates a new DataSeriesModel object.
	 * @returns {DataSeriesModel} - The newly created DataSeriesModel object.
	 */
	public createDataSeries(): DataSeriesModel {
		return this.mainExtent?.createDataSeries();
	}

	/**
	 * Adds a new data series to the chart.
	 * @param {DataSeriesModel} series - The data series to be added.
	 * @returns {void}
	 */
	public addDataSeries(series: DataSeriesModel): void {
		this.mainExtent.addDataSeries(series);
		this.updateView();
	}

	/**
	 * Removes a data series from the chart.
	 *
	 * @param {DataSeriesModel} series - The data series to be removed.
	 * @returns {void}
	 */
	public removeDataSeries(series: DataSeriesModel): void {
		this.mainExtent.removeDataSeries(series);
		this.updateView();
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

	/**
	 * Moves the canvas bounds container up by calling the movePaneUp method with the uuid of the current object.
	 * @returns {void}
	 * @deprecated Use `paneManager.movePaneUp()` instead
	 */
	public moveUp(): void {
		this.canvasBoundsContainer.movePaneUp(this.uuid);
	}

	/**
	 * Moves the canvas bounds container down by calling the movePaneDown method with the uuid of the current object.
	 * @returns {void}
	 * @deprecated Use `paneManager.movePaneDown()` instead
	 */
	public moveDown(): void {
		this.canvasBoundsContainer.movePaneDown(this.uuid);
	}

	/**
	 * Checks if the current pane can move up.
	 * @returns {boolean} - Returns true if the current pane can move up, otherwise false.
	 * @deprecated Use `paneManager.canMovePaneUp()` instead
	 */
	public canMoveUp(): boolean {
		const firstVisiblePane = firstOf(
			this.canvasBoundsContainer.panesOrder.filter(
				uuid => this.canvasBoundsContainer.graphsHeightRatio[uuid] > 0,
			),
		);
		return this.uuid !== firstVisiblePane && this.visible;
	}

	/**
	 * Checks if the current pane can move down.
	 *
	 * @returns {boolean} - Returns true if the current pane is not the last one in the canvasBoundsContainer, otherwise returns false.
	 * @deprecated Use `paneManager.canMovePaneDown()` instead
	 */
	public canMoveDown(): boolean {
		const lastVisiblePane = lastOf(
			this.canvasBoundsContainer.panesOrder.filter(
				uuid => this.canvasBoundsContainer.graphsHeightRatio[uuid] > 0,
			),
		);
		return this.uuid !== lastVisiblePane && this.visible;
	}

	public valueFormatter = (value: Unit, dataSeries?: DataSeriesModel) => {
		return this.mainExtent.valueFormatter(value, dataSeries);
	};

	get regularFormatter() {
		return this.mainExtent.formatters.regular;
	}

	/**
	 * Sets the pane value formatters for the current instance.
	 * @param {YExtentFormatters} formatters - The pane value formatters to be set.
	 */
	setPaneValueFormatters(formatters: YExtentFormatters) {
		this.mainExtent.setValueFormatters(formatters);
	}

	/**
	 * Returns the regular value from Y coordinate.
	 * @param {number} y - The Y coordinate.
	 * @returns {number} - The regular value.
	 */
	regularValueFromY(y: number) {
		return this.mainExtent.regularValueFromY(y);
	}
}

export interface YExtentFormatters {
	regular: (value: number) => string;
	percent?: (value: number, dataSeries?: DataSeriesModel) => string;
	logarithmic?: (value: number) => string;
}
