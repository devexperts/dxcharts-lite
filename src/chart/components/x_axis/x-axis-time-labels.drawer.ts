/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { NumericAxisLabel } from '../labels_generator/numeric-axis-labels.generator';
import { Bounds } from '../../model/bounds.model';
import { FullChartConfig } from '../../chart.config';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CanvasModel } from '../../model/canvas.model';
import { Drawer } from '../../drawers/drawing-manager';
import { ViewportModel } from '../../model/scaling/viewport.model';
import { calculateTextWidth } from '../../utils/canvas/canvas-font-measure-tool.utils';

/**
 * This Drawer draws regular time labels for X Axis.
 */
export class XAxisTimeLabelsDrawer implements Drawer {
	constructor(
		private config: FullChartConfig,
		private canvasModel: CanvasModel,
		private viewportModel: ViewportModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private labelsProvider: () => NumericAxisLabel[],
		private drawPredicate: () => boolean = () => true,
	) {}

	/**
	 * Draws the X-axis labels on the canvas.
	 * If the drawPredicate is true, it will draw the labels.
	 * @returns {void}
	 */
	draw(): void {
		if (this.drawPredicate()) {
			const ctx = this.canvasModel.ctx;
			const xAxisColors = this.config.colors.xAxis;
			const fontFamily = this.config.components.xAxis.fontFamily;
			const font = XAxisTimeLabelsDrawer.getFontFromConfig(this.config);
			const fontHeight = this.config.components.xAxis.fontSize;
			const offsetTop = this.config.components.xAxis.padding.top ?? 0;
			ctx.save();
			ctx.font = font;
			ctx.fillStyle = xAxisColors.backgroundColor;
			const bounds = this.canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
			ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

			const color = this.config.colors.xAxis.labelTextColor;
			const labels = this.labelsProvider();
			this.drawLabels(ctx, labels, bounds, color, fontHeight, fontFamily, offsetTop);
			ctx.restore();
		}
	}

	/**
	 * Draws labels on a canvas context.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {NumericAxisLabel[]} labels - An array of NumericAxisLabel objects containing the value and text of each label.
	 * @param {Bounds} bounds - The bounds of the viewport.
	 * @param {string} color - The color of the labels.
	 * @param {number} fontHeight - The height of the font in pixels.
	 * @param {string} fontFamily - The font family to use for the labels.
	 * @param {number} offsetTop - The offset from the top of the viewport to draw the labels.
	 * @returns {void}
	 */
	public drawLabels(
		ctx: CanvasRenderingContext2D,
		labels: NumericAxisLabel[],
		bounds: Bounds,
		color: string,
		fontHeight: number,
		fontFamily: string,
		offsetTop: number,
	) {
		const font = `${fontHeight}px ${fontFamily}`;
		ctx.fillStyle = color;
		for (const label of labels) {
			const x = this.viewportModel.toX(label.value) - calculateTextWidth(label.text, ctx, font) / 2;
			// skip labels outside viewport
			if (x < 0 || x > bounds.width) {
				continue;
			}
			const y = bounds.y + fontHeight - 1 + offsetTop; // -1 for font drawing inconsistency
			const labelText = label.text;
			ctx.font = font;
			ctx.fillText(labelText, x, y);
		}
	}

	/**
	 * Returns a font string based on the provided FullChartConfig object.
	 * @param {FullChartConfig} config - The FullChartConfig object containing the font style, size and family.
	 * @returns {string} - The font string in the format of "fontStyle fontSize fontFamily".
	 */
	public static getFontFromConfig(config: FullChartConfig) {
		return `${config.components.xAxis.fontStyle}  ${config.components.xAxis.fontSize}px ${config.components.xAxis.fontFamily}`;
	}

	/**
	 * Returns an array of canvas IDs.
	 *
	 * @returns {Array<string>} An array containing the ID of the canvas.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
