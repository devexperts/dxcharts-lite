/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import VisualCandle from '../../../model/visual-candle';
import { typedEntries_UNSAFE } from '../../../utils/object.utils';
import { TimeFormatMatcher, timeFormatMatcherFactory } from './parser/time-formats-matchers.functions';
import { parseTimeFormatsFromKey } from './parser/time-formats-parser.functions';
import { validateParsedTimeFormat } from './parser/time-formats-validators.functions';
import { TimeFormatWithDuration } from './parser/time-formats.model';
import { getWeightFromTimeFormat } from './x-axis-weights.functions';

export interface WeightedPoint {
	weight: number;
}

/**
 * Returns the weight for a given date.
 * Under the hood compares given date and previous date, to prevent generating the same label twice.
 * It loops through the record of `weight` and corresponding {@link TimeFormatMatcher} pair, and tests the given date, if all the
 * conditions are true, and it match some matcher, the weight returned for the given date.
 * @see
 * Weights order matters!
 * @see
 * returns `null` if date doesn't match any condition
 */
const getWeightByDate = (
	currentDate: Date,
	previousDate: Date,
	sortedWeights: [number, TimeFormatMatcher][],
	tzOffset: (time: number) => Date,
): number => {
	const offsetCurrentDate = tzOffset(currentDate.getTime());
	const offsetPrevDate = tzOffset(previousDate.getTime());
	for (const [weight, timeMatcher] of sortedWeights) {
		if (timeMatcher(offsetCurrentDate, offsetPrevDate)) {
			return weight;
		}
	}
	// if date doesn't match any condition get the lowest weight
	return sortedWeights[sortedWeights.length - 1]?.[0] ?? 0;
};

/**
 * Transforms {@link VisualCandle} to {@link WeightedPoint}
 */
export function mapCandlesToWeightedPoints(
	visualCandles: VisualCandle[],
	sortedWeights: [number, TimeFormatMatcher][],
	tzOffset: (time: number) => Date,
): WeightedPoint[] {
	const result: WeightedPoint[] = new Array(visualCandles.length);

	// assume that candles` timestamp before the first visual candle is unreachable
	let prevDate = new Date(0);

	for (let i = 0; i < visualCandles.length; i++) {
		const currentCandle = visualCandles[i];
		const currentDate = new Date(currentCandle.candle.timestamp);

		const currentWeightedPoint: WeightedPoint = {
			weight: getWeightByDate(currentDate, prevDate, sortedWeights, tzOffset),
		};
		result[i] = currentWeightedPoint;
		prevDate = currentDate;
	}

	return result;
}

/**
 * Generates two maps for a given config.
 * 1st map is { [weight]: [format] } to control which format should be used for a given weight;
 * 2nd map is { [weight]: [Matcher] } to test a date for a match for a given weight;
 *
 * @example
 * const config: Record<TimeFormatWithDuration, string> = {
 *  'day_15': 'dd.MM',
 *  'month_7!': 'MMM'
 * }
 * const { map1, map2 } = generateWeightsMapForConfig(config);
 * // map1 = { 415: 'dd.MM', 607: 'MMM' };
 * // map2 = { 415: DayMatcher, 607: MonthMatcher }
 */
export const generateWeightsMapForConfig = (config: Record<TimeFormatWithDuration, string>) => {
	const weightToTimeFormatsDict: Record<number, string> = {};
	const weightToTimeFormatMatcherDict: Record<number, TimeFormatMatcher> = {};
	typedEntries_UNSAFE(config).forEach(([item, format]) => {
		const timeFormat = parseTimeFormatsFromKey(item);
		const validFormat = timeFormat === null ? false : validateParsedTimeFormat(timeFormat);
		if (timeFormat && validFormat) {
			const weight = getWeightFromTimeFormat(timeFormat);
			weightToTimeFormatsDict[weight] = format;
			weightToTimeFormatMatcherDict[weight] = timeFormatMatcherFactory(timeFormat);
		}
	});

	return { weightToTimeFormatsDict, weightToTimeFormatMatcherDict };
};
