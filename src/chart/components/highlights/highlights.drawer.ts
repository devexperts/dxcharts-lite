/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Bounds } from '../../model/bounds.model';
import { calculateTextWidth } from '../../utils/canvas/canvas-font-measure-tool.utils';
import { FullChartConfig } from '../../chart.config';
import { HIGHLIGHTS_TYPES, HighlightsModel, HighlightTextPlacement, HighlightBorder } from './highlights.model';
import { CanvasModel } from '../../model/canvas.model';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { Drawer } from '../../drawers/drawing-manager';
import { ChartModel } from '../chart/chart.model';
import { unitToPixels } from '../../model/scaling/viewport.model';
import { clipToBounds } from '../../drawers/data-series.drawer';

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
			if (highlightsExist && candles.length !== 0 && this.chartModel.scaleModel.isScaleReady()) {
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
							const fromXCandle = this.chartModel.candleFromTimestamp(item.from);
							const fromXCandleWidth = unitToPixels(fromXCandle.width, this.chartModel.scaleModel.zoomX);
							const fromX = fromXCandle.xStart(this.chartModel.scaleModel);
							const toXCandle = this.chartModel.candleFromTimestamp(item.to);
							const toXCandleWidth = unitToPixels(toXCandle.width, this.chartModel.scaleModel.zoomX);
							const toX = toXCandle.xStart(this.chartModel.scaleModel) + toXCandleWidth;
							// draw highlight' borders
							if (item.border) {
								this.drawBorders(
									item.border,
									ctx,
									fromX + fromXCandleWidth,
									toX - toXCandleWidth,
									chartBounds,
								);
							}
							// draw highlight' background
							ctx.fillRect(fromX, chartBounds.y, toX - fromX, chartBounds.y + chartBounds.height);
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
									[fromX, toX],
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
