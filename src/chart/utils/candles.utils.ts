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

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
/** Span below which a range cannot have shown every day of its week, so the day is repeated. */
const FULL_WEEK_SPAN_MS = WEEK_MS;
const MAX_WEEKLY_GRID_SLOTS = 20_160;
/*
 * Day indexes of Mon..Fri within the week weekOffsetOf counts from. The epoch fell on a Thursday,
 * so index 0 is Thursday and the weekend sits at 2 and 3.
 */
const WEEKDAY_INDEXES = [0, 1, 4, 5, 6];
/** Mean spacing this close to the period means no gap worth patterning, so the mean is exact. */
const GAPLESS_MEAN_RATIO = 1.05;

/**
 * Average distance in ms between two neighbour data points of the loaded range.
 *
 * The straight line through both ends of the loaded range, so it hits the first loaded point
 * exactly and never snaps at the edge - but its slope is re-estimated on every prepend, which is
 * what makes an out-of-range point wobble, and it reads a session gap as candles that are not
 * there. Right for a range with no gaps to misread, a poor guess for anything else.
 */
export const meanDataPointDurationMs = (dataPoints: DataSeriesPoint[], periodMs: number): number => {
	if (dataPoints.length < 2) {
		return periodMs;
	}
	const span = (lastOf(dataPoints)?.timestamp ?? 0) - (firstOf(dataPoints)?.timestamp ?? 0);
	if (!isFinite(span) || span <= 0) {
		return periodMs;
	}
	return span / (dataPoints.length - 1);
};

interface WeeklyGrid {
	readonly weekOffsets: number[];
	readonly densityFactor: number;
}

interface CachedWeeklyGrid {
	readonly length: number;
	readonly first: number;
	readonly last: number;
	readonly periodMs: number;
	readonly grid: WeeklyGrid | null;
}

const weeklyGridCache = new WeakMap<DataSeriesPoint[], CachedWeeklyGrid>();

const weekOffsetOf = (timestamp: number): number => ((timestamp % WEEK_MS) + WEEK_MS) % WEEK_MS;

const slotOrdinalOf = (weekOffsets: number[], timestamp: number): number => {
	const offset = weekOffsetOf(timestamp);
	let lo = 0;
	let hi = weekOffsets.length;
	while (lo < hi) {
		const mid = Math.floor((lo + hi) / 2);
		if (weekOffsets[mid] < offset) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	return Math.floor(timestamp / WEEK_MS) * weekOffsets.length + lo;
};

const timestampOfSlotOrdinal = (weekOffsets: number[], ordinal: number): number => {
	const week = Math.floor(ordinal / weekOffsets.length);
	return week * WEEK_MS + weekOffsets[ordinal - week * weekOffsets.length];
};

/** Slots actually seen, for a range long enough to have shown a whole week of them. */
const observedWeekOffsets = (dataPoints: DataSeriesPoint[]): number[] | null => {
	const offsets = new Set<number>();
	for (const dataPoint of dataPoints) {
		offsets.add(weekOffsetOf(dataPoint.timestamp));
		if (offsets.size > MAX_WEEKLY_GRID_SLOTS) {
			return null;
		}
	}
	return Array.from(offsets).sort((a, b) => a - b);
};

/**
 * Slots for a range too short to have shown its whole week, by repeating the day it did show.
 *
 * A day or two of data already carries the times of day the instrument trades; what it cannot carry
 * is which days of the week it trades at all, so Mon..Fri is assumed and any weekend day actually
 * seen is kept. The alternative is the mean, and the mean is what makes a small aggregation hurt:
 * a week of one-minute history is thousands of candles, far more than the first load, so the
 * pattern never used to be built at all and every out-of-range point fell back to a straight line
 * drawn through the session gaps.
 */
const dailyPatternWeekOffsets = (dataPoints: DataSeriesPoint[]): number[] | null => {
	const dayOffsets = new Set<number>();
	const tradingDays = new Set<number>(WEEKDAY_INDEXES);
	for (const dataPoint of dataPoints) {
		const weekOffset = weekOffsetOf(dataPoint.timestamp);
		dayOffsets.add(weekOffset % DAY_MS);
		tradingDays.add(Math.floor(weekOffset / DAY_MS));
	}
	if (dayOffsets.size * tradingDays.size > MAX_WEEKLY_GRID_SLOTS) {
		return null;
	}
	const offsets: number[] = [];
	for (const day of tradingDays) {
		for (const dayOffset of dayOffsets) {
			offsets.push(day * DAY_MS + dayOffset);
		}
	}
	return offsets.sort((a, b) => a - b);
};

/**
 * Slots the pattern holds on days the instrument turned out to be shut for.
 *
 * A holiday is a discrete event, not a rate. Left inside the density factor one missing session
 * gets spread evenly over every extrapolated slot, so a point a few days out of range comes back
 * short by a few percent of its distance - and that is the whole of the drift left once the
 * pattern itself is right. Weekends cost nothing to walk past here: the pattern holds no slots on
 * them, so they measure zero.
 */
const closedDaySlots = (dataPoints: DataSeriesPoint[], weekOffsets: number[], first: number, last: number): number => {
	const daysWithData = new Set<number>();
	for (const dataPoint of dataPoints) {
		daysWithData.add(Math.floor(dataPoint.timestamp / DAY_MS));
	}
	let slots = 0;
	for (let day = Math.floor(first / DAY_MS); day <= Math.floor(last / DAY_MS); day++) {
		if (!daysWithData.has(day)) {
			slots += slotOrdinalOf(weekOffsets, (day + 1) * DAY_MS) - slotOrdinalOf(weekOffsets, day * DAY_MS);
		}
	}
	return slots;
};

const buildWeeklyGrid = (dataPoints: DataSeriesPoint[], periodMs: number): WeeklyGrid | null => {
	const first = firstOf(dataPoints)?.timestamp;
	const last = lastOf(dataPoints)?.timestamp;
	if (first === undefined || last === undefined || periodMs > WEEK_MS) {
		return null;
	}
	/*
	 * Points sitting one period apart are already the uniform grid the mean assumes, which makes
	 * the mean exact for them. Only session gaps call for a pattern, and building one here would
	 * trade that exact answer for an assumption about which days of the week trade.
	 */
	if (meanDataPointDurationMs(dataPoints, periodMs) < periodMs * GAPLESS_MEAN_RATIO) {
		return null;
	}
	const weekOffsets =
		last - first < FULL_WEEK_SPAN_MS ? dailyPatternWeekOffsets(dataPoints) : observedWeekOffsets(dataPoints);
	if (weekOffsets === null || weekOffsets.length < 2) {
		return null;
	}
	// what is left once the closed days are set aside is how full an open day runs, which is a rate
	const openSlotsInRange =
		slotOrdinalOf(weekOffsets, last) -
		slotOrdinalOf(weekOffsets, first) -
		closedDaySlots(dataPoints, weekOffsets, first, last);
	if (openSlotsInRange < 1) {
		return null;
	}
	const densityFactor = (dataPoints.length - 1) / openSlotsInRange;
	if (!isFinite(densityFactor) || densityFactor <= 0) {
		return null;
	}
	return { weekOffsets, densityFactor };
};

const getWeeklyGrid = (dataPoints: DataSeriesPoint[], periodMs: number): WeeklyGrid | null => {
	const length = dataPoints.length;
	const first = dataPoints[0]?.timestamp ?? 0;
	const last = dataPoints[length - 1]?.timestamp ?? 0;
	const cached = weeklyGridCache.get(dataPoints);
	if (
		cached !== undefined &&
		cached.length === length &&
		cached.first === first &&
		cached.last === last &&
		cached.periodMs === periodMs
	) {
		return cached.grid;
	}
	const grid = buildWeeklyGrid(dataPoints, periodMs);
	weeklyGridCache.set(dataPoints, { length, first, last, periodMs, grid });
	return grid;
};

export const extrapolateIndexBeforeFirst = (
	dataPoints: DataSeriesPoint[],
	timestamp: number,
	periodMs: number,
): number => {
	const first = firstOf(dataPoints)?.timestamp;
	if (first === undefined) {
		return 0;
	}
	const grid = getWeeklyGrid(dataPoints, periodMs);
	if (grid === null) {
		return Math.min(0, Math.round((timestamp - first) / meanDataPointDurationMs(dataPoints, periodMs)));
	}
	const slots = slotOrdinalOf(grid.weekOffsets, first) - slotOrdinalOf(grid.weekOffsets, timestamp);
	return Math.min(0, -Math.round(grid.densityFactor * slots));
};

export const extrapolateTimestampBeforeFirst = (
	dataPoints: DataSeriesPoint[],
	index: number,
	periodMs: number,
): number => {
	const first = firstOf(dataPoints)?.timestamp;
	if (first === undefined) {
		return 0;
	}
	const grid = getWeeklyGrid(dataPoints, periodMs);
	if (grid === null) {
		return first + index * meanDataPointDurationMs(dataPoints, periodMs);
	}
	const estimate = Math.round(-index / grid.densityFactor);
	let slots = estimate;
	for (const candidate of [estimate, estimate + 1, estimate - 1]) {
		if (candidate >= 0 && -Math.round(grid.densityFactor * candidate) === index) {
			slots = candidate;
			break;
		}
	}
	return timestampOfSlotOrdinal(grid.weekOffsets, slotOrdinalOf(grid.weekOffsets, first) - slots);
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
				index: extrapolateIndexBeforeFirst(candles, rawTimestamp, periodMs),
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
					index: extrapolateIndexBeforeFirst(candles, rawTimestamp, periodMs),
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
		const prev = candles[index - 1]?.timestamp;
		const impliedStart = candles[index].timestamp - periodMs;
		if (prev === undefined || candles[index].timestamp - prev > periodMs) {
			return impliedStart;
		}
		return prev;
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
