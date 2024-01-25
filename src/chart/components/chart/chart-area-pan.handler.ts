/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { merge, animationFrameScheduler } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { CanvasAnimation, VIEWPORT_ANIMATION_ID } from '../../animation/canvas-animation';
import { CanvasBoundsContainer, CanvasElement, HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { AutoScaleDisableOnDrag, FullChartConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { MainCanvasTouchHandler } from '../../inputhandlers/main-canvas-touch.handler';
import { CanvasInputListenerComponent, Point } from '../../inputlisteners/canvas-input-listener.component';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import { pixelsToUnits } from '../../model/scaling/viewport.model';
import { deviceDetector } from '../../utils/device/device-detector.utils';
import { getTouchpadSensitivity, touchpadDetector } from '../../utils/device/touchpad.utils';
import { DragNDropXComponent } from '../dran-n-drop_helper/drag-n-drop-x.component';
import { DragNDropYComponent } from '../dran-n-drop_helper/drag-n-drop-y.component';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';

export interface ChartWheelEvent {
	readonly originalEvent: WheelEvent;
	readonly candleIdx: number;
}

/**
 * ChartAreaPanHandler is a class that handles the panning and zooming of the chart area.
 * It extends the ChartBaseElement class and has the following properties:
 * @property {MainCanvasTouchHandler} touchHandler - An instance of the MainCanvasTouchHandler class.
 * @property {Point} currentPoint - An object that represents the current point of the chart area.
 * @property {number} xDraggedCandlesDelta - A number that represents the number of candles delta changed during X dragging.
 * @property {number} lastXStart - A number that represents the last X start position.
 * @property {number} lastYStart - A number that represents the last Y start position.
 * @property {number} wheelTrottleTime - A number that represents the time in ms for the wheel throttle.
 * @constructor
 * @param {EventBus} bus - An instance of the EventBus class.
 * @param {FullChartConfig} config - An instance of the FullChartConfig class.
 * @param {ScaleModel} scaleModel - An instance of the ScaleModel class.
 * @param {Element} mainCanvasParent - The parent element of the main canvas.
 * @param {CanvasInputListenerComponent} canvasInputListener - An instance of the CanvasInputListenerComponent class.
 * @param {CanvasBoundsContainer} canvasBoundsContainer - An instance of the CanvasBoundsContainer class.
 * @param {CanvasAnimation} canvasAnimation - An instance of the CanvasAnimation class.
 * @param {ChartPanComponent} chartPanComponent - An instance of the ChartPanComponent class.
 
*/
export class ChartAreaPanHandler extends ChartBaseElement {
	private readonly touchHandler: MainCanvasTouchHandler;
	private currentPoint: Point = { x: 0, y: 0 };
	// number of candles delta changed during X dragging: 1, 5 or -3 for ex.
	xDraggedCandlesDelta = 0;
	lastXStart = 0;
	wheelThrottleTime = 15; // in ms
	private disableChartPanning = { horizontal: false, vertical: false };

	constructor(
		private bus: EventBus,
		private config: FullChartConfig,
		private scale: ScaleModel,
		private mainCanvasParent: Element,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private canvasAnimation: CanvasAnimation,
		private chartPanComponent: ChartPanComponent,
		private hitTestCanvasModel: HitTestCanvasModel,
	) {
		super();
		this.touchHandler = new MainCanvasTouchHandler(this.scale, this.canvasInputListener, this.mainCanvasParent);

		const allPanesHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES);

		//#region drag-n-drop logic
		const dragNDropXComponent = new DragNDropXComponent(
			allPanesHitTest,
			{
				onDragStart: this.onXDragStart,
				onDragTick: this.onXDragTick,
				onDragEnd: this.onXDragEnd,
			},
			this.canvasInputListener,
			this.chartPanComponent,
			{
				disableChartPanning: () => this.disableChartPanning.horizontal,
			},
		);

		this.addChildEntity(dragNDropXComponent);
		//#endregion
	}

	setDisableChartPanning(horizontal: boolean, vertical: boolean) {
		this.disableChartPanning = { horizontal, vertical };
	}

	/**
	 * It observes the wheel event on all panes of the canvas and throttles it to the specified time.
	 * It then calculates the zoom sensitivity based on whether the event was triggered by a touchpad or not.
	 * If the zoomToCursor configuration is set to true, it calculates the viewport percentage based on the zoomCanvasOffset and canvas width.
	 * It then calls the zoomXToPercent method of the scaleModel to zoom in or out based on the zoomIn parameter.
	 * If the zoomToCursor configuration is set to false, it calls the zoomXToEnd method of the scaleModel to zoom in or out based on the zoomIn parameter.
	 * Finally, it fires the draw event of the bus to redraw the canvas.
	 * @param {WheelEvent} e - Wheel event
	 * @returns {void}
	 */
	private zoomXHandler = (e: WheelEvent, zoomSensitivity: number) => {
		const zoomIn = e.deltaY < 0;

		if (this.config.scale.zoomToCursor) {
			const b = this.canvasBoundsContainer.getBounds(CanvasElement.CANVAS);
			const canvasW = b.width;
			const zoomCanvasOffset = e.offsetX;
			// 0.5 - zoom middle exactly
			// 0..0.5 - zoom to left side
			// 0.5..1 - zoom to right side
			const viewportPercent = zoomCanvasOffset / canvasW;
			this.scale.zoomXToPercent(viewportPercent, zoomIn, false, zoomSensitivity);
		} else {
			this.scale.zoomXToEnd(zoomIn, zoomSensitivity);
		}
		this.bus.fireDraw();
	};

	/**
	 * This method is used to activate the zoom functionality of the canvas. It extends the doActivate method of the parent class.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();
		//#region hit tests
		const allPanesHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES);
		//#endregion
		this.addRxSubscription(
			merge(
				this.canvasInputListener.observeWheel(allPanesHitTest),
				this.canvasInputListener.observePinch(allPanesHitTest),
			)
				.pipe(throttleTime(this.wheelThrottleTime, animationFrameScheduler, { trailing: true, leading: true }))
				.subscribe(e => {
					const isTouchpad = touchpadDetector(e);
					const zoomSensitivity = isTouchpad
						? getTouchpadSensitivity(
								this.config.components.yAxis.type,
								this.config.scale.zoomSensitivity.pinch,
						  )
						: this.config.scale.zoomSensitivity.wheel;
					this.zoomXHandler(e, zoomSensitivity);
				}),
		);

		this.addRxSubscription(
			this.canvasInputListener
				.observeScrollGesture()
				.pipe(throttleTime(this.wheelThrottleTime, animationFrameScheduler, { trailing: true, leading: true }))
				.subscribe((e: WheelEvent) => {
					let direction = -1;
					const device = deviceDetector();
					if (device === 'apple' || device === 'mobile') {
						direction = 1;
					}
					let deltaX = 0;
					let deltaY = 0;
					deltaX += e.deltaX * direction;
					deltaY += e.deltaY * -direction;

					if (deltaX !== 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
						const unitsDelta = pixelsToUnits(deltaX, this.scale.zoomX);
						this.scale.moveXStart(this.scale.xStart - unitsDelta);
					} else if (deltaY !== 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
						const zoomSensitivity = getTouchpadSensitivity(
							this.config.components.yAxis.type,
							this.config.scale.zoomSensitivity.glide,
						);
						this.zoomXHandler(e, zoomSensitivity);
					}
					this.bus.fireDraw();
				}),
		);

		this.addRxSubscription(
			this.chartPanComponent.chartBaseModel.dataPrependSubject
				.asObservable()
				.subscribe(({ prependedCandlesWidth }) => {
					this.lastXStart += prependedCandlesWidth;
				}),
		);

		this.touchHandler.activate();
		this.addSubscription(this.touchHandler.deactivate.bind(this.touchHandler));
	}

	/**
	 * Registers a handler for panning the chart along the Y-axis.
	 * @param {ScaleModel} scaleModel - The scale model of the extent.
	 * @param {HitBoundsTest} hitTest - The hit test of the pane.
	 * @returns {DragNDropYComponent} - The drag and drop component for panning the chart along the Y-axis.
	 */
	public registerChartYPanHandler(scale: ScaleModel, hitTest: HitBoundsTest) {
		// we can have multiple extents which can have different yStarts, so we need to store last yStart for each extent
		let lastYStart = scale.yStart;
		// disable all pan handlers when hover data series
		const onYDragStart = () => {
			this.canvasAnimation.forceStopAnimation(VIEWPORT_ANIMATION_ID);
			this.currentPoint = { x: 0, y: 0 };
			lastYStart = scale.yStart;
		};

		const onYDragTick = (dragInfo: DragInfo) => {
			const { delta: absoluteDelta } = dragInfo;
			this.currentPoint.y = absoluteDelta;
			if (scale.state.auto) {
				if (shouldDisableAutoScale(this.currentPoint, scale.state.autoScaleDisableOnDrag)) {
					scale.autoScale(false);
				}
			} else {
				const unitsDelta = pixelsToUnits(scale.state.inverse ? -absoluteDelta : absoluteDelta, scale.zoomY);
				scale.moveYStart(lastYStart + unitsDelta);
			}
		};

		const onYDragEnd = () => {
			// Continue redrawing hit test
			this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(true);
		};

		const dragNDropYComponent = new DragNDropYComponent(
			hitTest,
			{
				onDragTick: onYDragTick,
				onDragStart: onYDragStart,
				onDragEnd: onYDragEnd,
			},
			this.canvasInputListener,
			this.chartPanComponent,
			{
				disableChartPanning: () => this.disableChartPanning.vertical,
			},
		);
		this.addChildEntity(dragNDropYComponent);
		return dragNDropYComponent;
	}

	private onXDragStart = () => {
		this.canvasAnimation.forceStopAnimation(VIEWPORT_ANIMATION_ID);
		this.xDraggedCandlesDelta = 0;
		this.lastXStart = this.scale.xStart;
		// Stop redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(false);
	};

	private onXDragTick = (dragInfo: DragInfo) => {
		const { delta: absoluteXDelta } = dragInfo;
		this.currentPoint.x = absoluteXDelta;
		const unitsDelta = pixelsToUnits(absoluteXDelta, this.scale.zoomX);
		this.scale.moveXStart(this.lastXStart - unitsDelta);
		this.bus.fireDraw();
	};

	private onXDragEnd = () => {
		// Continue redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(true);
	};
}

/**
 * This function calculates angle between current point and point(0, 0), and compares the result with config values
 * @param point
 * @param config
 *
 * @doc-tags chart-core,auto-scale,y-axis
 */
export const shouldDisableAutoScale = (point: Point, config: Required<AutoScaleDisableOnDrag>): boolean => {
	if (!config.enabled) {
		return false;
	}
	const absY = Math.abs(point.y);
	const lenProduct = (Math.abs(point.x) ** 2 + absY ** 2) ** 0.5;
	const angle = Math.abs(Math.acos(absY / lenProduct));
	return absY > config.yDiff && angle < config.edgeAngle;
};
