/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Candle } from '../model/candle.model';
import { DataSeriesPoint } from '../model/data-series.model';
import { binarySearch, BinarySearchResult, firstOf, lastOf } from './array.utils';
import { floor } from './math.utils';

export const getDaysOnlyTimestampFn =
	(isDaysPeriod: boolean) =>
	(timestamp: number): number => {
		if (isDaysPeriod) {
			return new Date(timestamp).setHours(0, 0, 0, 0);
		}
		return timestamp;
	};
export const searchCandleIndex = (
	rawTimestamp: number,
	options: {
		extrapolate?: boolean;
		isDaysPeriod?: boolean;
	} = {},
	candles: DataSeriesPoint[],
	periodMs = 1000,
): BinarySearchResult => {
	const { extrapolate, isDaysPeriod } = options;
	const shouldExtrapolate = Boolean(extrapolate);
	const getDaysOnlyTimestamp = getDaysOnlyTimestampFn(Boolean(isDaysPeriod));
	const timestamp = getDaysOnlyTimestamp(rawTimestamp);
	const firstTimestamp = getDaysOnlyTimestamp(firstOf(candles)?.timestamp ?? 0);
	const lastTimestamp = getDaysOnlyTimestamp(lastOf(candles)?.timestamp ?? 0);

	if (timestamp > lastTimestamp) {
		// TODO rework the code below, it looks very very sus ( ≖.≖)
		if (shouldExtrapolate) {
			// div by 1000 because periodDuration is in seconds
			return {
				// -1 to skip fake candle and get the last existing/visible one if reached last index
				index: candles.length - 1 + Math.ceil((timestamp - lastTimestamp) / periodMs),
				exact: true,
			};
		} else {
			return {
				// -1 to skip fake candle and get the last existing/visible one if reached last index
				index: candles.length - 1,
				exact: true,
			};
		}
	} else if (timestamp < firstTimestamp) {
		if (shouldExtrapolate) {
			return {
				index: floor((timestamp - firstTimestamp) / periodMs),
				exact: true,
			};
		} else {
			return {
				index: -1,
				exact: true,
			};
		}
	} else {
		return binarySearch(candles, timestamp, candle => getDaysOnlyTimestamp(candle.timestamp));
	}
};

/**
 * checks if the first or the last candle or both have implied volatility data provided
 * @param candles
 * @returns {boolean}
 */
export const hasImpVolatilityDataProvided = (candles: Array<Candle>): boolean => {
	const firstCandle = candles[0];
	const lastCandle = candles[candles.length - 1];
	return (
		candles.length > 0 &&
		[firstCandle, lastCandle].some(
			c =>
				c !== undefined && c.impVolatility !== null && c.impVolatility !== undefined && !isNaN(c.impVolatility),
		)
	);
};
