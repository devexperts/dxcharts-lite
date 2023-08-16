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

export class DragNDropXComponent extends DragNDropComponent {
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
	 * This method is used to activate the component and add the necessary subscriptions to the canvasInputListener.
	 * It calls the super method doActivate() and then adds the following subscriptions:
	 * - observeXDragStart() subscription with hitTest() as parameter and onDragStart() as callback function
	 * - observeXDrag() subscription with onDragTick() as callback function
	 * - observeXDragEnd() subscription with onDragEnd() as callback function
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();
		this.addRxSubscription(this.canvasInputListener.observeXDragStart(this.hitTest).subscribe(this.onDragStart));
		this.addRxSubscription(this.canvasInputListener.observeXDrag().subscribe(this.onDragTick));
		this.addRxSubscription(this.canvasInputListener.observeXDragEnd().subscribe(this.onDragEnd));
	}

	/**
	 * This method overrides the doDeactivate method of the parent class and calls it using the super keyword.
	 * It is used to deactivate the current object and perform any necessary cleanup operations.
	 * @protected
	 */
	protected doDeactivate() {
		super.doDeactivate();
	}
}
