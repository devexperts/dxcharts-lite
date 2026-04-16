/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { animationFrameScheduler, BehaviorSubject, identity } from 'rxjs';
import { distinctUntilChanged, switchMap, throttleTime } from 'rxjs/operators';
import { HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { ChartPanComponent } from '../pan/chart-pan.component';

import {
	defaultDragComponentOptions,
	DragComponentOptions,
	DragNDropComponent,
	DragNDropComponentCallbacks,
} from './drag-n-drop.component';
import { ONE_FRAME_MS } from '../../utils/numeric-constants.utils';

export class DragNDropXComponent extends DragNDropComponent {
	private shouldThrottleSubject: BehaviorSubject<boolean>;

	constructor(
		hitTest: HitBoundsTest,
		dragCallbacks: DragNDropComponentCallbacks,
		canvasInputListener: CanvasInputListenerComponent,
		chartPanComponent: ChartPanComponent,
		dragComponentOptions: DragComponentOptions = defaultDragComponentOptions,
		shouldThrottle?: boolean,
	) {
		super(hitTest, dragCallbacks, canvasInputListener, chartPanComponent, dragComponentOptions);

		this.shouldThrottleSubject = new BehaviorSubject<boolean>(!!shouldThrottle);
	}

	/**
	 * When true, X drag ticks are throttled to one animation frame (e.g. percent axis).
	 */
	public setShouldThrottle(value: boolean): void {
		this.shouldThrottleSubject.next(value);
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
		const dragThrottleTime = ONE_FRAME_MS;

		super.doActivate();
		this.addRxSubscription(this.canvasInputListener.observeXDragStart(this.hitTest).subscribe(this.onDragStart));
		this.addRxSubscription(
			this.shouldThrottleSubject
				.pipe(
					distinctUntilChanged(),
					switchMap(shouldThrottle =>
						this.canvasInputListener.observeXDrag().pipe(
							shouldThrottle
								? throttleTime(dragThrottleTime, animationFrameScheduler, {
										trailing: true,
										leading: true,
									})
								: identity,
						),
					),
				)
				.subscribe(this.onDragTick),
		);
		this.addRxSubscription(this.canvasInputListener.observeXDragEnd().subscribe(this.onDragEnd));
	}
}
