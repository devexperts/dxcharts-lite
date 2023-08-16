/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { floorToDPR, roundToDPR } from '../utils/device/device-pixel-ratio.utils';
import { Candle } from './candle.model';
import { Pixel, Unit, Viewable } from './scaling/viewport.model';
import { PriceMovement } from './candle-series.model';
import { VisualSeriesPoint } from './data-series.model';

/**
 * Candle's visual representation. Candle's coordinates are adjusted by .5 unit to prevent anti-aliasing effect for
 * lines with 1px width
 *
 * @param x wick location on X-axis
 * @param width candle's width
 * @param op open price location on Y axis
 * @param cl close price location on Y axis
 * @param lineStart wick's top location on Y axis
 * @param lineEnd wick's bottom location on Y axis
 * @param name candle's direction: up | down | none
 * @param candle original candle
 * @param hasBorder flag denoting if border should be drawn
 * @constructor
 */
export default class VisualCandle extends VisualSeriesPoint {
	public width: Unit; // candle's width
	public high: Unit;
	public low: Unit;
	public open: Unit;
	public name: PriceMovement; // candle's direction
	public candle: Candle; // original candle
	public startUnit: Unit; // leftmost coordinate
	public hasBorder: boolean; // flag denoting if border should be drawn
	public isActive: boolean;
	public isHollow: boolean;
	constructor(
		x: number,
		width: number,
		open: number,
		close: number,
		high: number,
		low: number,
		name: PriceMovement,
		candle: Candle,
		hasBorder: boolean = false,
		isActive = false,
		isHollow = false,
	) {
		super(x, close);
		this.startUnit = x - width / 2;
		this.width = width;
		this.open = open;
		this.high = high;
		this.low = low;
		this.name = name;
		this.candle = candle;
		this.hasBorder = hasBorder;
		this.isActive = isActive;
		this.isHollow = isHollow;
	}
	/**
	 * Calculates the height of the body of a viewable element.
	 * @param {Viewable} viewable - The viewable element.
	 * @returns {Pixel} - The height of the body in pixels.
	 */
	bodyHeight(viewable: Viewable): Pixel {
		return floorToDPR(Math.abs(viewable.toY(this.open) - viewable.toY(this.close)));
	}
	/**
	 * Calculates the height of a candle in pixels based on the high and low values of the candle and the viewable area.
	 *
	 * @param {Viewable} viewable - The viewable area object.
	 * @returns {Pixel} - The height of the candle in pixels.
	 */
	candleHeight(viewable: Viewable): Pixel {
		return floorToDPR(Math.abs(viewable.toY(this.high) - viewable.toY(this.low)));
	}
	/**
	 * Returns coordinates of vertical line used to draw candle's body in case of small candle width
	 * @returns {[x,y,x2,y2]}
	 */
	bodyAsVLine(viewable: Viewable): [number, number, number, number] | undefined {
		if (this.width < 2) {
			return [this.centerUnit, this.yLineStart(viewable), this.width, this.candleHeight(viewable)];
		}
	}
	/**
	 * Returns rectangle used to draw candles' body
	 * @returns {[x,y,width,height]}
	 */
	bodyRect(viewable: Viewable): [number, number, number, number] {
		// candle is drawn using wick as center
		return [this.startUnit, this.yBodyStart(viewable), this.width, this.bodyHeight(viewable)];
	}
	/**
	 * Returns the current candle object.
	 *
	 * @returns {Candle} The current candle object.
	 */
	getCandle(): Candle {
		return this.candle;
	}
	/**
	 * Returns candle Y points in ascending order
	 */
	yBodyKeyPoints(viewable: Viewable): [Pixel, Pixel, Pixel, Pixel] {
		const highY = floorToDPR(viewable.toY(this.high));
		const lowY = floorToDPR(viewable.toY(this.low));
		const openY = floorToDPR(viewable.toY(this.open));
		const closeY = floorToDPR(viewable.toY(this.close));
		const [bodyStart, bodyEnd] = openY > closeY ? [closeY, openY] : [openY, closeY];
		const [lineStart, lineEnd] = highY > lowY ? [lowY, highY] : [highY, lowY];
		return [lineStart, bodyStart, bodyEnd, lineEnd];
	}
	/**
	 * Calculates the y-coordinate of the end of a line segment that is within the viewable area.
	 * @param {Viewable} viewable - The viewable area object.
	 * @returns {Pixel} - The y-coordinate of the end of the line segment in pixels.
	 */
	yLineEnd(viewable: Viewable): Pixel {
		return floorToDPR(Math.max(viewable.toY(this.high), viewable.toY(this.low)));
	}
	/**
	 * Returns the pixel value of the starting point of the y-axis line on the given viewable area.
	 * @param {Viewable} viewable - The viewable area to calculate the pixel value on.
	 * @returns {Pixel} - The pixel value of the starting point of the y-axis line.
	 */
	yLineStart(viewable: Viewable): Pixel {
		return floorToDPR(Math.min(viewable.toY(this.high), viewable.toY(this.low)));
	}
	/**
	 * Calculates the starting y-coordinate of the body of a viewable object.
	 * @param {Viewable} viewable - The viewable object for which the starting y-coordinate of the body is to be calculated.
	 * @returns {Pixel} - The starting y-coordinate of the body of the viewable object.
	 */
	yBodyStart(viewable: Viewable): Pixel {
		return floorToDPR(Math.min(viewable.toY(this.open), viewable.toY(this.close)));
	}
	/**
	 * Calculates the maximum pixel value of the y-coordinate of the viewable object's end point and the open and close values of the current object.
	 * @param {Viewable} viewable - The viewable object whose end point is to be compared with the open and close values of the current object.
	 * @returns {Pixel} - The maximum pixel value of the y-coordinate of the viewable object's end point and the open and close values of the current object.
	 */
	yBodyEnd(viewable: Viewable): Pixel {
		return floorToDPR(Math.max(viewable.toY(this.open), viewable.toY(this.close)));
	}
	/**
	 * Calculates the x-coordinate of the center of a viewable object in pixels.
	 * @param {Viewable} viewable - The viewable object whose center is to be calculated.
	 * @returns {Pixel} - The x-coordinate of the center of the viewable object in pixels.
	 */
	xCenter(viewable: Viewable): Pixel {
		return this.x(viewable);
	}

	/**
	 * Returns the starting pixel position of a viewable object
	 * @param {Viewable} viewable - The viewable object to get the starting pixel position from
	 * @returns {Pixel} - The starting pixel position of the viewable object
	 */
	xStart(viewable: Viewable): Pixel {
		return roundToDPR(viewable.toX(this.startUnit));
	}
}
