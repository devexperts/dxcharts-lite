/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { NumericAxisLabel } from '../labels_generator/numeric-axis-labels.generator';
import { BoundsProvider } from '../../model/bounds.model';
import { FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { Drawer } from '../../drawers/drawing-manager';
import { Unit, ViewportModel } from '../../model/scaling/viewport.model';
import { avoidAntialiasing } from '../../utils/canvas/canvas-drawing-functions.utils';
import { DEFAULT_PRICE_LABEL_PADDING, getLabelYOffset } from '../y_axis/y-axis-labels.drawer';
import { floor } from '../../utils/math.utils';

export interface GridLine {
	readonly pos?: number;
	readonly pixels: number;
}

/**
 * Draws grid lines on chart.
 */
export class GridDrawer implements Drawer {
	constructor(
		private canvasModel: CanvasModel,
		private viewportModel: ViewportModel,
		private config: FullChartConfig,
		private xBoundsProvider: BoundsProvider,
		private yBoundsProvider: BoundsProvider,
		private xLabelsProvider: () => NumericAxisLabel[],
		private yLabelsProvider: () => NumericAxisLabel[],
		private drawPredicate: () => boolean = () => true,
		private getBaseLine?: () => Unit,
	) {}

	/**
	 * Draws the chart on the canvas if the drawPredicate is true.
	 * @returns {void}
	 */
	draw(): void {
		if (this.drawPredicate()) {
			const ctx = this.canvasModel.ctx;
			avoidAntialiasing(ctx, () => this.drawVertical(ctx));
			avoidAntialiasing(ctx, () => this.drawHorizontal(ctx));
			avoidAntialiasing(ctx, () => this.drawZeroLine(ctx));
		}
	}

	/**
	 * Draws a zero line on the y-axis if the chart is a percentage chart and the zeroPercentLine option is enabled.
	 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas element.
	 */
	drawZeroLine(ctx: CanvasRenderingContext2D) {
		if (
			this.getBaseLine &&
			this.config.components.yAxis.type === 'percent' &&
			this.config.components.yAxis.zeroPercentLine
		) {
			const bounds = this.xBoundsProvider();
			const y = floor(this.getBaseLine());
			ctx.beginPath();
			ctx.strokeStyle = this.config.colors.yAxis.zeroPercentLine;
			ctx.setLineDash([]);
			ctx.moveTo(bounds.x, y);
			ctx.lineTo(bounds.x + bounds.width, y);
			ctx.stroke();
			ctx.closePath();
		}
	}

	/**
	 * Draws vertical grid lines on the canvas context provided.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @returns {void}
	 */
	drawVertical(ctx: CanvasRenderingContext2D) {
		const xAxisLabels = this.xLabelsProvider();
		if (xAxisLabels.length && this.config.components.grid.vertical) {
			ctx.lineWidth = this.config.components.grid.width;
			ctx.strokeStyle = this.config.colors.chartAreaTheme.gridColor;
			ctx.setLineDash(this.config.components.grid.dash || []);
			const bounds = this.xBoundsProvider();
			const boundsEnd = bounds.x + bounds.width;
			for (const label of xAxisLabels) {
				const x = floor(this.viewportModel.toX(label.value));
				if (x > bounds.x && x < boundsEnd) {
					ctx.beginPath();
					ctx.moveTo(x, bounds.y);
					ctx.lineTo(x, bounds.y + bounds.height);
					ctx.stroke();
				}
			}
		}
	}

	/**
	 * This function is responsible for drawing horizontal grid lines on the chart. It takes a CanvasRenderingContext2D object as a parameter. It first retrieves the y-axis labels using the yLabelsProvider method. If there are any labels and the horizontal grid is enabled in the configuration, it sets the line width, color, and dash style. It then retrieves the y-bounds using the yBoundsProvider method. For each label, it calculates the y-coordinate using the toY method of the viewportModel object. It also calculates the label's y-offset using the getLabelYOffset method. If the y-coordinate is within the bounds of the chart, it draws a horizontal line using the beginPath, moveTo, lineTo, and stroke methods of the CanvasRenderingContext2D object.
	 */
	drawHorizontal(ctx: CanvasRenderingContext2D) {
		const yAxisLabels = this.yLabelsProvider();
		if (yAxisLabels.length && this.config.components.grid.horizontal) {
			ctx.lineWidth = this.config.components.grid.width;
			ctx.strokeStyle = this.config.colors.chartAreaTheme.gridColor;
			ctx.setLineDash(this.config.components.grid.dash || []);
			const bounds = this.yBoundsProvider();
			for (const label of yAxisLabels) {
				const y = floor(this.viewportModel.toY(label.value));
				const labelYOffset = getLabelYOffset(label.text, ctx, DEFAULT_PRICE_LABEL_PADDING);
				// do not draw, if out of bounds
				if (y > bounds.y + labelYOffset && y < bounds.y + bounds.height - labelYOffset) {
					ctx.beginPath();
					ctx.moveTo(bounds.x, y);
					ctx.lineTo(bounds.x + bounds.width, y);
					ctx.stroke();
				}
			}
		}
	}

	/**
	 * Returns an array of strings containing the ID of the canvas model.
	 * @returns {Array<string>} An array of strings containing the ID of the canvas model.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
