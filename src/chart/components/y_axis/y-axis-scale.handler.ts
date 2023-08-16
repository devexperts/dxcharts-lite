/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { CanvasBoundsContainer, CanvasElement, HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { ChartConfigComponentsYAxis } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { Pixel, Unit, ViewportModel } from '../../model/scaling/viewport.model';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { DragNDropYComponent } from '../dran-n-drop_helper/drag-n-drop-y.component';
import { ChartPanComponent } from '../pan/chart-pan.component';

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
		config: ChartConfigComponentsYAxis,
		chartPanComponent: ChartPanComponent,
		private viewportModel: ViewportModel,
		canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		hitTest: HitBoundsTest,
		private autoScaleCallback: (auto: boolean) => void,
	) {
		super();
		// drag to Y-scale and double click to auto scale
		if (config.customScale) {
			const dragPredicate = () => config.type !== 'percent';
			const dragNDropYComponent = new DragNDropYComponent(
				hitTest,
				{
					onDragTick: callIfPredicateTrue(this.onYDragTick, dragPredicate),
					onDragStart: callIfPredicateTrue(this.onYDragStart, dragPredicate),
					onDragEnd: callIfPredicateTrue(this.onYDragEnd, dragPredicate),
				},
				canvasInputListener,
				chartPanComponent,
				{
					disableChartPanning: false,
				},
			);
			this.addChildEntity(dragNDropYComponent);

			if (config.customScaleDblClick) {
				canvasInputListener.observeDbClick(hitTest).subscribe(() => {
					autoScaleCallback(true);
					this.bus.fireDraw();
				});
			}
		}
	}

	private onYDragStart = () => {
		this.lastYStart = this.viewportModel.yStart;
		this.lastYEnd = this.viewportModel.yEnd;
		this.lastYHeight = this.viewportModel.yEnd - this.viewportModel.yStart;
		this.lastYPxHeight = this.canvasBoundsContainer.getBounds(CanvasElement.Y_AXIS).height;
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
		this.viewportModel.setYScale(newYStart, newYEnd);
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
