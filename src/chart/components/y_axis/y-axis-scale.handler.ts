/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import {
	CanvasBoundsContainer,
	CanvasElement,
	DEFAULT_MIN_PANE_HEIGHT,
	HitBoundsTest,
} from '../../canvas/canvas-bounds-container';
import { YAxisConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { Pixel, Unit } from '../../model/scaling/viewport.model';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { DragNDropYComponent } from '../dran-n-drop_helper/drag-n-drop-y.component';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { ScaleModel } from '../../model/scale.model';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';

// if you drag full Y height from top to bottom - you will have x3 zoom, and vice-versa
const FULL_Y_HEIGHT_ZOOM_FACTOR = 10;

/**
 * Handles the mouse drag on Y axis - to zoom the viewport vertically.
 * @doc-tags scaling,zoom,viewport
 */
export class YAxisScaleHandler extends ChartBaseElement {
	public yAxisDragEndSubject = new Subject<void>();

	lastYStart: Unit = 0;
	lastYEnd: Unit = 0;
	lastYHeight: Unit = 0;
	lastYPxHeight: Pixel = 0;

	private dragNDropYComponent: DragNDropYComponent | undefined;

	private dblClickCallback: () => void;

	private touches: TouchList | undefined;
	private dblTapCallback: () => void;

	constructor(
		private bus: EventBus,
		private config: YAxisConfig,
		panning: ChartPanComponent,
		private scale: ScaleModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private bounds: CanvasBoundsContainer,
		private hitTest: HitBoundsTest,
		private hitTestCanvasModel: HitTestCanvasModel,
	) {
		super();

		this.dblClickCallback = () => scale.autoScale(true);
		this.dblTapCallback = () => scale.autoScale(true);

		// drag to Y-scale and double click to auto scale
		if (config.customScale) {
			const dragNDropYComponent = new DragNDropYComponent(
				hitTest,
				{
					onDragTick: this.onYDragTick,
					onDragStart: this.onYDragStart,
					onDragEnd: this.onYDragEnd,
				},
				canvasInputListener,
				panning,
				{
					dragPredicate: () =>
						panning.chartAreaPanHandler.chartPanningOptions.vertical && config.type !== 'percent',
				},
			);
			this.addChildEntity(dragNDropYComponent);
			this.dragNDropYComponent = dragNDropYComponent;
		}
	}

	public isDragging(): boolean {
		if (!this.dragNDropYComponent) {
			return false;
		}
		return Math.abs(this.dragNDropYComponent.draggedPixels) > 0;
	}

	protected doActivate(): void {
		if (this.config.customScaleDblClick) {
			this.addRxSubscription(
				this.canvasInputListener.observeDbClick(this.hitTest).subscribe(() => {
					this.dblClickCallback();
					this.bus.fireDraw();
				}),
			);
			this.addRxSubscription(
				this.canvasInputListener.observeDbTap(this.hitTest).subscribe(() => {
					// apply dbl tap only if single finger taps are made
					if (this.touches && this.touches?.length > 1) {
						this.touches = undefined;
						return;
					}

					this.dblTapCallback();
					this.bus.fireDraw();
				}),
			);
			this.addRxSubscription(
				this.canvasInputListener.observeTouchStart(this.hitTest).subscribe(e => {
					this.touches = e.touches;
				}),
			);
		}
	}

	private onYDragStart = () => {
		// halt previous scale animation if drag is started
		this.scale.haltAnimation();
		this.lastYStart = this.scale.yStart;
		this.lastYEnd = this.scale.yEnd;
		this.lastYHeight = this.scale.yEnd - this.scale.yStart;
		this.lastYPxHeight = Math.max(this.bounds.getBounds(CanvasElement.Y_AXIS).height, DEFAULT_MIN_PANE_HEIGHT);
		// Stop redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(false);
	};

	private onYDragTick = (dragInfo: DragInfo) => {
		let { delta: absoluteYDelta } = dragInfo;

		// check how many touch events are at the axis
		// if multitouch - take the first two and apply delta the following way:
		// the touch above keeps the initial delta because top => bottom gesture
		// the touch below has the reversed delta because the gesture is bottom => top
		if (this.touches && this.touches.length > 1) {
			const top = Math.min(this.touches[0].clientY, this.touches[1].clientY);
			absoluteYDelta = top === this.touches[0].clientY ? absoluteYDelta : -absoluteYDelta;
		}

		// 1/3..3
		let zoomYMult;
		if (absoluteYDelta < 0) {
			// 1/3..1
			zoomYMult = 1 / (1 + (-absoluteYDelta / this.lastYPxHeight) * (FULL_Y_HEIGHT_ZOOM_FACTOR - 1));
		} else {
			// 1..3
			zoomYMult = 1 + (absoluteYDelta / this.lastYPxHeight) * (FULL_Y_HEIGHT_ZOOM_FACTOR - 1);
		}

		const newYHeight = this.lastYHeight * zoomYMult;
		const delta = (newYHeight - this.lastYHeight) / 2;
		const newYStart = this.lastYStart - delta;
		const newYEnd = this.lastYEnd + delta;
		if (this.lastYStart !== newYStart || this.lastYEnd !== newYEnd) {
			this.scale.setYScale(newYStart, newYEnd);
			this.scale.state.auto = false;
			this.bus.fireDraw();
		}
	};

	private onYDragEnd = () => {
		this.yAxisDragEndSubject.next();
		// Continue redrawing hit test
		this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(true);
	};

	public setDblTapCallback = (cb: () => void) => (this.dblTapCallback = cb);

	public setDblClickCallback = (cb: () => void) => (this.dblClickCallback = cb);
}
