/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CandleTimestampAnchor } from '../chart.config';
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

const searchOpenTimeCandleIndex = (
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

const searchCloseTimeCandleIndex = (
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

	if (!candles.length) {
		return {
			index: -1,
			exact: true,
		};
	}

	const firstTimestamp = getDaysOnlyTimestamp(firstOf(candles)?.timestamp ?? 0);
	const lastTimestamp = getDaysOnlyTimestamp(lastOf(candles)?.timestamp ?? 0);

	if (timestamp > lastTimestamp) {
		if (shouldExtrapolate) {
			return {
				index: candles.length - 1 + Math.ceil((timestamp - lastTimestamp) / periodMs),
				exact: true,
			};
		}
		return {
			index: candles.length - 1,
			exact: true,
		};
	}

	if (timestamp <= firstTimestamp) {
		const previousClose = getDaysOnlyTimestamp(candles[0]?.timestamp ?? firstTimestamp);
		const firstCandleStart = previousClose - periodMs;
		if (timestamp <= firstCandleStart) {
			if (shouldExtrapolate) {
				return {
					index: floor((timestamp - firstTimestamp) / periodMs),
					exact: true,
				};
			}
			return {
				index: -1,
				exact: true,
			};
		}
		return {
			index: 0,
			exact: timestamp === firstTimestamp,
		};
	}

	let lo = 0;
	let hi = candles.length;
	while (lo < hi) {
		const mid = floor((lo + hi) / 2);
		if (getDaysOnlyTimestamp(candles[mid].timestamp) < timestamp) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}

	const index = lo;
	return {
		index: index >= candles.length ? candles.length - 1 : index,
		exact: index < candles.length && getDaysOnlyTimestamp(candles[index].timestamp) === timestamp,
	};
};

export const searchCandleIndex = (
	rawTimestamp: number,
	options: {
		extrapolate?: boolean;
		isDaysPeriod?: boolean;
		candleTimestampAnchor?: CandleTimestampAnchor;
	} = {},
	candles: DataSeriesPoint[],
	periodMs = 1000,
): BinarySearchResult => {
	const anchor = options.candleTimestampAnchor ?? 'open';
	if (anchor === 'close') {
		return searchCloseTimeCandleIndex(rawTimestamp, options, candles, periodMs);
	}
	return searchOpenTimeCandleIndex(rawTimestamp, options, candles, periodMs);
};

export const getCandleStart = (
	candles: DataSeriesPoint[],
	index: number,
	periodMs: number,
	anchor: CandleTimestampAnchor,
): number => {
	if (anchor === 'close') {
		return candles[index - 1]?.timestamp ?? candles[index].timestamp - periodMs;
	}
	return candles[index].timestamp;
};

export const getCandleEnd = (candle: DataSeriesPoint, periodMs: number, anchor: CandleTimestampAnchor): number =>
	anchor === 'close' ? candle.timestamp : candle.timestamp + periodMs;

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
