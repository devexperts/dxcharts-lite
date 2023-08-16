/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { CanvasAnimation } from '../../animation/canvas-animation';
import { CHART_UUID, CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { FullChartConfig } from '../../chart.config';
import { DrawingManager } from '../../drawers/drawing-manager';
import EventBus from '../../events/event-bus';
import { CrossEventProducerComponent } from '../../inputhandlers/cross-event-producer.component';
import { CanvasInputListenerComponent, Point } from '../../inputlisteners/canvas-input-listener.component';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement, ChartEntity } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import { AtLeastOne } from '../../utils/object.utils';
import { uuid as generateUuid } from '../../utils/uuid.utils';
import { ChartBaseModel } from '../chart/chart-base.model';
import { createHighLowOffsetCalculator } from '../chart/data-series.high-low-provider';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { BarResizerComponent } from '../resizer/bar-resizer.component';
import { YExtentCreationOptions, createDefaultYExtentHighLowProvider } from './extent/y-extent-component';
import { PaneHitTestController } from './pane-hit-test.controller';
import { PaneComponent } from './pane.component';
import { Unsubscriber } from '../../utils/function.utils';

export class PaneManager extends ChartBaseElement {
	public paneComponents: Record<string, PaneComponent> = {};
	public panesChangedSubject: Subject<Record<string, PaneComponent>> = new Subject();
	public hitTestController: PaneHitTestController;
	/**
	 * Returns order of panes in the chart from top to bottom.
	 */
	public get panesOrder() {
		return this.canvasBoundsContainer.panesOrder;
	}
	constructor(
		private chartBaseModel: ChartBaseModel<'candle'>,
		private userInputListenerComponents: ChartEntity[],
		private eventBus: EventBus,
		private mainScaleModel: ScaleModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private config: FullChartConfig,
		private canvasAnimation: CanvasAnimation,
		private canvasInputListener: CanvasInputListenerComponent,
		private drawingManager: DrawingManager,
		private dataSeriesCanvasModel: CanvasModel,
		private cursorHandler: CursorHandler,
		private crossEventProducer: CrossEventProducerComponent,
		public chartPanComponent: ChartPanComponent,
		private mainCanvasModel: CanvasModel,
	) {
		super();
		this.hitTestController = new PaneHitTestController(this.paneComponents, this.dataSeriesCanvasModel);

		const mainPane = this.createPane(CHART_UUID, {
			useDefaultHighLow: false,
			scaleModel: this.mainScaleModel,
			useDefaultYAxis: false,
		});
		mainPane.mainYExtentComponent.scaleModel.autoScaleModel.setHighLowProvider(
			'series',
			createDefaultYExtentHighLowProvider(mainPane.mainYExtentComponent),
		);
		mainScaleModel.autoScaleModel.setHighLowPostProcessor(
			'offsets',
			createHighLowOffsetCalculator(() => this.mainScaleModel.getOffsets()),
		);
	}

	private addBounds(uuid: string, order?: number): Unsubscriber {
		this.canvasBoundsContainer.addPaneBounds(uuid, order);
		return () => this.canvasBoundsContainer.removedPaneBounds(uuid);
	}

	/**
	 * Adds a resizer to the canvas bounds container for the given uuid.
	 * @param {string} uuid - The uuid of the pane to which the resizer is to be added.
	 * @returns {BarResizerComponent} - The BarResizerComponent instance that was added to the userInputListenerComponents array.
	 */
	private addResizer(uuid: string) {
		const resizerHT = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.PANE_UUID_RESIZER(uuid), {
			extensionY: this.config.components.paneResizer.dragZone,
		});
		const dragTick = () => {
			this.canvasBoundsContainer.resizePaneVertically(uuid, this.canvasInputListener.getCurrentPoint().y);
			this.eventBus.fireDraw([this.mainCanvasModel.canvasId, 'overDataSeriesCanvas']);
		};
		const resizerId = CanvasElement.PANE_UUID_RESIZER(uuid);
		const barResizerComponent = new BarResizerComponent(
			resizerId,
			() => this.canvasBoundsContainer.getBounds(resizerId),
			resizerHT,
			dragTick,
			this.chartPanComponent,
			this.mainCanvasModel,
			this.drawingManager,
			this.canvasInputListener,
			this.canvasAnimation,
			this.config,
			this.canvasBoundsContainer,
		);
		this.userInputListenerComponents.push(barResizerComponent);
		return barResizerComponent;
	}

	/**
	 * Returns the pane component that contains the given point.
	 * @param {Point} point - The point to check.
	 * @returns {PaneComponent | undefined} - The pane component that contains the point or undefined if no pane contains it.
	 */
	public getPaneIfHit(point: Point): PaneComponent | undefined {
		const panes = Object.values(this.paneComponents);
		return panes.find(p =>
			this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.PANE_UUID(p.uuid))(point.x, point.y),
		);
	}

	/**
	 * Creates sub-plot on the chart with y-axis
	 * @param uuid
	 * @returns
	 */
	public createPane(uuid = generateUuid(), options?: AtLeastOne<YExtentCreationOptions>): PaneComponent {
		if (this.paneComponents[uuid] !== undefined) {
			return this.paneComponents[uuid];
		}

		const paneComponent: PaneComponent = new PaneComponent(
			this.chartBaseModel,
			this.hitTestController,
			this.config,
			this.mainScaleModel,
			this.drawingManager,
			this.chartPanComponent,
			this.mainCanvasModel,
			this.canvasInputListener,
			this.userInputListenerComponents,
			this.canvasAnimation,
			this.cursorHandler,
			this.eventBus,
			this.canvasBoundsContainer,
			uuid,
			this.dataSeriesCanvasModel,
			options,
		);

		// TODO: is resizer should be added always?
		if (this.config.components.paneResizer.visible) {
			paneComponent.addChildEntity(this.addResizer(uuid));
		}

		paneComponent.addSubscription(this.addBounds(uuid, options?.order));
		paneComponent.addSubscription(this.addCursors(uuid));
		paneComponent.addSubscription(this.crossEventProducer.subscribeMouseOverHT(uuid, paneComponent.ht));

		this.paneComponents[uuid] = paneComponent;
		paneComponent.activate();
		this.recalculateState();
		paneComponent.mainYExtentComponent.scaleModel.autoScale(true);
		this.panesChangedSubject.next(this.paneComponents);
		return paneComponent;
	}

	/**
	 * Removes pane from the chart and all related components
	 * @param uuid
	 */
	public removePane(uuid: string) {
		const pane = this.paneComponents[uuid];
		if (pane !== undefined) {
			pane.disable();
			pane.yExtentComponents.forEach(yExtentComponent => yExtentComponent.disable());
			delete this.paneComponents[uuid];
			this.recalculateState();
			this.panesChangedSubject.next(this.paneComponents);
		}
	}

	/**
	 * Adds cursors to the chart elements based on the provided uuid and cursor type.
	 * @private
	 * @param {string} uuid - The unique identifier for the chart element.
	 * @param {string} [cursor=this.config.components.chart.cursor] - The type of cursor to be added to the chart element.
	 * @returns {void}
	 */
	private addCursors(uuid: string, cursor: string = this.config.components.chart.cursor) {
		const pane = CanvasElement.PANE_UUID(uuid);
		const paneResizer = CanvasElement.PANE_UUID_RESIZER(uuid);

		this.cursorHandler.setCursorForCanvasEl(pane, cursor);
		this.config.components.paneResizer.visible &&
			this.cursorHandler.setCursorForCanvasEl(
				paneResizer,
				this.config.components.paneResizer.cursor,
				this.config.components.paneResizer.dragZone,
			);

		return () => {
			this.cursorHandler.removeCursorForCanvasEl(pane);
			this.config.components.paneResizer.visible && this.cursorHandler.removeCursorForCanvasEl(paneResizer);
		};
	}

	/**
	 * Recalculates the zoom Y of all pane components and fires a draw event on the event bus.
	 * @function
	 * @name recalculateState
	 * @memberof PaneManager
	 * @returns {void}
	 */
	public recalculateState() {
		Object.values(this.paneComponents).forEach(state => state.scaleModel.recalculateZoomY());
		this.eventBus.fireDraw([this.mainCanvasModel.canvasId, 'overDataSeriesCanvas']);
	}
}
