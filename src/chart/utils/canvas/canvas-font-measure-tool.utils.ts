/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * Calculates max symbol height for provided font on canvas.
 * @doc-tags tricky,chart-core,canvas
 */
const symbolHeightCache: Partial<Record<string, number>> = {};

/**
 * Calculates the height of a symbol for a given font using a CanvasRenderingContext2D.
 * @param {string} font - The font to calculate the symbol height for.
 * @param {CanvasRenderingContext2D} ctx - The CanvasRenderingContext2D to use for the calculation.
 * @returns {number} - The height of the symbol.
 */
export function calculateSymbolHeight(font: string, ctx: CanvasRenderingContext2D): number {
	let result = symbolHeightCache[font];
	if (result !== undefined) {
		return result;
	}
	// Capital "M" width is very close to height, 90% approximation
	ctx.save();
	ctx.font = font;
	result = ctx.measureText('M').width;
	symbolHeightCache[font] = result;
	ctx.restore();
	return result;
}

/**
 * Calculates text width in pixels for provided font on canvas.
 * @param text
 * @param ctx
 * @param font
 * @doc-tags tricky,chart-core,canvas
 */
const textWidthCache: Map<string, number> = new Map();

/**
 * Calculates the width of a given text using the provided font and canvas rendering context.
 * @param {string} text - The text to calculate the width of.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context to use for measuring the text width.
 * @param {string} font - The font to use for measuring the text width.
 * @returns {number} - The width of the text in pixels.
 */
export function calculateTextWidth(text: string, ctx: CanvasRenderingContext2D, font: string): number {
	const key = font + text;
	let result = textWidthCache.get(key);
	if (!result) {
		ctx.save();
		ctx.font = font;
		result = ctx.measureText(text).width;
		textWidthCache.set(key, result);
		ctx.restore();
	}
	return result;
}
