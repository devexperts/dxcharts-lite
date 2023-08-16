/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject } from 'rxjs';
import { ChartConfigComponentsCrossTool } from '../../chart.config';
import { CrossEventProducerComponent } from '../../inputhandlers/cross-event-producer.component';
import { Hover, HoverProducerComponent } from '../../inputhandlers/hover-producer.component';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CHART_UUID } from '../../canvas/canvas-bounds-container';

export type CrossToolType = 'cross-and-labels' | 'only-labels' | 'none' | string;

export interface CrossToolHover {
	x: number;
	y: number;
	time: string;
	paneId: string;
}

export class CrossToolModel extends ChartBaseElement {
	// the main hover object which will be presented on UI
	currentHoverSubject: BehaviorSubject<CrossToolHover | null> = new BehaviorSubject<CrossToolHover | null>(null);
	get currentHover() {
		return this.currentHoverSubject.getValue();
	}
	set currentHover(value: CrossToolHover | null) {
		this.currentHoverSubject.next(value);
	}
	type: CrossToolType = 'cross-and-labels';

	constructor(
		private config: Required<ChartConfigComponentsCrossTool>,
		private crossToolCanvasModel: CanvasModel,
		private crossEventProducer: CrossEventProducerComponent,
		private hoverProducer: HoverProducerComponent,
	) {
		super();
		this.type = config.type;
	}

	/**
	 * Sets the type of the CrossTool object.
	 *
	 * @param {CrossToolType} type - The type of the CrossTool object.
	 * @returns {void}
	 */
	public setType(type: CrossToolType) {
		this.type = type;
	}

	/**
	 * Method to activate the cross tool.
	 * It subscribes to the canvasInputListener's mouse move event and fires the draw event.
	 * It also subscribes to the eventBus's hover and close hover events and updates the hover and fires the draw event accordingly.
	 * It also subscribes to the chartModel's candlesSetSubject and timeZoneModel's observeTimeZoneChanged events and recalculates the cross tool X formatter.
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			this.hoverProducer.hoverSubject.subscribe(hover => {
				if (this.crossEventProducer.crossSubject.getValue() !== null && hover !== null) {
					this.updateHover(hover);
				} else {
					this.currentHover = null;
				}
				this.fireDraw();
			}),
		);
	}

	/**
	 * This method is used to fire the draw event of the crossToolCanvasModel if the type is not 'none'.
	 * @private
	 */
	private fireDraw() {
		if (this.type !== 'none') {
			this.crossToolCanvasModel.fireDraw();
		}
	}

	/**
	 * Updates the current hover position with the provided hover object.
	 * @param {Object} hover - The hover object containing the x and y coordinates and time formatted.
	 * @param {number} hover.x - The x coordinate of the hover.
	 * @param {number} hover.y - The y coordinate of the hover.
	 * @param {string} hover.timeFormatted - The formatted time of the hover.
	 * @param {Object} hover.candleHover - The candle hover object containing the open, close, high, low and closestOHLCY coordinates.
	 * @param {number} hover.candleHover.openY - The y coordinate of the open price of the candle.
	 * @param {number} hover.candleHover.closeY - The y coordinate of the close price of the candle.
	 * @param {number} hover.candleHover.highY - The y coordinate of the high price of the candle.
	 * @param {number} hover.candleHover.lowY - The y coordinate of the low price of the candle.
	 * @param {number} hover.candleHover.closestOHLCY - The y coordinate of the closest OHLC price of the candle.
	 * @returns {void}
	 */
	public updateHover(hover: Hover, magnetTarget = this.config.magnetTarget) {
		if (this.currentHover === null) {
			this.currentHover = { x: hover.x, y: 0, time: hover.timeFormatted, paneId: hover.paneId };
		} else {
			this.currentHover.x = hover.x;
			this.currentHover.time = hover.timeFormatted;
		}
		if (hover.candleHover && hover.paneId === CHART_UUID) {
			switch (magnetTarget) {
				case 'O':
					this.currentHover.y = hover.candleHover.openY;
					break;
				case 'C':
					this.currentHover.y = hover.candleHover.closeY;
					break;
				case 'H':
					this.currentHover.y = hover.candleHover.highY;
					break;
				case 'L':
					this.currentHover.y = hover.candleHover.lowY;
					break;
				case 'OHLC':
					this.currentHover.y = hover.candleHover.closestOHLCY;
					break;
				case 'none':
					this.currentHover.y = hover.y;
					break;
			}
		} else {
			this.currentHover.y = hover.y;
		}
		this.currentHoverSubject.next(this.currentHover);
	}
}
