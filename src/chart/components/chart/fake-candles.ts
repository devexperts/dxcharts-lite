/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Candle, nameDirection } from '../../model/candle.model';
import { DataSeriesPoint, VisualSeriesPoint } from '../../model/data-series.model';
import { Index, Pixel, Timestamp, Unit } from '../../model/scaling/viewport.model';
import VisualCandle from '../../model/visual-candle';
import { firstOf, lastOf } from '../../utils/array.utils';
import { round } from '../../utils/math.utils';

const DEFAULT_PERIOD = 60; // 1 minute

/**
 * Generates fake candle for left and right "out of data range" zones.
 * Requires period to calculate the fake timestamp.
 * The timestamp won't take session breaks or holidays into account.
 */
export const fakeVisualCandle = (
	dataPoints: Candle[],
	visualCandles: VisualCandle[],
	candleWidth: number,
	index: Index,
	period: number = DEFAULT_PERIOD,
): VisualCandle => {
	const candle = fakeCandle(dataPoints, index, period);
	// in case we have equivolume
	candle.volume = candleWidth;
	let x: Pixel;
	if (visualCandles.length === 0) {
		x = 0;
	} else if (index >= visualCandles.length) {
		const lastCandle = visualCandles[visualCandles.length - 1];
		const candlesCountInBetween = index - (visualCandles.length - 1);
		const offsetFromLast: Unit = candlesCountInBetween * candleWidth;
		x = lastCandle.centerUnit + offsetFromLast;
	} else {
		const firstCandle = visualCandles[0];
		const candlesCountInBetween = -index;
		const offsetFromFirst: Unit = candlesCountInBetween * candleWidth;
		x = firstCandle.centerUnit - offsetFromFirst;
	}
	return new VisualCandle(
		x,
		candleWidth,
		candle.open,
		candle.close,
		candle.lo,
		candle.hi,
		nameDirection(candle.open, candle.close),
		candle,
	);
};

export const fakeVisualPoint = (
	dataPoints: DataSeriesPoint[],
	visualPoints: VisualSeriesPoint[],
	meanDataWidth: number,
	index: Index,
	period: number = DEFAULT_PERIOD,
): VisualSeriesPoint => {
	const candle = fakeDataPoint(dataPoints, index, period);
	let x: Pixel;
	if (visualPoints.length === 0) {
		x = 0;
	} else if (index >= visualPoints.length) {
		const lastCandle = visualPoints[visualPoints.length - 1];
		const candlesCountInBetween = index - (visualPoints.length - 1);
		const offsetFromLast: Unit = candlesCountInBetween * meanDataWidth;
		x = lastCandle.centerUnit + offsetFromLast;
	} else {
		const firstCandle = visualPoints[0];
		const candlesCountInBetween = -index;
		const offsetFromFirst: Unit = candlesCountInBetween * meanDataWidth;
		x = firstCandle.centerUnit - offsetFromFirst;
	}
	return new VisualSeriesPoint(x, candle.close);
};

export const fakeCandle = (candles: Candle[], index: Index, period: number = DEFAULT_PERIOD): Candle => {
	const t = getTimestampOfIndex(candles, index, period);
	return {
		hi: NaN,
		lo: NaN,
		open: NaN,
		close: NaN,
		timestamp: t,
		volume: NaN,
		expansion: true,
		idx: index,
	};
};

export const fakeDataPoint = (
	candles: DataSeriesPoint[],
	index: Index,
	period: number = DEFAULT_PERIOD,
): DataSeriesPoint => {
	const t = getTimestampOfIndex(candles, index, period);
	return {
		close: NaN,
		timestamp: t,
	};
};

/**
 * Returns the timestamp of a given index in an array of candles.
 * @param {Candle[]} candles - An array of candles.
 * @param {Index} index - The index of the candle to get the timestamp from.
 * @param {number} [period=DEFAULT_PERIOD] - The period of the candles in milliseconds.
 * @returns {Timestamp} The timestamp of the candle at the given index or 0 if the array is empty or the index is out of bounds.
 */
function getTimestampOfIndex(candles: DataSeriesPoint[], index: Index, period: number = DEFAULT_PERIOD): Timestamp {
	const _index = round(index);
	if (candles.length === 0) {
		return 0;
	}
	const lastCandle = lastOf(candles);
	if (_index >= candles.length && lastCandle) {
		return fakeTimestamp(lastCandle, candles.length - 1, _index, period);
	}
	const firstCandle = firstOf(candles);
	if (_index < 0 && firstCandle) {
		return fakeTimestamp(firstCandle, 0, _index, period);
	}
	return candles[_index]?.timestamp ?? 0;
}

const fakeTimestamp = (
	candle: DataSeriesPoint,
	candleIdx: Index,
	index: Index,
	period: number = DEFAULT_PERIOD,
): Timestamp => candle.timestamp + (index - (candleIdx ?? 0)) * period;
