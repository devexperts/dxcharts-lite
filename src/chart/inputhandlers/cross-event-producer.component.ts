/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CanvasBoundsContainer, HitBoundsTest, HitBoundsTestOptionsPartial } from '../canvas/canvas-bounds-container';
import { CanvasInputListenerComponent } from '../inputlisteners/canvas-input-listener.component';
import { ChartBaseElement } from '../model/chart-base-element';
import { Unsubscriber } from '../utils/function.utils';
import { Pixel } from '../model/scaling/viewport.model';
import { Hover } from './hover-producer.component';
import { isMobile } from '../utils/device/browser.utils';

/**
 * [x, y, uuid - Unique identifier for the subscription]
 */
export type CrossEvent = [number, number, string];

interface CrossToolTouchInfo {
	// the placement of crosstool when it's set after long touch and further moving happens
	fixed: {
		x: Pixel;
		y: Pixel;
	};
	// // the placement of crosstool after touchMove and touchEnd happened
	temp: {
		x: Pixel;
		y: Pixel;
	};
	// true after longTouch event, initial movement and touchEnd happen
	isSet: boolean;
	/**
	 * additional flag to determine ordinary and long taps
	 * crosstool shouldn't be hidden after longtouch event even if coordinates are the same
	 * becomes true after touchStart and false after longTouchStart
	 */
	isCommonTap: boolean;
}

export class CrossEventProducerComponent extends ChartBaseElement {
	panesSubscriptions: Partial<Record<string, Subscription>> = {};
	public crossSubject: BehaviorSubject<CrossEvent | null> = new BehaviorSubject<CrossEvent | null>(null);
	// mobile specific crosstool hover and touch info
	public crossToolHover: Hover | null = null;
	public crossToolTouchInfo: CrossToolTouchInfo = {
		fixed: { x: 0, y: 0 },
		temp: { x: 0, y: 0 },
		isSet: false,
		isCommonTap: false,
	};
	constructor(
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
	) {
		super();
	}

	protected doActivate(): void {
		super.doActivate();
	}

	/**
	 * Emits a null value to the `cross` subject, effectively closing the current cross.
	 */
	public fireCrossClose() {
		this.crossSubject.next(null);
	}

	/**
	 * Unsubscribes from the mouse over event for a specific pane.
	 * @param {string} uuid - The unique identifier of the pane.
	 * @returns {void}
	 */
	public unsubscribeMouseOver(uuid: string) {
		this.panesSubscriptions[uuid]?.unsubscribe();
	}

	/**
	 * Subscribes to mouse over event on canvas elements.
	 * @param {string} uuid - Unique identifier for the subscription.
	 * @param {string[]} canvasElementNames - Array of canvas element names to subscribe to.
	 * @param {HitBoundsTestOptionsPartial} [options] - Optional hit bounds test options.
	 * @returns {Subscription} - Returns a subscription object.
	 */
	public subscribeMouseOver(
		uuid: string,
		canvasElementNames: string[],
		options?: HitBoundsTestOptionsPartial,
	): Unsubscriber {
		const hts = canvasElementNames.map(canvasElementName =>
			this.canvasBoundsContainer.getBoundsHitTest(canvasElementName, options),
		);
		const hitTest = (x: number, y: number) => hts.some(ht => ht(x, y));
		return this.subscribeMouseOverHT(uuid, hitTest);
	}

	/**
	 * Subscribes to mouse over event on a hit test area identified by uuid.
	 * @param {string} uuid - The unique identifier of the hit test area.
	 * @param {HitBoundsTest} hitTest - The hit test area.
	 * @returns {Subscription} - The subscription object.
	 */
	public subscribeMouseOverHT(uuid: string, hitTest: HitBoundsTest): Unsubscriber {
		const move$ = this.canvasInputListener.observeMouseMoveDocument();
		const mouseEnter$ = this.canvasInputListener.observeMouseEnter(hitTest);
		let closeHoverFired = false;
		const subscription = combineLatest([move$, mouseEnter$])
			.pipe(filter(([, enter]) => !closeHoverFired || (closeHoverFired && enter)))
			.subscribe(([point, enter]) => {
				if (enter) {
					const cross: CrossEvent = [point.x, point.y, uuid];
					this.crossSubject.next(cross);
					closeHoverFired = false;
				}
				// crosstool should be hidden if hovering nonpane only on desktop
				if (!enter && !isMobile()) {
					this.crossSubject.next(null);
					closeHoverFired = true;
				}
			});
		this.panesSubscriptions[uuid] = subscription;
		return () => subscription.unsubscribe();
	}
}
