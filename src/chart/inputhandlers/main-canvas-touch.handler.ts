/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartBaseElement } from '../model/chart-base-element';
import { CanvasInputListenerComponent } from '../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../model/scale.model';

/**
 * Handles chart touch events.
 */
export class MainCanvasTouchHandler extends ChartBaseElement {
	// 2 candles indexes touched by 2 fingers when pinching
	private touchedCandleIndexes: [number, number] = [0, 0];
	constructor(
		private scaleModel: ScaleModel,
		private canvasInputListeners: CanvasInputListenerComponent,
		private mainCanvasParent: Element,
	) {
		super();
	}

	/**
	 * Activates canvas input listeners for touch start and touch move events.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		this.addRxSubscription(
			this.canvasInputListeners.observeTouchStart().subscribe(e => this.handleTouchStartEvent(e)),
		);
		this.addRxSubscription(
			this.canvasInputListeners.observeTouchMove().subscribe(e => this.handleTouchMoveEvent(e)),
		);
	}

	/**
	 * Handles the touch start event.
	 * @param {TouchEvent} e - The touch event.
	 * @returns {void}
	 */
	private handleTouchStartEvent(e: TouchEvent) {
		if (e.touches.length === 2) {
			// @ts-ignore
			// TODO rework this
			this.touchedCandleIndexes = this.getXPositions(e).map(x => this.scaleModel.fromX(x));
		}
	}

	/**
     * Handles touch move event
     * @param {TouchEvent} e - The touch event object
     * @returns {void}
     
    private handleTouchMoveEvent(e: TouchEvent): void {
        if (e.touches.length === 2) {
            this.pinchHandler(this.touchedCandleIndexes, this.getXPositions(e));
        }
    }*/
	private handleTouchMoveEvent(e: TouchEvent): void {
		if (e.touches.length === 2) {
			this.pinchHandler(this.touchedCandleIndexes, this.getXPositions(e));
		}
	}
	/**
	 * Gets candle positions touched by user in pixels.
	 * @param e - touch event with "touches" array
	 * @return Array<number> - X coordinates of touches on the canvas
	 */
	private getXPositions(e: TouchEvent): [number, number] {
		const rect = this.mainCanvasParent.getBoundingClientRect();
		const result: [number, number] = [0, 0];
		// TO DO: check if this body calculations can potentially works wrong in widget
		const scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
		for (let i = 0, l = e.touches.length; i < l; i++) {
			const touch = e.touches[i];
			result[i] = touch.pageX - rect.left - scrollLeft;
		}
		return result;
	}

	/**
	 * Handles the pinch gesture on the chart.
	 * @param {Array<number>} candleIndexes - An array of two numbers representing the indexes of the first and last visible candles on the chart.
	 * @param {number[]} touchPositions - An array of two numbers representing the touch positions on the screen.
	 * @returns {void}
	 */
	public pinchHandler(candleIndexes: Array<number>, touchPositions: number[]): void {
		const first =
			(touchPositions[0] * candleIndexes[1] - touchPositions[1] * candleIndexes[0]) /
			(touchPositions[0] - touchPositions[1]);
		const last =
			first +
			((candleIndexes[0] - candleIndexes[1]) / (touchPositions[0] - touchPositions[1])) *
				this.scaleModel.getBounds().width;
		this.scaleModel.setXScale(first, last);
	}
}
