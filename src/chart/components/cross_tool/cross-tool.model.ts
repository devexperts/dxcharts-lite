/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject } from 'rxjs';
import { ChartConfigComponentsCrossTool } from '../../chart.config';
import { CrossEventProducerComponent } from '../../inputhandlers/cross-event-producer.component';
import { Hover, HoverProducerComponent } from '../../inputhandlers/hover-producer.component';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasBoundsContainer, CanvasElement, CHART_UUID } from '../../canvas/canvas-bounds-container';
import { isMobile } from '../../utils/device/browser.utils';
import { BaselineModel } from '../../model/baseline.model';

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

	constructor(
		private config: Required<ChartConfigComponentsCrossTool>,
		private crossToolCanvasModel: CanvasModel,
		private crossEventProducer: CrossEventProducerComponent,
		private hoverProducer: HoverProducerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private baselineModel: BaselineModel,
	) {
		super();
	}

	/**
	 * Sets the type of the CrossTool object.
	 *
	 * @param {CrossToolType} type - The type of the CrossTool object.
	 * @returns {void}
	 */
	public setType(type: CrossToolType) {
		this.config.type = type;
	}

	/**
	 * Method to activate the cross tool.
	 * It subscribes to the hoverProducer's hover event and updates the crosstool.
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			this.hoverProducer.hoverSubject.subscribe(hover => {
				if (this.crossEventProducer.crossSubject.getValue() !== null && hover !== null) {
					isMobile() ? this.updateCrossToolMobile(hover) : this.updateCrossTool(hover);
				} else {
					this.currentHover = null;
				}
				this.fireDraw();
			}),
		);
		// don't change mobile crosstool hover and position if baseline is being dragged
		this.addRxSubscription(
			this.baselineModel.dragPredicate.subscribe(isDragging => {
				if (!isMobile()) {
					return;
				}

				if (isDragging) {
					this.hoverProducer.deactivate();
				} else {
					// set the crosstool position before baseline drag happened to keep hover the same
					const crossToolInfo = this.crossEventProducer.crossToolTouchInfo;
					// if cross tool is on chart - update hover with it's coordinates
					if (crossToolInfo.isSet) {
						this.crossEventProducer.crossSubject.next([
							crossToolInfo.temp.x,
							crossToolInfo.temp.y,
							CHART_UUID,
						]);
					}
					this.hoverProducer.activate();
				}
			}),
		);
	}

	/**
	 * This method is used to fire the draw event of the crossToolCanvasModel if the type is not 'none'.
	 * @private
	 */
	private fireDraw() {
		if (this.config.type !== 'none') {
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
	public updateCrossTool(hover: Hover, magnetTarget = this.config.magnetTarget) {
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
		this.currentHover.paneId = hover.paneId;
		this.currentHoverSubject.next(this.currentHover);
	}

	private updateCrossToolMobile(hover: Hover) {
		// mobile crosstool works only after long touch event
		if (!this.hoverProducer.longTouchActivatedSubject.getValue()) {
			return;
		}

		const { fixed, temp, isSet } = this.crossEventProducer.crossToolTouchInfo;

		// long touch makes crosstool fixed and the further moving will place crosstool under the current hover coordinates (ordinary logic)
		// if crosstool is already set (long touch end event happened) the moving of chart will move crosstool according to it's initial (fixed position)
		if (!isSet) {
			this.updateCrossTool(hover);
			return;
		}

		// additional crosstool move logic
		const paneBounds = this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(hover.paneId));
		const offset = 5;

		// take a difference inbetween current hover and temporary crosstool coordinates
		const xDiff = hover.x - temp.x;
		const yDiff = hover.y - temp.y;

		// apply the difference to the fixed coordinates
		const rawX = fixed.x + xDiff;
		const rawY = fixed.y + yDiff;

		const paneYStart = paneBounds.y + offset;
		const paneYEnd = paneBounds.y + paneBounds.height - offset;

		// check for chart bounds and don't move crosstool outside of it
		const x = rawX < offset ? offset : rawX > paneBounds.width - offset ? paneBounds.width - offset : rawX;
		const y = rawY < paneYStart ? paneYStart : rawY > paneYEnd ? paneYEnd : rawY;
		const crossToolHover = this.hoverProducer.createHover(x, y, hover.paneId) ?? hover;

		const updatedHover = {
			...crossToolHover,
			x,
			y,
		};

		this.crossEventProducer.crossToolHover = updatedHover;
		this.updateCrossTool(updatedHover);
	}
}
