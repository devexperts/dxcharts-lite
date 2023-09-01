/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig, YAxisAlign, getFontFromConfig } from '../../chart.config';
import { clipToBounds } from '../../drawers/data-series.drawer';
import { Drawer } from '../../drawers/drawing-manager';
import { Bounds } from '../../model/bounds.model';
import { CanvasModel } from '../../model/canvas.model';
import { Unit } from '../../model/scaling/viewport.model';
import { calculateSymbolHeight, calculateTextWidth } from '../../utils/canvas/canvas-font-measure-tool.utils';
import { PaneManager } from '../pane/pane-manager.component';
import { YAxisComponent } from './y-axis.component';

export interface YAxisLabel {
	readonly text: string;
	readonly value: Unit;
}

export interface YAxisAnimationParameters {
	readonly removed: YAxisLabel[];
	readonly added: YAxisLabel[];
	readonly stay: YAxisLabel[];
}

/**
 * Draws the Y_AXIS rectangle + it's base labels.
 */
export class YAxisDrawer implements Drawer {
	constructor(
		private fullConfig: FullChartConfig,
		private canvasModel: CanvasModel,
		private paneManager: PaneManager,
	) {}

	/**
	 * Draws the axis on the canvas if the drawPredicate is true.
	 * It gets the labels from the labelsProvider and the bounds from the axisBounds.
	 * It sets the background color of the axis and fills the background rectangle.
	 * It gets the font from the yAxisState and calculates the font height.
	 * It saves the context, clips it to the bounds and draws the labels with the given font and text color.
	 * @function
	 */
	draw() {
		this.paneManager.yExtents.forEach(extent => {
			const yAxisComponent: YAxisComponent = extent.yAxis;
			if (yAxisComponent.state.visible) {
				const labels = yAxisComponent.model.baseLabelsModel.labels;

				const bounds: Bounds = yAxisComponent.getBounds();
			const ctx = this.canvasModel.ctx;

			// draw axis background rect animation
			ctx.fillStyle = this.getBackgroundColor();
			ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

				const font = getFontFromConfig(yAxisComponent.state);
			const fontHeight = calculateSymbolHeight(font, ctx);

			const textColor = this.getLabelTextColor();
			ctx.save();
			clipToBounds(ctx, bounds);
				this.drawLabels(ctx, labels, bounds, fontHeight, font, textColor, yAxisComponent);
			ctx.restore();
		}
		});
	}

	/**
	 * Draws labels on the Y-axis of a canvas chart.
	 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
	 * @param {YAxisLabel[]} labels - An array of objects containing the value and text of each label.
	 * @param {Bounds} axisBounds - An object containing the x, y, width, and height of the Y-axis.
	 * @param {number} fontHeight - The height of the font used for the labels.
	 * @param {string} font - The font used for the labels.
	 * @param {string} labelTextColor - The color of the label text.
	 */
	drawLabels(
		ctx: CanvasRenderingContext2D,
		labels: YAxisLabel[],
		axisBounds: Bounds,
		fontHeight: number,
		font: string,
		labelTextColor: string,
		yAxisComponent: YAxisComponent,
	) {
		ctx.fillStyle = labelTextColor;
		ctx.font = font;
		const metrics = ctx.measureText('00.0');
		const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
		const topY = axisBounds.y + textHeight;
		const bottomY = axisBounds.y + axisBounds.height - textHeight;
		labels.forEach(label => {
			const y = yAxisComponent.scaleModel.toY(label.value);
			if (y > topY && y < bottomY) {
				drawSimpleLabel(
					ctx,
					axisBounds,
					label.text,
					y,
					fontHeight,
					font,
					yAxisComponent.state.labelBoxMargin.end,
					yAxisComponent.state.align,
				);
			}
		});
	}

	/**
	 * Returns an array of canvas IDs.
	 *
	 * @returns {Array<string>} An array containing the canvas ID.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}

	/**
	 * Returns the background color of the Y-axis.
	 *
	 * @protected
	 * @returns {string} The background color of the Y-axis.
	 */
	protected getBackgroundColor(): string {
		return this.fullConfig.colors.yAxis.backgroundColor;
	}

	/**
	 * Returns the color of the label text for the chart area axis.
	 *
	 * @protected
	 * @returns {string} The color of the label text.
	 */
	protected getLabelTextColor(): string {
		return this.fullConfig.colors.yAxis.labelTextColor;
	}
}

const drawSimpleLabel = (
	ctx: CanvasRenderingContext2D,
	bounds: Bounds,
	text: string,
	centralY: number,
	fontHeight: number,
	font: string,
	padding: number,
	yAxisAlign: YAxisAlign,
) => {
	const xTextBounds =
		yAxisAlign === 'right'
			? bounds.x + bounds.width - calculateTextWidth(text, ctx, font) - padding
			: bounds.x + padding;
	ctx.fillText(text, xTextBounds, centralY + fontHeight / 2 - 1); // -1 for font height adjustment
};
