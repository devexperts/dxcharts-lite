/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Candle, generateCandleId } from '../../model/candle.model';
import { DataSeriesPoint } from '../../model/data-series.model';
import { Index, Timestamp } from '../../model/scaling/viewport.model';
import { firstOf, lastOf } from '../../utils/array.utils';
import { round } from '../../utils/math.utils';

export const DEFAULT_PERIOD = 60; // 1 minute

export const fakeCandle = (candles: Candle[], index: Index, period: number = DEFAULT_PERIOD): Candle => {
	const t = getTimestampOfIndex(candles, index, period);
	return {
		id: generateCandleId(t, t),
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
