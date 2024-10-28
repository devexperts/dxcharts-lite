/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasBoundsContainer, CanvasElement, HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../../model/scale.model';
import { Pixel, Unit } from '../../model/scaling/viewport.model';
import { ChartModel } from '../chart/chart.model';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { DragNDropXComponent } from '../dran-n-drop_helper/drag-n-drop-x.component';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';

// if you drag full X width from left to right - you will have x3 zoom, and vice-versa
const FULL_X_WIDTH_ZOOM_FACTOR = 3;

/**
 * Handles the mouse drag on X axis - to zoom the viewport horizontally.
 * @doc-tags scaling,zoom,viewport
 */
export class XAxisScaleHandler extends ChartBaseElement {
	lastXStart: Unit = 0;
	lastXEnd: Unit = 0;
	lastXWidth: Unit = 0;
	lastXPxWidth: Pixel = 0;

	private dblClickCallback: () => void;

	private touches: TouchList | undefined;
	private dblTapCallback: () => void;

	constructor(
		private scale: ScaleModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private chartPanComponent: ChartPanComponent,
		private chartModel: ChartModel,
		private hitTest: HitBoundsTest,
		private hitTestCanvasModel: HitTestCanvasModel,
	) {
		super();

		this.dblClickCallback = () => chartModel.doBasicScale();
		this.dblTapCallback = () => chartModel.doBasicScale();

		const dragNDropXComponent = new DragNDropXComponent(
			hitTest,
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
			this.canvasInputListener.observeDbClick(this.hitTest).subscribe(() => this.dblClickCallback()),
		);
		this.addRxSubscription(
			this.canvasInputListener.observeDbTap(this.hitTest).subscribe(() => {
				// apply dbl tap only if single finger taps are made
				if (this.touches && this.touches?.length > 1) {
					this.touches = undefined;
					return;
				}

				this.dblTapCallback();
			}),
		);
		this.addRxSubscription(
			this.canvasInputListener.observeTouchStart(this.hitTest).subscribe(e => {
				this.touches = e.touches;
			}),
		);
		this.addRxSubscription(
			this.chartModel.candlesPrependSubject.subscribe(
				({ prependedCandlesWidth }) => (this.lastXStart += prependedCandlesWidth),
			),
		);
	}

	private onXDragStart = () => {
		this.lastXStart = this.scale.xStart;
		this.lastXEnd = this.scale.xEnd;
		this.lastXWidth = this.scale.xEnd - this.scale.xStart;
		const bounds = this.canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
		this.lastXPxWidth = bounds.width - this.canvasInputListener.currentPoint.x;
		// Stop redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(false);
	};

	private onXDragTick = (dragInfo: DragInfo) => {
		let { delta: absoluteXDelta } = dragInfo;

		// mouse click or single tap drag
		if (!this.touches || this.touches.length === 1) {
			const newPxWidth = this.lastXPxWidth - absoluteXDelta;
			// cursor goes beyond x-axis - maximum scale is reached
			if (newPxWidth < 0) {
				return;
			}
			const xZoomMult = this.lastXPxWidth / newPxWidth;
			const newWidth = this.lastXWidth * xZoomMult;
			const newXStart = this.lastXStart + (this.lastXWidth - newWidth);
			this.scale.setXScale(newXStart, this.scale.xEnd);
			return;
		}

		// if multitouch - take the first two touch events and apply delta the following way:
		// the touch on the left keeps the initial delta because left => right gesture
		// the touch on the right has the reversed delta because the gesture is right => left
		if (this.touches.length > 1) {
			const left = Math.min(this.touches[0].clientX, this.touches[1].clientX);
			absoluteXDelta = left === this.touches[0].clientX ? absoluteXDelta : -absoluteXDelta;

			let xZoomMult;
			if (absoluteXDelta < 0) {
				xZoomMult = 1 / (1 + (-absoluteXDelta / this.lastXPxWidth) * (FULL_X_WIDTH_ZOOM_FACTOR - 1));
			} else {
				xZoomMult = 1 + (absoluteXDelta / this.lastXPxWidth) * (FULL_X_WIDTH_ZOOM_FACTOR - 1);
			}

			const newXWidth = this.lastXWidth * xZoomMult;
			const delta = (newXWidth - this.lastXWidth) / 2;
			const newXStart = this.lastXStart - delta;
			const newXEnd = this.lastXEnd + delta;
			if (this.lastXStart !== newXStart || this.lastXEnd !== newXEnd) {
				this.scale.setXScale(newXStart, newXEnd);
			}
		}
	};

	private onXDragEnd = () => {
		// Continue redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(true);
	};

	public setDblTapCallback = (cb: () => void) => (this.dblTapCallback = cb);

	public setDblClickCallback = (cb: () => void) => (this.dblClickCallback = cb);
}
