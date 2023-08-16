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
	disableChartPanning: boolean;
}

export interface DragNDropComponentCallbacks {
	onDragStart?: (point: Point) => void;
	onDragTick: (dragInfo: DragInfo) => void;
	onDragEnd?: (draggedPixels: number) => void;
}

export const defaultDragComponentOptions: DragComponentOptions = {
	disableChartPanning: true,
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

	/**
	 * Calls the parent class's doActivate method and performs any additional activation logic.
	 * This method is protected and can only be accessed by the class itself and its subclasses.
	 */
	protected doActivate() {
		super.doActivate();
	}

	/**
	 * This method overrides the doDeactivate method of the parent class and calls it using the super keyword.
	 * It is a protected method that can only be accessed within the class and its subclasses.
	 * This method is responsible for deactivating the current object.
	 */
	protected doDeactivate() {
		super.doDeactivate();
	}

	protected onDragStart = (point: Point) => {
		this.dragging = true;
		this.draggedPixels = 0;
		this.dragCallbacks.onDragStart && this.dragCallbacks.onDragStart(point);
		this.dragComponentOptions.disableChartPanning && this.chartPanComponent.deactivatePanHandlers();
	};

	protected onDragTick = (yDelta: number) => {
		if (this.dragging) {
			this.draggedPixels += yDelta;
			this.dragCallbacks.onDragTick({
				delta: yDelta,
				draggedPixels: this.draggedPixels,
			});
		}
	};

	protected onDragEnd = () => {
		if (this.dragging) {
			this.dragging = false;
			this.dragCallbacks.onDragEnd && this.dragCallbacks.onDragEnd(this.draggedPixels);
			this.dragComponentOptions.disableChartPanning && this.chartPanComponent.activateChartPanHandlers();
		}
	};
}
