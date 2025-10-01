/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { animationFrameScheduler } from 'rxjs';
import { throttleTime, filter, debounceTime } from 'rxjs/operators';
import { CanvasAnimation } from '../../../../../animation/canvas-animation';
import { CanvasBoundsContainer, CanvasElement } from '../../../../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../../../../chart.config';
import EventBus from '../../../../../events/event-bus';
import { CanvasInputListenerComponent, Point } from '../../../../../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../../../../../model/scale.model';
import { pixelsToUnits } from '../../../../../model/scaling/viewport.model';
import { deviceDetector } from '../../../../../utils/device/device-detector.utils';

import { ONE_FRAME_MS } from '../../../../../utils/numeric-constants.utils';
import { HitTestCanvasModel } from '../../../../../model/hit-test-canvas.model';
import { Subscription } from 'rxjs';
import { EVENT_RESIZED } from '../../../../../events/events';
import { ChartPanComponent } from '../../../../../components/pan/chart-pan.component';
import {
	DEFAULT_THROTTLE_MS,
	LARGE_SCREEN_PIXEL_THRESHOLD,
	LARGE_SCREEN_THROTTLE_MS,
	LOW_WHEEL_EVENTS_THRESHOLD,
	SAFARI_THROTTLE_MS,
	WHEEL_MONITORING_INTERVAL_MS,
} from '../../safari-performance.model';
import { ChartAreaPanHandler, ChartPanningOptions } from '../../../../../components/chart/chart-area-pan.handler';

/**
 * SafariChartAreaPanHandler is a class that handles the panning and zooming of the chart area for Safari.
 */
export class SafariChartAreaPanHandler extends ChartAreaPanHandler {
	protected currentPoint: Point = { x: 0, y: 0 };
	public xDraggedCandlesDelta: number = 0;
	public lastXStart: number = 0;
	public wheelThrottleTime: number = ONE_FRAME_MS;
	private wheelSubscription: Subscription | null = null;
	private initFrameId: number | null = null;
	private isActivated: boolean = false;

	private lastWheelTime: number = 0;
	private wheelCount: number = 0;
	private consecutiveLowWheelEvents: number = 0;

	public chartPanningOptions: ChartPanningOptions = { horizontal: true, vertical: true };

	constructor(
		protected bus: EventBus,
		protected config: FullChartConfig,
		protected scale: ScaleModel,
		protected canvasInputListener: CanvasInputListenerComponent,
		protected canvasBoundsContainer: CanvasBoundsContainer,
		protected canvasAnimation: CanvasAnimation,
		protected chartPanComponent: ChartPanComponent,
		protected hitTestCanvasModel: HitTestCanvasModel,
	) {
		super(
			bus,
			config,
			scale,
			canvasInputListener,
			canvasBoundsContainer,
			canvasAnimation,
			chartPanComponent,
			hitTestCanvasModel,
		);
	}

	/**
	 * This method is used to activate the zoom functionality of the canvas. It extends the doActivate method of the parent class.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		if (this.isActivated) {
			return;
		}
		this.isActivated = true;

		super.doActivate();

		this.canvasInputListener.initializeRectCache();

		this.createWheelSubscription();

		this.initFrameId = requestAnimationFrame(() => {
			this.bus.fireDraw();
		});

		this.addRxSubscription(
			this.chartPanComponent.chartBaseModel.dataPrependSubject
				.asObservable()
				.subscribe(({ prependedCandlesWidth }) => {
					this.lastXStart += prependedCandlesWidth;
				}),
		);

		this.addRxSubscription(
			this.bus
				.observe(EVENT_RESIZED)
				.pipe(debounceTime(100))
				.subscribe(() => {
					if (this.scale && typeof this.scale.haltAnimation === 'function') {
						this.scale.haltAnimation();
					}
				}),
		);
	}

	/**
	 * Creates wheel subscription with optimized throttling
	 */
	private createWheelSubscription(): void {
		if (this.wheelSubscription) {
			this.wheelSubscription.unsubscribe();
			this.wheelSubscription = null;
		}

		const allPanesHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES);

		const canvasBounds = this.canvasBoundsContainer.getBounds(CanvasElement.CANVAS);
		const totalPixels = canvasBounds.width * canvasBounds.height;

		if (totalPixels > 0) {
			if (totalPixels > LARGE_SCREEN_PIXEL_THRESHOLD) {
				this.wheelThrottleTime = LARGE_SCREEN_THROTTLE_MS;
			} else {
				this.wheelThrottleTime = SAFARI_THROTTLE_MS;
			}
		} else {
			this.wheelThrottleTime = DEFAULT_THROTTLE_MS;
		}

		this.wheelSubscription = this.canvasInputListener
			.observeWheel(allPanesHitTest)
			.pipe(
				filter(() => this.chartPanningOptions.horizontal && this.chartPanningOptions.vertical),
				filter((e: WheelEvent) => {
					const device = deviceDetector();
					if (device === 'apple') {
						const minDelta = 1.0;
						return Math.abs(e.deltaY) > minDelta || Math.abs(e.deltaX) > minDelta;
					}
					return true;
				}),
				throttleTime(this.wheelThrottleTime, animationFrameScheduler, { trailing: true, leading: true }),
			)
			.subscribe(e => {
				const now = performance.now();
				if (!this.lastWheelTime) {
					this.lastWheelTime = now;
					this.wheelCount = 0;
				}
				this.wheelCount++;

				if (now - this.lastWheelTime > WHEEL_MONITORING_INTERVAL_MS) {
					const wheelEventsPerSecond = Math.round((this.wheelCount * 1000) / (now - this.lastWheelTime));

					if (wheelEventsPerSecond < LOW_WHEEL_EVENTS_THRESHOLD) {
						this.consecutiveLowWheelEvents++;
						if (this.consecutiveLowWheelEvents >= 1) {
							this.triggerPerformanceCleanup();
							this.consecutiveLowWheelEvents = 0;
						}
					} else {
						this.consecutiveLowWheelEvents = 0;
					}

					this.lastWheelTime = now;
					this.wheelCount = 0;
				}

				const device = deviceDetector();
				const direction = device === 'apple' || device === 'mobile' ? -1 : 1;
				const deltaX = 0 + e.deltaX * direction;
				const deltaY = 0 + e.deltaY * direction;

				if (e.ctrlKey) {
					const zoomSensitivity = this.calculateDynamicSesitivity(e, this.config.scale.zoomSensitivity.wheel);
					this.zoomXHandler(e, zoomSensitivity);
					this.bus.fireDraw();
					return;
				}
				if (deltaY !== 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
					const zoomSensitivity = this.calculateDynamicSesitivity(e, this.config.scale.zoomSensitivity.wheel);
					this.zoomXHandler(e, zoomSensitivity);
					this.bus.fireDraw();
				}
				if (deltaX !== 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
					const unitsDelta = pixelsToUnits(deltaX, this.scale.zoomX);
					this.scale.moveXStart(this.scale.xStart - unitsDelta);
					this.bus.fireDraw();
					return;
				}
			});

		this.addRxSubscription(this.wheelSubscription);
	}

	/**
	 * Manual cleanup trigger for immediate performance recovery
	 */
	public triggerPerformanceCleanup(): void {
		window.dispatchEvent(new Event('resize'));

		if (window.gc) {
			window.gc();
		}

		if (this.initFrameId) {
			cancelAnimationFrame(this.initFrameId);
			this.initFrameId = null;
		}

		if (this.scale && typeof this.scale.haltAnimation === 'function') {
			this.scale.haltAnimation();
		}

		this.consecutiveLowWheelEvents = 0;
		this.wheelCount = 0;
		this.lastWheelTime = 0;
	}

	protected doDeactivate(): void {
		if (this.wheelSubscription) {
			this.wheelSubscription.unsubscribe();
			this.wheelSubscription = null;
		}

		if (this.initFrameId) {
			cancelAnimationFrame(this.initFrameId);
			this.initFrameId = null;
		}

		this.isActivated = false;

		super.doDeactivate();
	}
}
