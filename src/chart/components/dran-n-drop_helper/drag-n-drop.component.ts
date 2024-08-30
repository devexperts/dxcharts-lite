/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasInputListenerComponent, Point } from '../../inputlisteners/canvas-input-listener.component';
import { ChartPanComponent } from '../pan/chart-pan.component';

export interface DragInfo {
	delta: number;
	draggedPixels: number;
}

export interface DragComponentOptions {
	dragPredicate: () => boolean;
}

export interface DragNDropComponentCallbacks {
	onDragStart?: (point: Point) => void;
	onDragTick: (dragInfo: DragInfo) => void;
	onDragEnd?: (draggedPixels: number) => void;
}

export const defaultDragComponentOptions: DragComponentOptions = {
	dragPredicate: () => true,
};

export class DragNDropComponent extends ChartBaseElement {
	dragging: boolean = false;
	draggedPixels: number = 0;
	constructor(
		protected hitTest: HitBoundsTest,
		protected dragCallbacks: DragNDropComponentCallbacks,
		protected canvasInputListener: CanvasInputListenerComponent,
		protected chartPanComponent: ChartPanComponent,
		private dragComponentOptions: DragComponentOptions,
	) {
		super();
	}

	protected onDragStart = (point: Point) => {
		if (this.dragComponentOptions.dragPredicate()) {
			this.dragging = true;
			this.draggedPixels = 0;
			this.dragCallbacks.onDragStart && this.dragCallbacks.onDragStart(point);
		}
	};

	protected onDragTick = (yDelta: number) => {
		if (this.dragComponentOptions.dragPredicate()) {
			if (this.dragging) {
				this.draggedPixels += yDelta;
				this.dragCallbacks.onDragTick({
					delta: yDelta,
					draggedPixels: this.draggedPixels,
				});
			}
		}
	};

	protected onDragEnd = () => {
		if (this.dragComponentOptions.dragPredicate()) {
			if (this.dragging) {
				this.dragging = false;
				this.dragCallbacks.onDragEnd && this.dragCallbacks.onDragEnd(this.draggedPixels);
			}
		}
	};
}
