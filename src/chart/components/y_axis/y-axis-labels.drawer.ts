/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartConfigComponentsYAxis, FullChartColors, getFontFromConfig } from '../../chart.config';
import { redrawBackgroundArea } from '../../drawers/chart-background.drawer';
import { Bounds } from '../../model/bounds.model';
import { drawPriceLabel, drawRoundedRect } from '../../utils/canvas/canvas-drawing-functions.utils';
import { calculateSymbolHeight, calculateTextWidth } from '../../utils/canvas/canvas-font-measure-tool.utils';
import { getLabelTextColorByBackgroundColor } from '../../utils/canvas/canvas-text-functions.utils';
import { round } from '../../utils/math.utils';

export interface YAxisLabelDrawProps {
	ctx: CanvasRenderingContext2D;
	bounds: Bounds;
	text: string;
	centralY: number;
	config: YAxisLabelDrawConfig;
	subGroupId?: number;
}

export interface YAxisLabelDrawConfig {
	textFont?: string;
	textColor?: string;
	bgColor: string;
	highlightColor?: string;
	descColor?: string;
	lineColor?: string;
	paddingTop?: number;
	paddingBottom?: number;
	paddingEnd?: number;
	paddingStart?: number;
	rounded?: boolean;
}

export const DEFAULT_PRICE_LABEL_PADDING = 4;

/**
 * Draws badge label on Y axis with provided parameters.
 * @param ctx - canvas 2D context to draw on
 * @param bounds - bounds of Y axis
 * @param text - text to draw
 * @param centralY - y
 * @param config - label styles config
 * @param align
 * @param yAxisState
 */
export function drawBadgeLabel(
	ctx: CanvasRenderingContext2D,
	bounds: Bounds,
	text: string,
	centralY: number,
	config: YAxisLabelDrawConfig,
	yAxisState: ChartConfigComponentsYAxis,
	yAxisColors: FullChartColors['yAxis'],
	drawOutside: boolean = false,
): void {
	const align = yAxisState.align;
	const textFont = config.textFont ?? getFontFromConfig(yAxisState);
	const bgColor = config.bgColor;
	const textColor =
		config.textColor ??
		getLabelTextColorByBackgroundColor(bgColor, yAxisColors.labelTextColor, yAxisColors.labelInvertedTextColor);
	const paddingTop = config.paddingTop ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingBottom = config.paddingBottom ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingEnd = config.paddingEnd ?? DEFAULT_PRICE_LABEL_PADDING;
	const halfFontHeight = round(calculateSymbolHeight(textFont, ctx) / 2);
	const labelBoxTopY = centralY - halfFontHeight - paddingTop;
	const labelBoxBottomY = centralY + halfFontHeight + paddingBottom;
	const labelBoxHeight = labelBoxBottomY - labelBoxTopY;

	// do not draw, if label is out of bounds
	if (
		(centralY < bounds.y + labelBoxHeight / 2 || centralY > bounds.y + bounds.height - labelBoxHeight / 2) &&
		!drawOutside
	) {
		return;
	}
	ctx.save();
	ctx.fillStyle = bgColor;
	ctx.strokeStyle = bgColor;

	const labelForeWidth = round(bounds.width / 6);
	const x1 = align === 'right' ? bounds.x : bounds.x + bounds.width;
	const x2 = align === 'right' ? x1 + labelForeWidth : x1 - labelForeWidth;
	const xTextOffset = yAxisState.labelBoxMargin.end;
	const marginEnd = xTextOffset - paddingEnd;
	// main body label width, without triangle
	const width = bounds.width - labelForeWidth - marginEnd;

	drawPriceLabel(
		ctx,
		x2,
		labelBoxTopY,
		x1,
		labelBoxTopY + round(labelBoxHeight / 2),
		x2,
		labelBoxTopY + labelBoxHeight,
		width,
		yAxisState.typeConfig.badge?.rounded ?? false,
		align,
	);

	ctx.fillStyle = textColor;
	ctx.font = textFont;
	const textX =
		align === 'right'
			? bounds.x + bounds.width - calculateTextWidth(text, ctx, textFont) - xTextOffset
			: bounds.x + xTextOffset;
	ctx.fillText(text, textX, centralY + halfFontHeight - 1); // -1 for font height adjustment
	ctx.restore();
}

/**
 * Draws rectangle label on Y axis with provided parameters.
 * @param ctx - canvas 2D context to draw on
 * @param bounds - bounds of Y axis
 * @param text - text to draw
 * @param centralY - y
 * @param config - label styles config
 * @param align
 * @param yAxisState
 */
export function drawRectLabel(
	ctx: CanvasRenderingContext2D,
	bounds: Bounds,
	text: string,
	centralY: number,
	config: YAxisLabelDrawConfig,
	yAxisState: ChartConfigComponentsYAxis,
	yAxisColors: FullChartColors['yAxis'],
	drawOutside: boolean = false,
) {
	const align = yAxisState.align;
	const textFont = config.textFont ?? getFontFromConfig(yAxisState);
	const bgColor = config.bgColor;
	const textColor =
		config.textColor ??
		getLabelTextColorByBackgroundColor(bgColor, yAxisColors.labelTextColor, yAxisColors.labelInvertedTextColor);
	const paddings = yAxisState.typeConfig.rectangle?.paddings;
	const paddingTop = config.paddingTop ?? paddings?.top ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingBottom = config.paddingBottom ?? paddings?.bottom ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingEnd = config.paddingEnd ?? paddings?.end ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingStart = config.paddingStart;
	const fontHeight = calculateSymbolHeight(textFont, ctx);
	const labelBoxTopY = centralY - fontHeight / 2 - paddingTop;
	const labelBoxBottomY = centralY + fontHeight / 2 + paddingBottom;
	const labelBoxHeight = labelBoxBottomY - labelBoxTopY;
	const rounded = config.rounded ?? yAxisState.typeConfig.rectangle?.rounded;

	// do not draw, if label is out of bounds
	if (
		(centralY < bounds.y + labelBoxHeight / 2 || centralY > bounds.y + bounds.height - labelBoxHeight / 2) &&
		!drawOutside
	) {
		return;
	}
	ctx.save();
	ctx.fillStyle = bgColor;
	ctx.strokeStyle = bgColor;

	const xTextOffset = yAxisState.labelBoxMargin.end;
	ctx.font = textFont;
	const textWidth = calculateTextWidth(text, ctx, textFont);

	const marginEnd = xTextOffset - paddingEnd;
	const width = paddingStart !== undefined ? textWidth + paddingStart + paddingEnd : bounds.width - marginEnd;
	const x = align === 'right' ? bounds.x + bounds.width - marginEnd - width : bounds.x + marginEnd;

	const textX = align === 'right' ? bounds.x + bounds.width - textWidth - xTextOffset : xTextOffset;

	if (rounded) {
		drawRoundedRect(ctx, x, labelBoxTopY, width, labelBoxHeight, 4, true);
	} else {
		ctx.fillRect(x, labelBoxTopY, width, labelBoxHeight);
	}

	ctx.fillStyle = textColor;
	ctx.fillText(text, textX, centralY + fontHeight / 2 - 1); // -1 for font height adjustment
	ctx.restore();
}

/**
 * Draws rectangle label on Y axis with provided parameters but with transparent background.
 * @param ctx - canvas 2D context to draw on
 * @param bounds - bounds of Y axis
 * @param text - text to draw
 * @param centralY - y
 * @param config - label styles config
 * @param align
 * @param yAxisState
 */
export function drawPlainLabel(
	ctx: CanvasRenderingContext2D,
	bounds: Bounds,
	text: string,
	centralY: number,
	config: YAxisLabelDrawConfig,
	yAxisState: ChartConfigComponentsYAxis,
	yAxisColors: FullChartColors['yAxis'],
	drawOutside: boolean = false,
	backgroundCtx?: CanvasRenderingContext2D,
) {
	const align = yAxisState.align;
	const textFont = config.textFont ?? getFontFromConfig(yAxisState);
	const bgColor = config.bgColor;
	const textColor =
		config.textColor ??
		getLabelTextColorByBackgroundColor(bgColor, yAxisColors.labelTextColor, yAxisColors.labelInvertedTextColor);
	const paddings = yAxisState.typeConfig.rectangle?.paddings;
	const paddingTop = config.paddingTop ?? paddings?.top ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingBottom = config.paddingBottom ?? paddings?.bottom ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingEnd = config.paddingEnd ?? paddings?.end ?? DEFAULT_PRICE_LABEL_PADDING;
	const paddingStart = config.paddingStart;
	const fontHeight = calculateSymbolHeight(textFont, ctx);
	const labelBoxTopY = centralY - fontHeight / 2 - paddingTop;
	const labelBoxBottomY = centralY + fontHeight / 2 + paddingBottom;
	const labelBoxHeight = labelBoxBottomY - labelBoxTopY;

	// do not draw, if label is out of bounds
	if (
		(centralY < bounds.y + labelBoxHeight / 2 || centralY > bounds.y + bounds.height - labelBoxHeight / 2) &&
		!drawOutside
	) {
		return;
	}
	ctx.save();
	ctx.fillStyle = bgColor;
	ctx.strokeStyle = bgColor;

	const xTextOffset = yAxisState.labelBoxMargin.end;
	ctx.font = textFont;
	const textWidth = calculateTextWidth(text, ctx, textFont);

	const marginEnd = xTextOffset - paddingEnd;
	const width = paddingStart !== undefined ? textWidth + paddingStart + paddingEnd : bounds.width - marginEnd;
	const x = align === 'right' ? bounds.x + bounds.width - marginEnd - width : bounds.x + marginEnd;

	const textX = align === 'right' ? bounds.x + bounds.width - textWidth - xTextOffset : xTextOffset;

	backgroundCtx && redrawBackgroundArea(backgroundCtx, ctx, x, labelBoxTopY, width, labelBoxHeight);

	ctx.fillStyle = textColor;
	ctx.fillText(text, textX, centralY + fontHeight / 2 - 1); // -1 for font height adjustment
	ctx.restore();
}

/**
 * Offset from the center of label to the top/bottom.
 *
 * @param font Label font
 * @param ctx Drawing context
 * @param paddingTop - extra padding from top
 */
export function getLabelYOffset(
	font: string,
	ctx: CanvasRenderingContext2D,
	paddingTop: number = DEFAULT_PRICE_LABEL_PADDING,
) {
	const fontHeight = calculateSymbolHeight(font, ctx);
	return fontHeight / 2 + paddingTop;
}
