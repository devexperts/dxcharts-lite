/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
// Regular 2d context is used only for measuring text
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const ctxForMeasure: CanvasRenderingContext2D = document.createElement('canvas').getContext('2d')!;

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
export function calculateSymbolHeight(font: string): number {
	let result = symbolHeightCache[font];
	if (result !== undefined) {
		return result;
	}
	// Capital "M" width is very close to height, 90% approximation
	ctxForMeasure.font = font;
	result = ctxForMeasure.measureText('M').width;
	symbolHeightCache[font] = result;
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
 * @param {string} font - The font to use for measuring the text width.
 * @returns {number} - The width of the text in pixels.
 */
export function calculateTextWidth(text: string, font: string): number {
	const key = font + text;
	let result = textWidthCache.get(key);
	if (!result) {
		ctxForMeasure.font = font;
		result = ctxForMeasure.measureText(text).width;
	}
	return result;
}
