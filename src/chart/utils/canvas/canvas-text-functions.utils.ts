/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import * as Color from 'color';

export type CanvasTextAlignment = 'right' | 'left';
export interface CanvasTextProperties {
	textStyle?: {
		italic?: boolean;
		bold?: boolean;
		underline?: boolean;
	};
	textSize?: string;
	textFontFamily?: string;
	textFill?: string;
	textAlign?: CanvasTextAlignment;
	rtl?: boolean;
}

/**
 * Sets the font, fill style and text alignment of a canvas context based on the provided properties.
 * @param {CanvasRenderingContext2D} ctx - The canvas context to modify.
 * @param {CanvasTextProperties} properties - An object containing the properties to apply to the canvas context.
 * @param {string} properties.textStyle - The style of the text. Can be 'italic', 'bold' or both.
 * @param {number} properties.textSize - The size of the text in pixels.
 * @param {string} properties.textFontFamily - The font family of the text.
 * @param {string} properties.textFill - The fill style of the text.
 * @param {boolean} properties.rtl - Whether the text should be aligned to the right or to the left.
 */
export function prepareTextForFill(ctx: CanvasRenderingContext2D, properties: CanvasTextProperties) {
	let textStyles = '';
	if (properties.textStyle) {
		properties.textStyle.italic && (textStyles += `italic `);
		properties.textStyle.bold && (textStyles += `bold `);
	}
	ctx.font = textStyles + (properties.textSize || 12) + ' ' + (properties.textFontFamily || 'monospace');
	ctx.fillStyle = properties.textFill || '#FFFFFF';
	if (properties.rtl) {
		ctx.textAlign = 'right';
	} else {
		ctx.textAlign = 'start';
	}
}

/**
 * Calculates the line height of a text based on the font size of the provided CanvasRenderingContext2D.
 * @param {CanvasRenderingContext2D} ctx - The CanvasRenderingContext2D object used to draw the text.
 * @returns {number} The calculated line height of the text.
 */
export function getTextLineHeight(ctx: CanvasRenderingContext2D): number {
	const textSizeMatch = ctx.font.match(/(\d+.)?\d+(px|pt)/gi);
	let textSize = '10px';
	if (textSizeMatch && textSizeMatch.length) {
		if (textSizeMatch[0].includes('pt')) {
			const ptSize = +textSizeMatch[0].slice(0, textSizeMatch[0].indexOf('pt'));
			textSize = (ptSize * 96) / 72 + 'px';
		} else {
			textSize = textSizeMatch[0];
		}
	}
	return parseInt(textSize, 10) * 1.33; // Base Line Height in Project
}

/**
 * Calculates text bounds [textWidth, textHeight, lineHeight]
 * @param ctx
 * @param lines
 * @param properties
 */
export function getTextBounds(
	ctx: CanvasRenderingContext2D,
	lines: string[],
	properties: CanvasTextProperties,
): [number, number, number] {
	ctx.save();
	prepareTextForFill(ctx, properties);
	const textWidth = Math.ceil(
		Math.max.apply(
			Math,
			lines.map((text: string) => {
				return ctx.measureText(text).width;
			}),
		),
	);
	const lineHeight = getTextLineHeight(ctx);
	const textHeight = lineHeight * lines.length;
	ctx.restore();
	return [textWidth, textHeight, lineHeight];
}

/**
 * Splits multiline text to array of lines
 * @param text
 */
export function getTextLines(text: string): string[] {
	return (text || '').split(/\r\n|\r|\n/);
}

/**
 * Draws multiple lines of text on a canvas context at a given position.
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
 * @param {string[]} lines - An array of strings representing the lines of text to draw.
 * @param {number} x - The x-coordinate of the starting position of the text.
 * @param {number} y - The y-coordinate of the starting position of the text.
 * @param {CanvasTextProperties} properties - An object containing properties for the text, such as font size, style, and alignment.
 * @returns {void}
 
*/
export function drawText(
	ctx: CanvasRenderingContext2D,
	lines: string[],
	x: number,
	y: number,
	properties: CanvasTextProperties,
): void {
	ctx.save();
	const [textWidth, , lineHeight] = getTextBounds(ctx, lines, properties);
	lines.forEach((l, i) => {
		const lineWidth = ctx.measureText(l).width;
		const alignedX = alignCanvasText(x, textWidth, lineWidth, properties.textAlign ?? 'left');
		if (properties.textStyle && properties.textStyle.underline) {
			underlineText(ctx, l, alignedX, y + lineHeight * i, properties.textFill ?? '', properties.textSize ?? '');
		}
		ctx.fillText(l, alignedX, y + lineHeight * i);
	});
	ctx.restore();
}

/**
 * Aligns canvas text based on the given parameters.
 * @param {number} originalCoordinate - The original coordinate of the text.
 * @param {number} maxWidth - The maximum width of the text.
 * @param {number} textWidth - The width of the text.
 * @param {CanvasTextAlignment} alignment - The alignment of the text.
 * @returns {number} - The aligned coordinate of the text.
 */
function alignCanvasText(
	originalCoordinate: number,
	maxWidth: number,
	textWidth: number,
	alignment: CanvasTextAlignment,
): number {
	switch (alignment) {
		case 'left':
			return originalCoordinate;
		case 'right':
			return originalCoordinate + maxWidth - textWidth;
		default:
			return originalCoordinate;
	}
}

/**
 * Draws an underline below the given text on a canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
 * @param {string} text - The text to underline.
 * @param {number} x - The x-coordinate of the starting point of the text.
 * @param {number} y - The y-coordinate of the starting point of the text.
 * @param {string} color - The color of the underline.
 * @param {string} textSize - The size of the text in pixels.
 */
export function underlineText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	color: string,
	textSize: string,
) {
	ctx.save();
	const textWidth = ctx.measureText(text).width;
	const startX = x;
	const endX = x + textWidth;
	const startY = y + 2; // shifts underline 2px lower than the text
	const endY = startY;
	let underlineHeight = parseInt(textSize, 10) / 15;

	if (underlineHeight < 1) {
		underlineHeight = 1;
	}

	ctx.beginPath();

	ctx.strokeStyle = color;
	ctx.lineWidth = underlineHeight;
	ctx.moveTo(startX, startY);
	ctx.lineTo(endX, endY);
	ctx.stroke();
	ctx.restore();
}

/**
 * Returns a string with the font size in pixels.
 *
 * @param {number} fontSize - The font size in points.
 * @returns {string} The font size in pixels as a string.
 */
export function getFontSizeInPx(fontSize: number): string {
	return `${fontSize}px`;
}

export function getLabelTextColorByBackgroundColor(
	bgColor: string,
	textColor: string,
	invertedTextColor: string,
): string {
	const rgb = Color.rgb(bgColor).array();
	const r = rgb[0];
	const g = rgb[1];
	const b = rgb[2];
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;

	return yiq < 128 ? textColor : invertedTextColor;
}
