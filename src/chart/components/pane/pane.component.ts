/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { distinctUntilChanged } from 'rxjs/operators';
import { CanvasAnimation } from '../../animation/canvas-animation';
import {
	areBoundsChanged,
	CanvasBoundsContainer,
	CanvasElement,
	HitBoundsTest,
} from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { ChartConfigComponentsYAxis, FullChartConfig } from '../../chart.config';
import { DrawingManager } from '../../drawers/drawing-manager';
import EventBus from '../../events/event-bus';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { Bounds } from '../../model/bounds.model';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement, ChartEntity } from '../../model/chart-base-element';
import { DataSeriesModel, defaultValueFormatter } from '../../model/data-series.model';
import { ScaleModel, SyncedByXScaleModel } from '../../model/scale.model';
import { Unit } from '../../model/scaling/viewport.model';
import { firstOf, lastOf } from '../../utils/array.utils';
import { Unsubscriber } from '../../utils/function.utils';
import { AtLeastOne, cloneUnsafe } from '../../utils/object.utils';
import { ChartBaseModel } from '../chart/chart-base.model';
import { createCandlesOffsetProvider } from '../chart/data-series.high-low-provider';
import { DragNDropYComponent } from '../dran-n-drop_helper/drag-n-drop-y.component';
import { GridComponent } from '../grid/grid.component';
import { PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { NumericYAxisLabelsGenerator } from '../y_axis/numeric-y-axis-labels.generator';
import { YAxisScaleHandler } from '../y_axis/y-axis-scale.handler';
import { YAxisDrawer } from '../y_axis/y-axis.drawer';
import {
	createDefaultYExtentHighLowProvider,
	YExtentComponent,
	YExtentCreationOptions,
} from './extent/y-extent-component';
import { PaneHitTestController } from './pane-hit-test.controller';
import { YAxisBaseLabelsModel } from '../y_axis/y-axis-base-labels.model';

// TODO should be replaced with YAxisComponent
export interface ExtentYAxis {
	labelsGenerator: NumericYAxisLabelsGenerator;
	drawer: YAxisDrawer;
	yAxisScaleHandler: YAxisScaleHandler;
	state: ChartConfigComponentsYAxis;
	unsub: Unsubscriber;
}

export class PaneComponent extends ChartBaseElement {
	private _paneOrder = 0;
	/**
	 * Pane hit test (without Y-Axis and resizer)
	 */
	public ht: HitBoundsTest;

	public yExtentComponents: YExtentComponent[] = [];

	get scaleModel() {
		return this.mainYExtentComponent.scaleModel;
	}

	get dataSeries() {
		return this.yExtentComponents.flatMap(c => Array.from(c.dataSeries));
	}

	public mainYExtentComponent: YExtentComponent;

	constructor(
		private chartBaseModel: ChartBaseModel<'candle'>,
		private hitTestController: PaneHitTestController,
		private config: FullChartConfig,
		private mainScaleModel: ScaleModel,
		private drawingManager: DrawingManager,
		private chartPanComponent: ChartPanComponent,
		private mainCanvasModel: CanvasModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private userInputListenerComponents: ChartEntity[],
		private canvasAnimation: CanvasAnimation,
		private cursorHandler: CursorHandler,
		public eventBus: EventBus,
		// TODO in future there will be yAxisComponents with getBounds method
		private canvasBoundsContainer: CanvasBoundsContainer,
		public readonly uuid: string,
		public readonly dataSeriesCanvasModel: CanvasModel,
		options?: AtLeastOne<YExtentCreationOptions>,
	) {
		super();
		const yExtentComponent = this.createExtentComponent(options);
		this.mainYExtentComponent = yExtentComponent;
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
					this.yExtentComponents.forEach(c => c.scaleModel.recalculateZoomY());
					this.dataSeriesCanvasModel.fireDraw();
				}),
		);
	}

	/**
	 * Creates a Y-axis component for the chart.
	 * @private
	 * @param {string} uuid - The unique identifier of the chart pane.
	 * @param {ScaleModel} scaleModel - The scale model for the chart.
	 * @param {(value: number) => string} formatter - The function to format the Y-axis labels.
	 * @param {Unsubscriber[]} subs - The array of unsubscriber functions.
	 * @param {number | null} increment - The increment value for the Y-axis labels.
	 * @returns {[NumericYAxisLabelsGenerator, YAxisDrawer, YAxisScaleHandler]} - An array containing the Y-axis labels generator, Y-axis drawer, and Y-axis scale handler.
	 */
	private createYAxisComponent(
		uuid: string,
		extentIdx: number,
		scaleModel: ScaleModel,
		formatter: (value: number) => string,
		increment: number | null,
	): ExtentYAxis {
		// todo hack until each pane has its own y-axis
		const yAxisState = cloneUnsafe(this.config.components.yAxis);
		const labelsGenerator = new NumericYAxisLabelsGenerator(
			increment,
			undefined,
			scaleModel,
			formatter,
			() => 'regular',
			() => 1,
			yAxisState.labelHeight,
		);
		const canvasEl = CanvasElement.PANE_UUID_Y_AXIS(uuid, extentIdx);
		const drawer = new YAxisDrawer(
			this.config,
			yAxisState,
			this.mainCanvasModel,
			() => labelsGenerator.generateNumericLabels(),
			() => this.canvasBoundsContainer.getBounds(canvasEl),
			() => this.config.components.yAxis.visible,
			scaleModel.toY.bind(scaleModel),
		);
		this.drawingManager.addDrawerAfter(drawer, canvasEl, 'Y_AXIS');

		yAxisState.type = 'regular';
		const yAxisScaleHandler = new YAxisScaleHandler(
			this.eventBus,
			yAxisState,
			this.chartPanComponent,
			scaleModel,
			this.canvasInputListener,
			this.canvasBoundsContainer,
			this.canvasBoundsContainer.getBoundsHitTest(canvasEl),
			auto => scaleModel.autoScale(auto),
		);
		const yAxisBaseLabelsModel = new YAxisBaseLabelsModel(scaleModel, labelsGenerator, this.canvasBoundsContainer);
		yAxisBaseLabelsModel.activate();
		this.userInputListenerComponents.push(yAxisScaleHandler);
		return {
			labelsGenerator,
			drawer,
			yAxisScaleHandler,
			// TODO replace with separate y-axis component after y-axis refactor
			state: this.config.components.yAxis,
			unsub: () => {
				this.drawingManager.removeDrawerByName(canvasEl);
				yAxisBaseLabelsModel.disable();
			},
		};
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
		scaleModel: ScaleModel,
		yAxisLabelsGenerator: NumericYAxisLabelsGenerator,
	) {
		const gridComponent = new GridComponent(
			this.mainCanvasModel,
			scaleModel,
			this.config,
			`PANE_${uuid}_grid_drawer`,
			this.drawingManager,
			() => this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(uuid)),
			() => this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(uuid)),
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
	private createYPanHandler(uuid: string, scaleModel: ScaleModel): [Unsubscriber, DragNDropYComponent] {
		const dragNDropComponent = this.chartPanComponent.chartAreaPanHandler.registerChartYPanHandler(
			scaleModel,
			this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.PANE_UUID(uuid)),
		);
		return [
			() => {
				this.chartPanComponent.chartAreaPanHandler.removeChildEntity(dragNDropComponent);
				dragNDropComponent.disable();
			},
			dragNDropComponent,
		];
	}

	private addCursors(extentIdx: number): Unsubscriber {
		const paneYAxis = CanvasElement.PANE_UUID_Y_AXIS(this.uuid, extentIdx);
		this.cursorHandler.setCursorForCanvasEl(paneYAxis, this.config.components.yAxis.cursor);
		return () => this.cursorHandler.removeCursorForCanvasEl(paneYAxis);
	}

	public createExtentComponent(options?: AtLeastOne<YExtentCreationOptions>) {
		const extentIdx = this.yExtentComponents.length;
		const getBounds = () => this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(this.uuid));
		const scaleModel =
			options?.scaleModel ??
			new SyncedByXScaleModel(this.mainScaleModel, this.config, getBounds, this.canvasAnimation);

		// in future there should real YAxisComponent
		const yAxisComp =
			options?.useDefaultYAxis ?? true
				? this.createYAxisComponent(
						this.uuid,
						extentIdx,
						scaleModel,
						options?.paneFormatters?.regular ?? defaultValueFormatter,
						options?.increment ?? null,
				  )
				: undefined;

		const [unsub, dragNDrop] = this.createYPanHandler(this.uuid, scaleModel);
		const yExtentComponent = new YExtentComponent(
			this.uuid,
			extentIdx,
			this,
			this.chartBaseModel,
			this.canvasBoundsContainer,
			this.hitTestController,
			this.dataSeriesCanvasModel,
			scaleModel,
			yAxisComp,
			dragNDrop,
		);

		yExtentComponent.addSubscription(unsub);
		yExtentComponent.addSubscription(this.addCursors(extentIdx));

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

		if (yAxisComp) {
			const gridComponent = this.createGridComponent(this.uuid, scaleModel, yAxisComp.labelsGenerator);
			yExtentComponent.addChildEntity(gridComponent);
		}
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
			c.scaleModel.doAutoScale();
			c.yAxisComponent?.labelsGenerator.generateNumericLabels();
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
			extent.dataSeries.forEach(s => s.moveToExtent(this.mainYExtentComponent));
			extent.disable();
		}
		this.canvasBoundsContainer.updateYAxisWidths();
		this.yExtentComponents = [this.mainYExtentComponent];
	}

	public getYAxisBounds = (): Bounds => {
		return this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID_Y_AXIS(this.uuid));
	};

	/**
	 * Returns the bounds of the pane component.
	 */
	public getBounds(): Bounds {
		return this.mainYExtentComponent.getBounds();
	}

	/**
	 * Hides the pane by removing its bounds from the canvasBoundsContainer and firing a draw event.
	 * @function
	 * @name hide
	 * @memberof PaneComponent
	 * @returns {void}
	 */
	public hide(): void {
		this._paneOrder = this.canvasBoundsContainer.panesOrder.indexOf(this.uuid);
		this.canvasBoundsContainer.removedPaneBounds(this.uuid);
		this.eventBus.fireDraw();
	}

	/**
	 * Adds the bounds of the pane to the canvas bounds container and fires a draw event.
	 * @function
	 * @name show
	 * @memberof PaneComponent
	 * @returns {void}
	 */
	public show(): void {
		this.canvasBoundsContainer.addPaneBounds(this.uuid, this._paneOrder);
		this.eventBus.fireDraw();
	}

	/**
	 * Creates a new DataSeriesModel object.
	 * @returns {DataSeriesModel} - The newly created DataSeriesModel object.
	 */
	public createDataSeries(): DataSeriesModel {
		return this.mainYExtentComponent?.createDataSeries();
	}

	/**
	 * Adds a new data series to the chart.
	 * @param {DataSeriesModel} series - The data series to be added.
	 * @returns {void}
	 */
	public addDataSeries(series: DataSeriesModel): void {
		this.mainYExtentComponent.addDataSeries(series);
		this.updateView();
	}

	/**
	 * Removes a data series from the chart.
	 *
	 * @param {DataSeriesModel} series - The data series to be removed.
	 * @returns {void}
	 */
	public removeDataSeries(series: DataSeriesModel): void {
		this.mainYExtentComponent.removeDataSeries(series);
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
	 */
	public moveUp(): void {
		this.canvasBoundsContainer.movePaneUp(this.uuid);
	}

	/**
	 * Moves the canvas bounds container down by calling the movePaneDown method with the uuid of the current object.
	 * @returns {void}
	 */
	public moveDown(): void {
		this.canvasBoundsContainer.movePaneDown(this.uuid);
	}

	/**
	 * Checks if the current pane can move up.
	 * @returns {boolean} - Returns true if the current pane can move up, otherwise false.
	 */
	public canMoveUp(): boolean {
		const firstPane = firstOf(this.canvasBoundsContainer.panesOrder);
		return this.uuid !== firstPane;
	}

	/**
	 * Checks if the current pane can move down.
	 *
	 * @returns {boolean} - Returns true if the current pane is not the last one in the canvasBoundsContainer, otherwise returns false.
	 */
	public canMoveDown(): boolean {
		const lastPane = lastOf(this.canvasBoundsContainer.panesOrder);
		return this.uuid !== lastPane;
	}

	public valueFormatter = (value: Unit, dataSeries?: DataSeriesModel) => {
		return this.mainYExtentComponent.valueFormatter(value, dataSeries);
	};

	get regularFormatter() {
		return this.mainYExtentComponent.formatters.regular;
	}

	/**
	 * Sets the pane value formatters for the current instance.
	 * @param {YExtentFormatters} formatters - The pane value formatters to be set.
	 */
	setPaneValueFormatters(formatters: YExtentFormatters) {
		this.mainYExtentComponent.setValueFormatters(formatters);
	}

	/**
	 * Returns the regular value from Y coordinate.
	 * @param {number} y - The Y coordinate.
	 * @returns {number} - The regular value.
	 */
	regularValueFromY(y: number) {
		return this.mainYExtentComponent.regularValueFromY(y);
	}
}

export interface YExtentFormatters {
	regular: (value: number) => string;
	percent?: (value: number, dataSeries?: DataSeriesModel) => string;
	logarithmic?: (value: number) => string;
}
