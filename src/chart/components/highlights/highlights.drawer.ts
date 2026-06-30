/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Bounds } from '../../model/bounds.model';
import { calculateTextWidth } from '../../utils/canvas/canvas-font-measure-tool.utils';
import { CandleTimestampAnchor, FullChartConfig } from '../../chart.config';
import { HIGHLIGHTS_TYPES, HighlightsModel, HighlightTextPlacement, HighlightBorder } from './highlights.model';
import { CanvasModel } from '../../model/canvas.model';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { Drawer } from '../../drawers/drawing-manager';
import { ChartModel } from '../chart/chart.model';
import { unitToPixels } from '../../model/scaling/viewport.model';
import { clipToBounds } from '../../utils/canvas/canvas-drawing-functions.utils';
import { DataSeriesPoint } from '../../model/data-series.model';

const LABEL_PADDINGS = [20, 10];

export class HighlightsDrawer implements Drawer {
	constructor(
		private highlightsModel: HighlightsModel,
		private chartModel: ChartModel,
		private canvasModel: CanvasModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private config: FullChartConfig,
	) {}

	/**
	 * Draws highlights on the chart canvas if they are visible.
	 * @function
	 * @name draw
	 * @memberof ChartComponent.prototype
	 *
	 * @returns {void}
	 *
	 * @example
	 * chartComponent.draw();
	 */
	draw() {
		if (this.config.components.highlights.visible) {
			const candles = this.chartModel.getCandles();
			const ctx = this.canvasModel.ctx;
			const highlights = this.highlightsModel.getVisualHighlights();
			const highlightsExist = this.highlightsModel.getHighlights().length;
			if (highlightsExist && candles.length !== 0 && this.chartModel.scale.isScaleReady()) {
				const chartBounds = this.canvasBoundsContainer.getBounds(CanvasElement.ALL_PANES);
				ctx.save();
				//clip rect to throw away everything that doesn't fit chart bounds
				clipToBounds(ctx, chartBounds);
				const borderWidth = this.config.components.highlights.border.width ?? 1;
				const borderDash = this.config.components.highlights.border.dash ?? [0, 0];
				const fontSize = this.config.components.highlights.fontSize ?? 11;
				const fontFamily = this.config.components.highlights.fontFamily ?? 'monospace';
				const font = `${fontSize}px ${fontFamily}, monospace`;
				ctx.font = font;
				ctx.lineWidth = borderWidth;
				ctx.setLineDash(borderDash);
				HIGHLIGHTS_TYPES.forEach(highlightType => {
					const items = highlights[highlightType];
					if (items) {
						const itemColors = this.config.colors.highlights[highlightType];
						const strokeStyle = itemColors?.border ?? '#ffffff';
						const fillStyle = itemColors?.background ?? '#ffffff';
						ctx.save();
						// start line path to draw highlights' borders
						// it is done once for all highlights because it is more perfomant
						ctx.beginPath();
						ctx.fillStyle = fillStyle;
						ctx.strokeStyle = strokeStyle;
						items.forEach(item => {
							const anchor = this.chartModel.getCandleTimestampAnchor();
							const candles = this.chartModel.getCandles();
							const inRange = this.findCandleIndicesInHighlight(candles, item.from, item.to);
							const highlightFromX = this.getHighlightBoundaryX(item.from, anchor);
							const highlightToX = this.getHighlightBoundaryX(item.to, anchor);
							let fillFromX = highlightFromX;
							let fillToX = highlightToX;
							if (item.border) {
								this.drawBorders(item.border, ctx, highlightFromX, highlightToX, chartBounds);
							}
							if (inRange) {
								const fromXCandle = this.chartModel.candleFromIdx(inRange.startIdx);
								const toXCandle = this.chartModel.candleFromIdx(inRange.endIdx);
								fillFromX = fromXCandle.xStart(this.chartModel.scale);
								const toXCandleWidth = unitToPixels(toXCandle.width, this.chartModel.scale.zoomX);
								fillToX = toXCandle.xStart(this.chartModel.scale) + toXCandleWidth;
								ctx.fillRect(
									fillFromX,
									chartBounds.y,
									fillToX - fillFromX,
									chartBounds.y + chartBounds.height,
								);
							}
							// draw highlight' label
							if (item.label) {
								const label = item.label.text ?? '';
								const itemColors = this.config.colors.highlights[item.type];
								ctx.save();
								ctx.fillStyle = itemColors?.label ?? '#ffffff';
								const labelWidth = calculateTextWidth(label, ctx, font);
								const [labelX, labelY] = this.resolveHighlightLabelPosition(
									item.label.placement ?? 'left-left',
									chartBounds,
									[fillFromX, fillToX],
									labelWidth,
								);
								ctx.fillText(label, labelX, labelY);
								ctx.restore();
							}
						});
						ctx.closePath();
						ctx.restore();
					}
				});
				ctx.restore();
			}
		}
	}

	private getHighlightBoundaryX(highlightTimestamp: number, anchor: CandleTimestampAnchor): number {
		const candle = this.chartModel.candleFromTimestamp(highlightTimestamp, { extrapolate: true });
		const width = unitToPixels(candle.width, this.chartModel.scale.zoomX);
		const xStart = candle.xStart(this.chartModel.scale);
		if (anchor === 'close') {
			return xStart + width;
		}
		if (candle.candle.timestamp < highlightTimestamp) {
			return xStart + width;
		}
		return xStart;
	}

	private findCandleIndicesInHighlight(
		candles: DataSeriesPoint[],
		highlightFrom: number,
		highlightTo: number,
	): { startIdx: number; endIdx: number } | null {
		let startIdx = -1;
		let endIdx = -1;
		for (let i = 0; i < candles.length; i++) {
			if (this.isCandleTimestampInHighlight(candles[i].timestamp, highlightFrom, highlightTo)) {
				if (startIdx === -1) {
					startIdx = i;
				}
				endIdx = i;
			}
		}
		return startIdx === -1 ? null : { startIdx, endIdx };
	}

	private isCandleTimestampInHighlight(candleTimestamp: number, highlightFrom: number, highlightTo: number): boolean {
		return highlightFrom <= candleTimestamp && candleTimestamp < highlightTo;
	}

	/**
	 * Calculates the position of the highlight label based on the given parameters.
	 * @param {HighlightTextPlacement} placement - The placement of the highlight text.
	 * @param {Bounds} bounds - The bounds of the highlight.
	 * @param {[number, number]} highlightFromTo - The start and end position of the highlight.
	 * @param {number} labelWidth - The width of the label.
	 * @returns {[number, number]} - The x and y position of the highlight label.
	 */
	private resolveHighlightLabelPosition(
		placement: HighlightTextPlacement,
		bounds: Bounds,
		highlightFromTo: [number, number],
		labelWidth: number,
	): [number, number] {
		const [fromX, toX] = highlightFromTo;
		switch (placement) {
			case 'right-left': {
				return [toX - LABEL_PADDINGS[1] - labelWidth, bounds.y + LABEL_PADDINGS[0]];
			}
			case 'left-left': {
				return [fromX - LABEL_PADDINGS[1] - labelWidth, bounds.y + LABEL_PADDINGS[0]];
			}
			case 'right-right': {
				return [toX + LABEL_PADDINGS[1], bounds.y + LABEL_PADDINGS[0]];
			}
			case 'left-right':
			default: {
				return [fromX + LABEL_PADDINGS[1], bounds.y + LABEL_PADDINGS[0]];
			}
		}
	}

	/**
	 * Draws borders on a canvas context for a given chart.
	 * @param {HighlightBorder} border - The border to draw.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {number} fromX - The starting x-coordinate of the border.
	 * @param {number} toX - The ending x-coordinate of the border.
	 * @param {Bounds} chartBounds - The bounds of the chart to draw the border on.
	 * @returns {void}
	 */
	private drawBorders(
		border: HighlightBorder,
		ctx: CanvasRenderingContext2D,
		fromX: number,
		toX: number,
		chartBounds: Bounds,
	) {
		const leftBorder = border.left;
		const rightBorder = border.right;
		if (leftBorder) {
			ctx.beginPath();
			ctx.moveTo(fromX, chartBounds.y);
			ctx.lineTo(fromX, chartBounds.y + chartBounds.height);
			ctx.stroke();
			ctx.closePath();
		}
		if (rightBorder) {
			ctx.beginPath();
			ctx.moveTo(toX, chartBounds.y);
			ctx.lineTo(toX, chartBounds.y + chartBounds.height);
			ctx.stroke();
			ctx.closePath();
		}
	}

	/**
	 * Returns an array of canvas IDs.
	 *
	 * @returns {Array<string>} An array containing the canvas ID.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
