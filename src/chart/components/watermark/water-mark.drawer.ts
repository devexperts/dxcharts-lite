/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Drawer } from '../../drawers/drawing-manager';
import { ChartConfigComponentsWaterMark, FullChartConfig } from '../../chart.config';
import { CHART_UUID, CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CanvasModel } from '../../model/canvas.model';
import { WaterMarkData } from './water-mark.component';

export type WaterMarkPositionType = 'center' | 'left-top' | 'left-bottom';

interface WaterMarkDrawItemConfig {
	x: number;
	y: number;
	font: string;
	text: string;
	color: string;
}

export class WaterMarkDrawer implements Drawer {
	private logoImage?: CanvasImageSource;
	constructor(
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private canvasModel: CanvasModel,
		private waterMarkConfigProvider: () => ChartConfigComponentsWaterMark,
		private watermarkDataProvider: () => WaterMarkData,
	) {}

	/**
	 * Draws a watermark on the canvas if the watermark is visible and the colors are provided in the configuration.
	 * The watermark consists of three rows of text and an optional logo image.
	 * The height of each row is calculated based on the font size and the actual text height.
	 * The total height of the watermark is calculated by adding the heights of all rows and the logo image.
	 * The watermark is drawn using the drawWaterMark() method and the configuration is provided by the getConfig() method.
	 * The font size and color of each row are provided in the waterMarkConfig object.
	 * The logo image is drawn using the drawImage() method and its dimensions are provided in the waterMarkConfig object.
	 * @function
	 */
	draw() {
		if (this.config.components.waterMark?.visible && this.config.colors) {
			const { firstRow, secondRow, thirdRow } = this.watermarkDataProvider();
			const waterMarkConfig = this.waterMarkConfigProvider();
			const waterMarkTheme = this.config.colors.waterMarkTheme;
			const ctx = this.canvasModel.ctx;
			let firstRowHeight = 0;
			let secondRowHeight = 0;
			let secondRowGap = 0;
			let thirdRowHeight = 0;
			let thirdRowGap = 0;

			ctx.save();
			// set font for first watermark Row
			if (waterMarkConfig.firstRowFontSize && firstRow) {
				ctx.font = setFont(this.config, waterMarkConfig.firstRowFontSize);
				const firstRowMetrics = ctx.measureText(firstRow);
				firstRowHeight = firstRowMetrics.actualBoundingBoxAscent + firstRowMetrics.actualBoundingBoxDescent;
			}
			// set font for second watermark Row
			if (waterMarkConfig.secondRowFontSize && secondRow) {
				ctx.font = setFont(this.config, waterMarkConfig.secondRowFontSize);
				const secondRowMetrics = ctx.measureText(secondRow);
				secondRowHeight = secondRowMetrics.actualBoundingBoxAscent + secondRowMetrics.actualBoundingBoxDescent;
				secondRowGap = waterMarkConfig.firstRowBottomPadding ?? 0;
			}
			// set font for third watermark Row
			if (waterMarkConfig.thirdRowFontSize && thirdRow) {
				ctx.font = setFont(this.config, waterMarkConfig.thirdRowFontSize);
				const thirdRowMetrics = ctx.measureText(thirdRow);
				thirdRowHeight = thirdRowMetrics.actualBoundingBoxAscent + thirdRowMetrics.actualBoundingBoxDescent;
				thirdRowGap = waterMarkConfig.secondRowBottomPadding ?? 0;
			}
			const imageGap = waterMarkConfig.thirdRowBottomPadding ?? 0;
			const imageHeight = waterMarkConfig.logoHeight ?? 0;
			const totalHeight =
				firstRowHeight + secondRowHeight + secondRowGap + thirdRowHeight + thirdRowGap + imageGap + imageHeight;
			// draw first Row
			if (firstRow) {
				this.drawWaterMark(
					this.getConfig(
						firstRowHeight,
						firstRow,
						waterMarkConfig.firstRowFontSize,
						waterMarkTheme.firstRowColor,
						totalHeight,
					),
				);
			}
			// draw second Row
			if (secondRow) {
				this.drawWaterMark(
					this.getConfig(
						firstRowHeight + secondRowGap + secondRowHeight,
						secondRow,
						waterMarkConfig.secondRowFontSize,
						waterMarkTheme.secondRowColor,
						totalHeight,
					),
				);
			}
			// draw third Row
			if (thirdRow) {
				this.drawWaterMark(
					this.getConfig(
						firstRowHeight + secondRowGap + secondRowHeight + thirdRowGap + thirdRowHeight,
						thirdRow,
						waterMarkConfig.thirdRowFontSize,
						waterMarkTheme.thirdRowColor,
						totalHeight,
					),
				);
			}
			// draw image
			if (this.logoImage) {
				const config = this.getConfig(
					firstRowHeight + secondRowGap + secondRowHeight + thirdRowGap + thirdRowHeight + imageGap,
					'',
					waterMarkConfig.thirdRowFontSize,
					waterMarkTheme.thirdRowColor,
					totalHeight,
					waterMarkConfig.logoWidth,
				);
				this.canvasModel.ctx.drawImage(
					this.logoImage,
					config.x,
					config.y,
					waterMarkConfig.logoWidth ?? 0,
					waterMarkConfig.logoHeight ?? 0,
				);
			}

			ctx.restore();
		}
	}

	/**
	 * Returns an array of canvas ids.
	 *
	 * @returns {Array<string>} An array of canvas ids.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}

	/**
	 * Sets the logo image to be displayed.
	 *
	 * @param {CanvasImageSource} img - The image to be set as the logo.
	 * @returns {void}
	 */
	setLogoImage(img: CanvasImageSource) {
		this.logoImage = img;
	}

	/**
	 * Draws a watermark on the canvas.
	 *
	 * @private
	 * @param {Object} config - The configuration object for the watermark.
	 * @param {string} config.text - The text to be displayed as the watermark.
	 * @param {string} config.font - The font to be used for the watermark.
	 * @param {string} config.color - The color to be used for the watermark.
	 * @param {number} config.x - The x-coordinate of the starting point of the watermark.
	 * @param {number} config.y - The y-coordinate of the starting point of the watermark.
	 * @returns {void}
	 */
	private drawWaterMark(config: WaterMarkDrawItemConfig) {
		const text = config.text;
		if (!text || !text.length) {
			return;
		}
		const ctx = this.canvasModel.ctx;
		ctx.font = config.font;
		ctx.fillStyle = config.color;
		const x = config.x;
		const y = config.y;
		ctx.fillText(text, x, y);
	}

	private getConfig = (
		offset: number = 0,
		text: string,
		fontSize: number,
		color: string,
		totalHeight: number,
		redefinedWidth?: number,
	) => {
		const ctx = this.canvasModel.ctx;
		const chartBounds = this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(CHART_UUID));
		const { position: posType, offsetY, offsetX } = this.config.components.waterMark;
		let width;
		if (!redefinedWidth) {
			ctx.font = setFont(this.config, fontSize);
			width = ctx.measureText(text).width;
			if (chartBounds.width - 10 < width) {
				ctx.font = reCountingSize(this.config, this.canvasBoundsContainer, fontSize, width);
				width = ctx.measureText(text).width;
			}
		} else {
			width = redefinedWidth;
		}
		switch (posType) {
			case 'left-top':
				return {
					x: offsetX + chartBounds.x,
					y: offsetY + offset + chartBounds.y,
					font: ctx.font,
					text,
					color,
				};
			case 'left-bottom':
				return {
					x: offsetX + chartBounds.x,
					y: chartBounds.height - totalHeight - offsetY + offset + chartBounds.y,
					font: ctx.font,
					text,
					color,
				};
			case 'center':
				return {
					x: chartBounds.width / 2 - width / 2 + chartBounds.x,
					y: (chartBounds.height - totalHeight) / 2 + offset + chartBounds.y,
					font: ctx.font,
					text,
					color,
				};
		}
	};

	/**
	 * A method that resets the state of an object to its initial values.
	 *
	 * @function
	 * @name reset
	 * @returns {void}
	 */
	reset() {}
}

export const reCountingSize = (
	config: FullChartConfig,
	canvasBoundsContainer: CanvasBoundsContainer,
	fontSize: number,
	fontWidth: number,
): string => {
	const getFontSize = (fontSize: number, fontWidth: number): number => {
		const chart = canvasBoundsContainer.getBounds(CanvasElement.CHART);
		return (chart.width / fontWidth) * fontSize;
	};
	const size = getFontSize(fontSize, fontWidth);
	let font: string | undefined = undefined;
	if (config.components && config.components.waterMark) {
		font = config.components.waterMark.fontFamily;
	}
	return size + 'px ' + font;
};

export const setFont = (config: FullChartConfig, fontSize: number) => {
	let font: string | undefined = undefined;
	if (config.components && config.components.waterMark) {
		font = config.components.waterMark.fontFamily;
	}
	return fontSize + 'px ' + font;
};
