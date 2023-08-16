/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../../model/scale.model';
import { Pixel, Unit } from '../../model/scaling/viewport.model';
import { ChartModel } from '../chart/chart.model';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { DragNDropXComponent } from '../dran-n-drop_helper/drag-n-drop-x.component';
import { ChartPanComponent } from '../pan/chart-pan.component';

/**
 * Handles the mouse drag on X axis - to zoom the viewport horizontally.
 * @doc-tags scaling,zoom,viewport
 */
export class XAxisScaleHandler extends ChartBaseElement {
	lastXStart: Unit = 0;
	lastXWidth: Unit = 0;
	lastXPxWidth: Pixel = 0;

	constructor(
		private scaleModel: ScaleModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private chartPanComponent: ChartPanComponent,
		private chartModel: ChartModel,
	) {
		super();

		const dragNDropXComponent = new DragNDropXComponent(
			this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.X_AXIS),
			{
				onDragStart: this.onXDragStart,
				onDragTick: this.onXDragTick,
			},
			this.canvasInputListener,
			this.chartPanComponent,
			{
				disableChartPanning: false,
			},
		);

		this.addChildEntity(dragNDropXComponent);
	}

	/**
	 * This method is used to activate the canvas input listener and add a subscription to it.
	 * It calls the parent class's doActivate method and then subscribes to the canvasInputListener's observeDbClick method.
	 * The subscription is added to the RxJS subscription list.
	 * When the subscription is triggered, the doBasicScale method is called.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			this.canvasInputListener
				.observeDbClick(this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.X_AXIS))
				.subscribe(() => this.chartModel.doBasicScale()),
		);

		this.addRxSubscription(
			this.chartModel.candlesPrependSubject.subscribe(
				({ prependedCandlesWidth }) => (this.lastXStart += prependedCandlesWidth),
			),
		);
	}

	private onXDragStart = () => {
		this.lastXStart = this.scaleModel.xStart;
		this.lastXWidth = this.scaleModel.xEnd - this.scaleModel.xStart;
		const bounds = this.canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
		this.lastXPxWidth = bounds.width - this.canvasInputListener.currentPoint.x;
	};

	private onXDragTick = (dragInfo: DragInfo) => {
		const { delta: absoluteXDelta } = dragInfo;
		const newPxWidth = this.lastXPxWidth - absoluteXDelta;
		// cursor goes beyond x-axis - maximum scale is reached
		if (newPxWidth < 0) {
			return;
		}
		const xZoomMult = this.lastXPxWidth / newPxWidth;
		const newWidth = this.lastXWidth * xZoomMult;
		const newXStart = this.lastXStart + (this.lastXWidth - newWidth);
		this.scaleModel.setXScale(newXStart, this.scaleModel.xEnd);
	};
}
