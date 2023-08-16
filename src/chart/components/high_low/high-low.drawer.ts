/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Drawer } from '../../drawers/drawing-manager';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../chart.config';
import { ChartModel } from '../chart/chart.model';
import { CanvasModel } from '../../model/canvas.model';
import { getTextLineHeight } from '../../utils/canvas/canvas-text-functions.utils';

type MarkerType = 'high' | 'low';

export class HighLowDrawer implements Drawer {
	constructor(
		private canvasModel: CanvasModel,
		private chartModel: ChartModel,
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
	) {}
	/**
	 * This function is responsible for drawing the high and low markers on the chart canvas. It checks if the highLow component is visible and if the chartModel is ready. If so, it retrieves the high, low, highIdx, and lowIdx from the chartModel's mainCandleSeries zippedHighLow property.
	 * The function then calculates the global indexes of the high and low candles by adding the viewportStartCandleGlobalIdx to the highIdx and lowIdx respectively. It then saves the canvas context and sets the font to the highLow font specified in the config.
	 * Finally, it calls the drawMarkerLabel function twice, passing in the canvas context, the final global index of the high or low candle, the high or low value, and a string indicating whether it is a high or low marker. After both markers have been drawn, the canvas context is restored.
	 */
	draw(): void {
		if (this.config.components.highLow.visible && this.chartModel.isReady()) {
			const { high, low, highIdx, lowIdx } = this.chartModel.mainCandleSeries.zippedHighLow;
			/**
			 * the thing is that `highIdx` and `lowIdx` from the `this.chartModel.mainCandleSeries.zippedHighLow`
			 * are responsible for indexes in the viewport series array
			 * but to draw the high low text in the correct places, we need to know the global indexes of
			 * the `high` and `low` candles
			 */
			const viewportStartCandleGlobalIdx = this.chartModel.mainCandleSeries.dataIdxStart;
			const finalHighIdx = viewportStartCandleGlobalIdx + highIdx;
			const finalLowIdx = viewportStartCandleGlobalIdx + lowIdx;
			const ctx = this.canvasModel.ctx;
			ctx.save();
			ctx.font = this.config.components.highLow.font;
			this.drawMarkerLabel(ctx, finalHighIdx, high, 'high');
			this.drawMarkerLabel(ctx, finalLowIdx, low, 'low');
			ctx.restore();
		}
	}

	/**
	 * Draws a marker label on the canvas context at a specific position.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {number} candleIdx - The index of the candle.
	 * @param {number} yValue - The y value of the marker.
	 * @param {MarkerType} type - The type of the marker.
	 * @returns {void}
	 */
	private drawMarkerLabel(ctx: CanvasRenderingContext2D, candleIdx: number, yValue: number, type: MarkerType): void {
		const y = this.getMarkerY(ctx, yValue, type === 'low');
		if (!this.checkMarkerInBounds(y)) {
			return;
		}
		const text = this.getMarkerText(yValue, type);
		const x = this.getMarkerX(ctx, candleIdx, text);
		ctx.fillStyle =
			type === 'high' ? this.config.colors.highLowTheme.highColor : this.config.colors.highLowTheme.lowColor;
		ctx.fillText(text, x, y);
	}

	/**
	 * Returns a string that represents a marker text for a given yValue and type.
	 *
	 * @private
	 * @param {number} yValue - The yValue to format.
	 * @param {MarkerType} type - The type of the marker ('high' or 'low').
	 * @returns {string} - The formatted marker text.
	 */
	private getMarkerText(yValue: number, type: MarkerType): string {
		const formattedValue = this.chartModel.pane.regularFormatter(yValue);
		const prefix = type === 'high' ? 'H:' : 'L:';
		return `${prefix} ${formattedValue}`;
	}

	/**
	 * Returns the y-coordinate of a marker on the chart.
	 * @param {CanvasRenderingContext2D} ctx - The rendering context of the canvas.
	 * @param {number} yValue - The y-value of the marker.
	 * @param {boolean} [offset=false] - Whether to add an offset to the y-coordinate.
	 * @returns {number} The y-coordinate of the marker.
	 */
	private getMarkerY(ctx: CanvasRenderingContext2D, yValue: number, offset: boolean = false): number {
		const y = this.chartModel.toY(yValue);
		if (offset) {
			const fontSize = getTextLineHeight(ctx);
			return y + fontSize;
		}
		return y;
	}

	/**
	 * Checks if the given Y coordinate is within the bounds of the chart.
	 * @param {number} y - The Y coordinate to check.
	 * @returns {boolean} - Returns true if the Y coordinate is within the bounds of the chart, otherwise returns false.
	 */
	private checkMarkerInBounds(y: number): boolean {
		const chartBounds = this.canvasBoundsContainer.getBounds(CanvasElement.CHART);
		if (y > chartBounds.y && y < chartBounds.y + chartBounds.height) {
			return true;
		}
		// if the Y coordinate of the text doesn't fit the viewport -> do not draw it
		return false;
	}

	/**
	 * Calculates the x position of the marker for a given candle index and text
	 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
	 * @param {number} candleIdx - The index of the candle
	 * @param {string} text - The text to be displayed
	 * @returns {number} - The x position of the marker
	 */
	private getMarkerX(ctx: CanvasRenderingContext2D, candleIdx: number, text: string): number {
		let x = this.chartModel.toX(candleIdx);
		const chartBounds = this.canvasBoundsContainer.getBounds(CanvasElement.CHART);
		const shift = 4;
		/**
		 * recalculates position of the text if it overexceed the chart bounds
		 * it will look like it turns from the right to the left
		 * it helps to fix the situation when
		 * the candle is still visible, but the text may overflow the bounds
		 */
		const textWidth = ctx.measureText(text).width;
		if (x + shift + textWidth > chartBounds.width) {
			x = x - (shift + textWidth);
		}
		return x + shift;
	}

	/**
	 * Returns an array of canvas IDs.
	 *
	 * @returns {Array<string>} An array containing the ID of the canvas model.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
