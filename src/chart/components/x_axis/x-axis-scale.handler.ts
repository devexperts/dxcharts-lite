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
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';

/**
 * Handles the mouse drag on X axis - to zoom the viewport horizontally.
 * @doc-tags scaling,zoom,viewport
 */
export class XAxisScaleHandler extends ChartBaseElement {
	lastXStart: Unit = 0;
	lastXWidth: Unit = 0;
	lastXPxWidth: Pixel = 0;

	private dblClickCallback: () => void;
	private dblTapCallback: () => void;

	constructor(
		private scale: ScaleModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private chartPanComponent: ChartPanComponent,
		private chartModel: ChartModel,
		private hitTestCanvasModel: HitTestCanvasModel,
	) {
		super();

		this.dblClickCallback = () => chartModel.doBasicScale();
		this.dblTapCallback = () => chartModel.doBasicScale();

		const dragNDropXComponent = new DragNDropXComponent(
			this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.X_AXIS),
			{
				onDragStart: this.onXDragStart,
				onDragTick: this.onXDragTick,
				onDragEnd: this.onXDragEnd,
			},
			this.canvasInputListener,
			this.chartPanComponent,
			{
				dragPredicate: () => chartPanComponent.chartAreaPanHandler.chartPanningOptions.horizontal,
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
				.subscribe(() => this.dblClickCallback()),
		);
		this.addRxSubscription(
			this.canvasInputListener
				.observeDbTap(this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.X_AXIS))
				.subscribe(() => this.dblTapCallback()),
		);
		this.addRxSubscription(
			this.chartModel.candlesPrependSubject.subscribe(
				({ prependedCandlesWidth }) => (this.lastXStart += prependedCandlesWidth),
			),
		);
	}

	private onXDragStart = () => {
		this.lastXStart = this.scale.xStart;
		this.lastXWidth = this.scale.xEnd - this.scale.xStart;
		const bounds = this.canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
		this.lastXPxWidth = bounds.width - this.canvasInputListener.currentPoint.x;
		// Stop redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(false);
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
		this.scale.setXScale(newXStart, this.scale.xEnd);
	};

	private onXDragEnd = () => {
		// Continue redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(true);
	};

	public setDblTapCallback = (cb: () => void) => this.dblTapCallback = cb;

	public setDblClickCallback = (cb: () => void) => this.dblClickCallback = cb;
}
