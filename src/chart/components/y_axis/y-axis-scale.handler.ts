/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { CanvasBoundsContainer, CanvasElement, HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { YAxisConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { Pixel, Unit } from '../../model/scaling/viewport.model';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { DragNDropYComponent } from '../dran-n-drop_helper/drag-n-drop-y.component';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { ScaleModel } from '../../model/scale.model';

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

	constructor(
		private bus: EventBus,
		private config: YAxisConfig,
		panning: ChartPanComponent,
		private scale: ScaleModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private bounds: CanvasBoundsContainer,
		private hitTest: HitBoundsTest,
		private autoScaleCallback: (auto: boolean) => void,
	) {
		super();
		// drag to Y-scale and double click to auto scale
		if (config.customScale) {
			const dragPredicate = () => config.type !== 'percent' && config.visible;
			const dragNDropYComponent = new DragNDropYComponent(
				hitTest,
				{
					onDragTick: callIfPredicateTrue(this.onYDragTick, dragPredicate),
					onDragStart: callIfPredicateTrue(this.onYDragStart, dragPredicate),
					onDragEnd: callIfPredicateTrue(this.onYDragEnd, dragPredicate),
				},
				canvasInputListener,
				panning,
				{
					disableChartPanning: false,
				},
			);
			this.addChildEntity(dragNDropYComponent);
		}
	}

	protected doActivate(): void {
		if (this.config.customScaleDblClick) {
			this.addRxSubscription(
				this.canvasInputListener.observeDbClick(this.hitTest).subscribe(() => {
					this.autoScaleCallback(true);
					this.bus.fireDraw();
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
		this.lastYPxHeight = this.bounds.getBounds(CanvasElement.Y_AXIS).height;
	};

	private onYDragTick = (dragInfo: DragInfo) => {
		const { delta: absoluteYDelta } = dragInfo;
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
		this.autoScaleCallback(false);
		this.scale.setYScale(newYStart, newYEnd);
		this.bus.fireDraw();
	};

	private onYDragEnd = () => {
		this.yAxisDragEndSubject.next();
	};
}

const callIfPredicateTrue =
	(fun: (...args: any[]) => void, predicate: () => boolean) =>
	(...args: unknown[]) =>
		predicate() && fun(...args);
