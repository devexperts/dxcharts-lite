/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { YAxisAlign } from '../../chart.config';

/**
 * Draws a rounded rectangle on a canvas context
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
 * @param {number} x - The x-coordinate of the top-left corner of the rectangle
 * @param {number} y - The y-coordinate of the top-left corner of the rectangle
 * @param {number} width - The width of the rectangle
 * @param {number} height - The height of the rectangle
 * @param {number} [radius=4] - The radius of the corners of the rectangle
 * @param {boolean} [fill=true] - Whether or not to fill the rectangle
 * @param {boolean} [stroke=false] - Whether or not to stroke the rectangle
 */
export function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number = 4,
	fill: boolean = true,
	stroke: boolean = false,
) {
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
	if (fill) {
		ctx.fill();
	}
	if (stroke) {
		ctx.stroke();
	}
	ctx.restore();
}

/**
 * Draws a price label on a canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
 * @param {number} x0 - The x-coordinate of the starting point of the label.
 * @param {number} y0 - The y-coordinate of the starting point of the label.
 * @param {number} x1 - The x-coordinate of the middle point of the label.
 * @param {number} y1 - The y-coordinate of the middle point of the label.
 * @param {number} x2 - The x-coordinate of the ending point of the label.
 * @param {number} y2 - The y-coordinate of the ending point of the label.
 * @param {number} _width - The width of the label.
 * @param {boolean} rounded - Whether the label should have rounded corners.
 * @param {string} align - The alignment of the label on the y-axis. Can be 'left' or 'right'.
 * @param {number} radius - The radius of the rounded corners of the label.
 * @param {boolean} fill - Whether the label should be filled with color.
 * @param {boolean} stroke - Whether the label should have a stroke.
 */
export function drawPriceLabel(
	ctx: CanvasRenderingContext2D,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	_width: number,
	rounded: boolean,
	align: YAxisAlign,
	radius: number = 4,
	fill: boolean = true,
	stroke: boolean = false,
) {
	const width = align === 'right' ? _width : -_width;
	const xRadius = align === 'right' ? radius : -radius;
	const yRadius = radius;
	ctx.save();
	ctx.beginPath();
	if (rounded) {
		ctx.moveTo(x2 + xRadius, y2);
	} else {
		ctx.moveTo(x2, y2);
	}
	// rect
	if (rounded) {
		ctx.lineTo(x2 + width - xRadius, y2);
		ctx.quadraticCurveTo(x2 + width, y2, x2 + width, y2 - yRadius);
		ctx.lineTo(x2 + width, y0 + yRadius);
		ctx.quadraticCurveTo(x2 + width, y0, x2 + width - xRadius, y0);
		ctx.lineTo(x0 + xRadius, y0);
	} else {
		ctx.lineTo(x2 + width, y2);
		ctx.lineTo(x2 + width, y0);
		ctx.lineTo(x0, y0);
	}
	// triangle
	if (rounded) {
		ctx.quadraticCurveTo(x0, y0, x0 - xRadius / 3, y0 + yRadius / 3);
		ctx.lineTo(x1 + xRadius / 3, y1 - yRadius / 3);
		ctx.quadraticCurveTo(x1, y1, x1 + xRadius / 3, y1 + yRadius / 3);
		ctx.lineTo(x2 - xRadius / 3, y2 - yRadius / 3);
		ctx.quadraticCurveTo(x2, y2, x2 + xRadius / 3, y2);
	} else {
		ctx.lineTo(x1, y1);
		ctx.lineTo(x2, y2);
	}
	ctx.closePath();
	if (fill) {
		ctx.fill();
	}
	if (stroke) {
		ctx.stroke();
	}
	ctx.restore();
}

/**
 * Draws a line on a canvas context with the specified thickness.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
 * @param {number} x0 - The x-coordinate of the starting point of the line.
 * @param {number} y0 - The y-coordinate of the starting point of the line.
 * @param {number} x1 - The x-coordinate of the ending point of the line.
 * @param {number} y1 - The y-coordinate of the ending point of the line.
 * @param {number} [thickness=1] - The thickness of the line. Default is 1.
 *
 * @returns {void}
 */
export function drawLine(
	ctx: CanvasRenderingContext2D,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	thickness: number = 1,
) {
	ctx.save();
	ctx.lineWidth = thickness;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
	ctx.closePath();
	ctx.restore();
}

/**
 * Try to avoid anti-aliasing
 */
export function avoidAntialiasing(ctx: CanvasRenderingContext2D, draw: () => void): void {
	// TODO rework, potentially make it one time per DRAW event
	ctx.save();
	if (ctx.lineWidth % 2) {
		ctx.translate(0.5, 0.5);
	}
	draw();
	ctx.restore();
}

/**
 * Draws a filled rectangle on a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
 * @param {{x: number, y: number}} a - The first point of the rectangle.
 * @param {{x: number, y: number}} b - The second point of the rectangle.
 * @returns {void}
 
*/
export function fillRect(
	ctx: CanvasRenderingContext2D,
	a: {
		x: number;
		y: number;
	},
	b: {
		x: number;
		y: number;
	},
): void {
	const x = Math.min(a.x, b.x) + 0.5;
	const y = Math.min(a.y, b.y);
	const w = Math.abs(a.x - b.x);
	const h = Math.abs(a.y - b.y);
	ctx.fillRect(x, y, w, h);
}
