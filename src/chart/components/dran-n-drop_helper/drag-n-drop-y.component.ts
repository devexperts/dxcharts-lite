/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { ChartPanComponent } from '../pan/chart-pan.component';

import {
	defaultDragComponentOptions,
	DragComponentOptions,
	DragNDropComponent,
	DragNDropComponentCallbacks,
} from './drag-n-drop.component';

export class DragNDropYComponent extends DragNDropComponent {
	constructor(
		hitTest: HitBoundsTest,
		dragCallbacks: DragNDropComponentCallbacks,
		canvasInputListener: CanvasInputListenerComponent,
		chartPanComponent: ChartPanComponent,
		dragComponentOptions: DragComponentOptions = defaultDragComponentOptions,
	) {
		super(hitTest, dragCallbacks, canvasInputListener, chartPanComponent, dragComponentOptions);
	}

	/**
	 * This method activates the component and adds subscriptions to the canvasInputListener.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();
		this.addRxSubscription(this.canvasInputListener.observeYDragStart(this.hitTest).subscribe(this.onDragStart));
		this.addRxSubscription(this.canvasInputListener.observeYDrag().subscribe(this.onDragTick));
		this.addRxSubscription(this.canvasInputListener.observeYDragEnd().subscribe(this.onDragEnd));
	}

	/**
	 * This method overrides the doDeactivate method of the parent class and calls the parent method before executing its own code.
	 * It is a protected method, which means it can only be accessed within the class and its subclasses.
	 */
	protected doDeactivate() {
		super.doDeactivate();
	}
}
