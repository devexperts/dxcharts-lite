/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { FullChartConfig } from '../chart.config';
import { CanvasModel } from '../model/canvas.model';
import EventBus from '../events/event-bus';
import { EVENT_DRAW, EVENT_RESIZED } from '../events/events';
import { uuid } from '../utils/uuid.utils';
import { animationFrameThrottledPrior } from '../utils/perfomance/request-animation-frame-throttle.utils';

export type PickedDOMRect = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;

/**
 * Tracks chart element size and emits events whenever it changes.
 */
export class ChartResizeHandler {
	private elementResizeDetector: ResizeObserver;
	public previousBCR: PickedDOMRect | undefined = undefined;
	private animFrameId = `resize_${uuid()}`;
	public canvasResized = new Subject<PickedDOMRect>();
	constructor(
		private frameElement: HTMLElement,
		private resizerElement: HTMLElement,
		private bus: EventBus,
		private canvasModels: CanvasModel[],
		private config?: FullChartConfig,
	) {
		this.elementResizeDetector = new ResizeObserver(() => this.handleResize());
	}
	/**
	 * Subscribe to resize events
	 * Use it to update chart animations.
	 * TODO activate / deactivate cycle
	 */
	subscribeResize() {
		this.elementResizeDetector.observe(this.resizerElement);
	}

	/**
	 * Handles the resize event by throttling the animation frame and firing updates.
	 * @private
	 * @function
	 * @returns {void}
	 */
	private handleResize() {
		animationFrameThrottledPrior(this.animFrameId, () => this.fireUpdates());
	}

	/**
	 * Updates the canvas models and fires events if the bounding client rectangle of the resizer element has changed.
	 * @function
	 * @name fireUpdates
	 * @memberof ClassName
	 * @returns {void}
	 */
	public fireUpdates() {
		const resizerElementBCR = this.resizerElement.getBoundingClientRect();
		const newBCR = {
			x: resizerElementBCR.x,
			y: resizerElementBCR.y,
			width: resizerElementBCR.width,
			height: resizerElementBCR.height,
		};
		if (!this.config) {
			this.frameElement.style.height = this.resizerElement.clientHeight + 'px';
		}
		if (this.previousBCR === undefined || this.isBCRDimensionsDiffer(this.previousBCR, newBCR)) {
			this.previousBCR = newBCR;
			this.canvasModels.forEach(model => this.previousBCR && model.updateDPR(this.previousBCR));
			this.canvasResized.next(newBCR);
			this.bus.fire(EVENT_RESIZED, newBCR);
			this.bus.fire(EVENT_DRAW);
		}
	}

	/**
	 * Checks if the dimensions of two PickedDOMRect objects are different.
	 * @param {PickedDOMRect} previousBCR - The previous bounding client rectangle.
	 * @param {PickedDOMRect} newBCR - The new bounding client rectangle.
	 * @returns {boolean} - Returns true if the dimensions are different, false otherwise.
	 */
	private isBCRDimensionsDiffer(previousBCR: PickedDOMRect, newBCR: PickedDOMRect): boolean {
		return previousBCR.height !== newBCR.height || previousBCR.width !== newBCR.width;
	}

	/**
	 * Unsubscribes from the element resize detector to stop updating the chart animation.
	 * @function
	 * @name unsubscribeAnimationUpdate
	 * @memberof ChartResizeHandler
	 * @instance
	 * @returns {void}
	 */
	unsubscribeAnimationUpdate() {
		if (this.resizerElement) {
			try {
				this.elementResizeDetector.unobserve(this.resizerElement);
			} catch (e) {
				console.warn('ChartResizeHandler.ts, unsubscribeAnimationUpdate failed');
			}
		}
	}

	// TODO a lot of unnecessary DRAW events fired before canvas has actual size
	/**
	 * Checks if the canvas has been resized by comparing the previous bounding client rect with the current one.
	 * @returns {boolean} - Returns true if the canvas has been resized, false otherwise.
	 */
	wasResized(): boolean {
		return this.previousBCR !== undefined;
	}
}
