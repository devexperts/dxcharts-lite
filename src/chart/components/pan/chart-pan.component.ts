/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasAnimation } from '../../animation/canvas-animation';
import { CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { ChartBaseElement, ChartEntity } from '../../model/chart-base-element';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../../model/scale.model';
import { ChartAreaPanHandler } from '../chart/chart-area-pan.handler';
import { BaseType, ChartBaseModel } from '../chart/chart-base.model';

export class ChartPanComponent extends ChartBaseElement {
	public chartPanComponents: Array<ChartEntity> = [];
	public chartAreaPanHandler: ChartAreaPanHandler;
	constructor(
		private eventBus: EventBus,
		private mainScaleModel: ScaleModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private config: FullChartConfig,
		private canvasAnimation: CanvasAnimation,
		private canvasInputListener: CanvasInputListenerComponent,
		private mainCanvasParent: Element,
		public chartBaseModel: ChartBaseModel<BaseType>,
	) {
		super();
		this.chartAreaPanHandler = new ChartAreaPanHandler(
			this.eventBus,
			this.config,
			this.mainScaleModel,
			this.mainCanvasParent,
			this.canvasInputListener,
			this.canvasBoundsContainer,
			this.canvasAnimation,
			this,
		);
		this.chartPanComponents.push(this.chartAreaPanHandler);
	}

	/**
	 * Activates the chart pan handlers.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		this.activateChartPanHandlers();
	}

	/**
	 * This method is used to deactivate the pan handlers.
	 * @returns {void}
	 * @protected
	 */
	protected doDeactivate(): void {
		this.deactivatePanHandlers();
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
		this.chartPanComponents.forEach(c => c.activate());
	}

	/**
	 * Deactivates all the pan handlers of the chart.
	 */
	public deactivatePanHandlers() {
		this.chartPanComponents.forEach(c => c.deactivate());
	}
}
