/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, share } from 'rxjs/operators';
import { ChartBaseElement } from '../chart-base-element';
import { ViewportMovementAnimation } from '../../animation/types/viewport-movement-animation';
import { keys } from '../../utils/object.utils';
import { Bounds } from '../bounds.model';

// Basic:
// ---------
// width = 5000u
// widthPx = 1000px
// zoom = uInPx = width / widthPx = 5u/px
// x = 1200u
// xPx = x / uInPx = 240px

// Default zoom 100 fixed candles:
// ---------
// candleW = 10u
// defaultCandlesAmount = 100
// defaultViewportWidth = candleW * defaultCandlesAmount = 1000u
// zoom = uInPx = defaultViewportWidth / widthPx = 1u/px
// x = 1200u
// xPx = x / zoom = 1200px (out of bounds)
// x = 200u
// xPx = 200px

// Enforce 150 candles at the end of various length:
// ---------
// widthViewport = sumWidth(LAST_150_CANDLES) = 600u
// zoom = widthViewport / widthPx = 0.6u/px
// xOffset = width - widthViewport = 4400u

// Calculate zoom using xEnd:
// ---------
// width = 5000u
// widthPx = 1000px
// xOffset (xStart) = 1200u
// xEnd = 2500u
// widthViewport = (xEnd - xOffset) = 1300u
// zoom = widthViewport / widthPx = 1.3u/px

// logical value on axis: timestamp, price, volume, percent or anything else
export type Unit = number;
export type Price = number;
export type Pixel = number;
// units per pixel
export type Zoom = number;
export const calculateZoom = (viewportUnits: Unit, viewportPixels: Pixel): Zoom => viewportUnits / viewportPixels;
export const unitToPixels = (units: Unit, zoom: Zoom): Pixel => units / zoom;
export const pixelsToUnits = (px: Pixel, zoom: Zoom): Unit => px * zoom;
// index, timestamp are specific cases of unit
export type Index = Unit;
export type Timestamp = Unit;
// percent unit and it's calculations
export type Percent = Unit;
export type LogValue = Unit;
export type YUnit = Price | Percent | LogValue;
export const unitToPercent = (value: Unit, baseLine: Unit): Percent => ((value - baseLine) * 100) / baseLine;
export const percentToUnit = (percent: Percent, baseLine: Unit): Unit => (percent * baseLine) / 100 + baseLine;
// log calculations
export const calcLogValue = (value: Price): LogValue => Math.log2(value);
export const logValueToUnit = (logValue: LogValue) => Math.pow(2, logValue);

/**
 * This interface describes chart entity which transforms some units to pixel values.
 * We need to separate this interface and viewport-model.
 * Viewport model describes piece of chart viewport:
 * - main chart pane
 * - underlay study pane
 *
 * But sometimes in viewport we have units which are not the price (price is default unit for y-axis).
 * In this case we need special logic to convert price to viewport units and this logic might vary for different chart entities.
 * A good example is chart candle series:
 * let's assume we use percents for as y-axis units, then each candle series will use their own logic to get percent unit from the price.
 * Thus, we need to segregate interface of ViewportModel and Viewable interface.
 * You can think of ViewportModel as a screen and Viewable as a figure which should be drawn on the screen.
 */
export interface Viewable {
	toX(unit: Unit): Pixel;
	toY(unit: Unit): Pixel;
	// xPixels and yPixels converts some value to pixel (length in pixels)
	xPixels(unit: Unit): Pixel;
	yPixels(unit: Unit): Pixel;
}

/**
 * Represents state of ViewportModel.
 * When the model is calculated step-by-step, this state acts like an intermediate result.
 * Only when all calculations are complete - we {@link ViewportModel#apply} result.
 */
export interface ViewportModelState {
	xStart: Unit;
	xEnd: Unit;
	yStart: Unit;
	yEnd: Unit;
	zoomX: Zoom;
	zoomY: Zoom;
	inverseY: boolean;
}

/**
 * Abstract viewport model.
 * Viewport has 4 coordinates: xStart, xEnd, yStart and yEnd - all stored in {@link Unit}.
 * Main methods:
 * - {@link toX} - converts xUnits to xPixels
 * - {@link toY} - converts yUnits to yPixels
 * - {@link fromX} - converts xPixels to xUnits
 * - {@link fromY} - converts yPixels to yUnits
 *
 * To convert unit-pixels and vice versa uses {@link getBounds} method.
 * zoomX and zoomY are proportions between units and pixels.
 */
export abstract class ViewportModel extends ChartBaseElement implements Viewable {
	currentAnimation?: ViewportMovementAnimation;
	//region base viewport model props
	private _xStart: Unit = 0;
	private _xEnd: Unit = 0;
	private _yStart: Unit = 0;
	private _yEnd: Unit = 0;
	private _zoomX: Zoom = 1;
	private _zoomY: Zoom = 1;
	//endregion
	// toggle Y inverse mode
	private _inverseY: boolean = false;
	// bounds are different: CHART, VOLUMES, STUDIES, ...
	/**
	 * An abstract method that returns the bounds of a chart, volumes, studies, etc.
	 * @returns {Bounds} The bounds of the specified element.
	 */
	abstract getBounds(): Bounds;
	//region subjects
	public changed = new Subject<void>();
	public xChanged = this.changed.pipe(
		map(() => ({
			start: this.xStart,
			end: this.xEnd,
		})),
		distinctUntilChanged((p, c) => p.start === c.start && p.end === c.end),
		share(),
	);
	public yChanged = this.changed.pipe(
		map(() => ({
			start: this.yStart,
			end: this.yEnd,
		})),
		distinctUntilChanged((p, c) => p.start === c.start && p.end === c.end),
		share(),
	);
	//endregion
	//region conversion methods
	/**
	 * Converts a unit value to pixels based on the current zoom level and xStart value.
	 * @param {Unit} unit - The unit value to be converted to pixels.
	 * @returns {Pixel} - The converted pixel value.
	 */
	toX(unit: Unit): Pixel {
		return this.getBounds().x + unitToPixels(unit - this.xStart, this.zoomX);
	}

	/**
	 * Converts a unit value to pixels based on the current zoom level in the x-axis.
	 * @param {Unit} unit - The unit value to be converted to pixels.
	 * @returns {Pixel} - The converted value in pixels.
	 */
	xPixels(unit: Unit): Pixel {
		return unitToPixels(unit, this.zoomX);
	}

	/**
	 * Converts a given unit value to pixel value in the Y-axis.
	 * @param {Unit} unit - The unit value to be converted to pixel value.
	 * @returns {Pixel} - The pixel value of the given unit value in the Y-axis.
	 */
	toY(unit: Unit): Pixel {
		if (this.inverseY) {
			return this.getBounds().y + unitToPixels(unit - this.yStart, this.zoomY);
		} else {
			// inverse by default because canvas calculation [0,0] point starts from top-left corner
			return this.getBounds().y + this.getBounds().height - unitToPixels(unit - this.yStart, this.zoomY);
		}
	}

	/**
	 * Converts a unit value to pixels based on the current zoom level in the Y axis.
	 * @param {Unit} unit - The unit value to be converted to pixels.
	 * @returns {Pixel} - The converted value in pixels.
	 */
	yPixels(unit: Unit): Pixel {
		return unitToPixels(unit, this.zoomY);
	}

	/**
	 * Converts a pixel value to a unit value based on the current zoom level and xStart value.
	 * @param {Pixel} px - The pixel value to convert to unit value.
	 * @returns {Unit} - The converted unit value.
	 */
	fromX(px: Pixel): Unit {
		const normalizedPx = px - this.getBounds().x;
		return pixelsToUnits(normalizedPx + unitToPixels(this.xStart, this.zoomX), this.zoomX);
	}

	/**
	 * Converts a pixel value to a unit value along the y-axis.
	 * @param {Pixel} px - The pixel value to be converted.
	 * @returns {void}
	 */
	fromY(px: Pixel): Unit {
		const normalizedPx = px - this.getBounds().y;
		if (this.inverseY) {
			return pixelsToUnits(normalizedPx + unitToPixels(this.yStart, this.zoomY), this.zoomY);
		} else {
			// inverse by default because canvas calculation [0,0] point starts from top-left corner
			return pixelsToUnits(
				this.getBounds().height - normalizedPx + unitToPixels(this.yStart, this.zoomY),
				this.zoomY,
			);
		}
	}

	//endregion
	/**
	 * Recalculates the zoom factor for the x-axis based on the start and end values of the x-axis.
	 * @function
	 * @name recalculateZoomX
	 * @memberof ClassName
	 * @instance
	 * @returns {void}
	 */
	recalculateZoomX() {
		this.zoomX = this.calculateZoomX(this.xStart, this.xEnd);
	}

	/**
	 * Recalculates the zoomY property of the object.
	 * The zoomY property is calculated using the yStart and yEnd properties of the object.
	 * @function
	 * @name recalculateZoomY
	 * @memberof Object
	 * @instance
	 * @returns {void}
	 */
	recalculateZoomY() {
		this.zoomY = this.calculateZoomY(this.yStart, this.yEnd);
	}

	/**
	 * Calculates the zoom factor for the x-axis based on the start and end units.
	 * @param {Unit} start - The start unit.
	 * @param {Unit} end - The end unit.
	 * @returns {Zoom} The zoom factor for the x-axis.
	 */
	calculateZoomX(start: Unit, end: Unit): Zoom {
		return calculateZoom(end - start, this.getBounds().width);
	}

	/**
	 * Calculates the zoom factor for the Y axis based on the start and end units.
	 * @param {Unit} start - The start unit.
	 * @param {Unit} end - The end unit.
	 * @returns {Zoom} The zoom factor for the Y axis.
	 */
	calculateZoomY(start: Unit, end: Unit): Zoom {
		return calculateZoom(end - start, this.getBounds().height);
	}

	/**
	 * Should be called when x/y start/end changes.
	 */
	public recalculateZoom(fireChanged = true) {
		this.recalculateZoomX();
		this.recalculateZoomY();
		fireChanged && this.fireChanged();
	}

	/**
	 * Moves the viewport to exactly xStart..xEnd place.
	 * (you need to fire DRAW event after this)
	 * @param xStart - viewport start in units
	 * @param xEnd - viewport end in units
	 * @param fireChanged - fire changed event
	 */
	public setXScale(xStart: Unit, xEnd: Unit, fireChanged = true) {
		this.xStart = xStart;
		this.xEnd = xEnd;
		this.recalculateZoomX();
		fireChanged && this.fireChanged();
	}

	/**
	 * Moves the viewport to exactly yStart..yEnd place.
	 * (you need to fire DRAW event after this)
	 * @param yStart - viewport start in units
	 * @param yEnd - viewport end in units
	 * @param fireChanged - fire changed event
	 */
	public setYScale(yStart: Unit, yEnd: Unit, fireChanged = true) {
		this.yStart = yStart;
		this.yEnd = yEnd;
		this.recalculateZoomY();
		fireChanged && this.fireChanged();
	}

	/**
	 * Exports current state of VM.
	 */
	export(): ViewportModelState {
		return {
			xStart: this.xStart,
			xEnd: this.xEnd,
			yStart: this.yStart,
			yEnd: this.yEnd,
			zoomX: this.zoomX,
			zoomY: this.zoomY,
			inverseY: this.inverseY,
		};
	}

	/**
	 * Applies the state to current VM.
	 * @param state
	 */
	apply(state: ViewportModelState) {
		this.xStart = state.xStart;
		this.xEnd = state.xEnd;
		this.yStart = state.yStart;
		this.yEnd = state.yEnd;
		this.zoomX = state.zoomX;
		this.zoomY = state.zoomY;
		this.inverseY = state.inverseY;
		this.fireChanged();
	}

	/**
	 * Emits a notification that the object has changed.
	 * @function
	 * @name fireChanged
	 * @memberof ClassName
	 * @instance
	 * @returns {void}
	 */
	public fireChanged() {
		this.changed.next();
	}

	get xStart(): Unit {
		return this._xStart;
	}

	set xStart(value: Unit) {
		this._xStart = value;
	}

	get xEnd(): Unit {
		return this._xEnd;
	}

	set xEnd(value: Unit) {
		this._xEnd = value;
	}

	get yStart(): Unit {
		return this._yStart;
	}

	set yStart(value: Unit) {
		this._yStart = value;
	}

	get yEnd(): Unit {
		return this._yEnd;
	}

	set yEnd(value: Unit) {
		this._yEnd = value;
	}

	get zoomX(): Zoom {
		return this._zoomX;
	}

	set zoomX(value: Zoom) {
		this._zoomX = value;
	}

	get zoomY(): Zoom {
		return this._zoomY;
	}

	set zoomY(value: Zoom) {
		this._zoomY = value;
	}

	get inverseY(): boolean {
		return this._inverseY;
	}

	set inverseY(value: boolean) {
		this._inverseY = value;
	}

	/**
	 * Checks if the viewport is valid.
	 *
	 * @returns {boolean} - Returns true if the viewport is valid, false otherwise.
	 */
	isViewportValid() {
		return this.xStart !== this.xEnd && this.yStart !== this.yEnd && isFinite(this.yStart) && isFinite(this.yEnd);
	}
}

export const compareStates = (a: ViewportModelState, b: ViewportModelState): boolean =>
	!keys(a).some(k => a[k] !== b[k]);
