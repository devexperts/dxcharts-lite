/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasAnimation } from '../../animation/canvas-animation';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../../model/scale.model';
import { ChartAreaPanHandler } from '../chart/chart-area-pan.handler';
import { BaseType, ChartBaseModel } from '../chart/chart-base.model';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';
import { MainCanvasTouchHandler } from '../../inputhandlers/main-canvas-touch.handler';
import { isSafari } from '../../utils/device/touchpad.utils';
import { SafariChartAreaPanHandler } from '../../utils/performance/safari/components/chart-area-pan.handler/safari-chart-area-pan.handler';

export class ChartPanComponent extends ChartBaseElement {
	public chartAreaPanHandler: ChartAreaPanHandler;
	public mainCanvasTouchHandler: MainCanvasTouchHandler;
	constructor(
		private eventBus: EventBus,
		private mainScale: ScaleModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private config: FullChartConfig,
		private canvasAnimation: CanvasAnimation,
		private canvasInputListener: CanvasInputListenerComponent,
		private mainCanvasParent: Element,
		public chartBaseModel: ChartBaseModel<BaseType>,
		private hitTestCanvasModel: HitTestCanvasModel,
	) {
		super();

		const chartAreaPanHandlerParams = [
			this.eventBus,
			this.config,
			this.mainScale,
			this.canvasInputListener,
			this.canvasBoundsContainer,
			this.canvasAnimation,
			this,
			this.hitTestCanvasModel,
		] as const;

		// Different performance logic for Safari because of browser specifics
		const chartAreaPanHandler = isSafari
			? new SafariChartAreaPanHandler(...chartAreaPanHandlerParams)
			: new ChartAreaPanHandler(...chartAreaPanHandlerParams);
		this.chartAreaPanHandler = chartAreaPanHandler;
		this.addChildEntity(this.chartAreaPanHandler);

		this.mainCanvasTouchHandler = new MainCanvasTouchHandler(
			this.chartAreaPanHandler,
			this.mainScale,
			this.canvasInputListener,
			this.mainCanvasParent,
			this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES),
		);
		this.addChildEntity(this.mainCanvasTouchHandler);
	}

	/**
	 * Activates user mouse handlers on main chart view.
	 * @function
	 * @name activateChartPanHandlers
	 * @memberof [object Object]
	 * @instance
	 * @returns {void}
	 */
	public activateChartPanHandlers() {
		this.activate();
	}

	/**
	 * Deactivates all the pan handlers of the chart.
	 */
	public deactivatePanHandlers() {
		this.deactivate();
	}

	public setChartPanningOptions(horizontal: boolean, vertical: boolean) {
		this.chartAreaPanHandler.chartPanningOptions = { horizontal, vertical };
	}
}
