/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
	eachDayOfInterval,
	isSameDay,
	isMonday,
	isTuesday,
	isWednesday,
	isThursday,
	isFriday,
	isSaturday,
	isSunday,
	startOfMonth,
	endOfMonth,
} from 'date-fns/esm';
import {
	ParsedCTimeFormat,
	ParsedNCTimeFormat,
	ParsedTimeFormat,
	ParsedWeekFormat,
	TimeFormat,
} from './time-formats.model';

/**
 * {@link TimeFormatMatcher} is a function that controls does passed {@link Date} match the {@link ParsedTimeFormat}
 * that matcher is responsible for.
 * Moreover {@link TimeFormatMatcher} compares dates to prevent including the same date
 * for a corresponding period twice.
 * @see
 * Basically you need to use {@link timeFormatMatcherFactory}, because it'll catch up the
 * matcher for the given {@link ParsedTimeFormat} automatically
 * @example
 * // In examples we will test the `currentDate`
 *
 * const currentDate = new Date('Fri Feb 10 2023 14:50:10 GMT+0500');
 * const prevDate = new Date('Fri Feb 09 2023 14:50:10 GMT+0500');
 * // that `timeFormat` means, that we want to get only dates
 * // that represents days that are divisible by 10 (10, 20, 30)
 * const timeFormat: ParsedTimeFormat = {
 * 	key: 'day',
 *     value: 10,
 *     exact: false
 * };
 * // `timeFormatMatcherFactory` will automatically get the matcher for a given `timeFormat`
 * const matcher = timeFormatMatcherFactory(timeFormat)
 *
 * // `true`, because `Feb 10' is divisible by 10,
 * // and the `previousDate` was not the same `day`
 * const applicable = matcher(currentDate)(prevDate); // true
 *
 * @example
 * const currentDate = new Date('Fri Feb 10 2023 14:50:10 GMT+0500');
 * const prevDate = new Date('Fri Feb 09 2023 14:50:10 GMT+0500');
 * // that `timeFormat` means, that we want to get only dates
 * // that represents months that are divisible by 3 (March, June etc.)
 * const timeFormat: ParsedTimeFormat = {
 * 	key: 'month',
 *     value: 3,
 *     exact: false
 * };
 * const matcher = timeFormatMatcherFactory(timeFormat)
 * // `false`, because `Feb 02' i.e 2
 * // is not divisible by 3, and the `previousDate` is `Feb` i.e the same `month`
 * const applicable = matcher(currentDate)(prevDate); // false
 */

export type TimeFormatMatcher = (currentDate: Date, prevDate: Date) => boolean;

/**
 * Factory that return a {@link TimeFormatMatcher} function for a given {@link ParsedTimeFormats}
 * @see
 * Detailed explanation you can find here {@link TimeFormatMatcher}
 */
export const timeFormatMatcherFactory = <T extends ParsedTimeFormat>(timeFormat: T): TimeFormatMatcher => {
	switch (timeFormat.key) {
		case 'lessThanSecond':
			return lessThanSecondMatcherFactory(timeFormat);
		case 'month':
			return monthMatcherFactory(timeFormat);
		case 'second':
		case 'minute':
		case 'hour':
		case 'day':
		case 'year':
			return commonMatcherFactory(timeFormat);
		case 'week-weekday':
			return weekWeekdayMatcherFactory(timeFormat);
		default:
			return () => false;
	}
};

/**
 * Returns a `number` for a given {@link Date} and {@link TimeFormat}
 * @example
 * const date = new Date('Fri Feb 14 2023 14:50:10 GMT+0500');
 * const timeFormat: TimeFormat = 'day';
 * // `getTimeFromDateByTimeFormat` will return days from given date and it will be 14, because `Feb 14`
 * const days = getTimeFromDateByTimeFormat(date, timeFormat); // 14
 */
const getTimeFromDateByTimeFormat = (date: Date, timeFormat: TimeFormat) => {
	switch (timeFormat) {
		case 'lessThanSecond':
			return date.getMilliseconds();
		case 'month':
			return date.getMonth();
		case 'second':
			return date.getSeconds();
		case 'minute':
			return date.getMinutes();
		case 'hour':
			return date.getHours();
		case 'day':
			return date.getDate();
		case 'year':
			return date.getFullYear();
		case 'week-weekday':
			return date.getDate();
	}
};

/**
 * Checks if the given dates are not the same for a given {@link TimeFormat}
 * @example
 * const date1 = new Date('Fri Feb 10 2023 14:50:10 GMT+0500');
 * const date2 = new Date('Fri Feb 09 2023 14:50:10 GMT+0500');
 * const timeFormat: TimeFormat = 'day';
 * // `true` because it takes days from `Feb 10` and `Feb 09`, and 10 !== 9
 * const notTheSame = datesNOTtheSame(timeFormat)(date1, date2); // true
 *
 */
const datesNOTtheSame = (key: TimeFormat) => (currentDate: Date, prevDate: Date) => {
	const currentTime = getTimeFromDateByTimeFormat(currentDate, key);
	const prevTime = getTimeFromDateByTimeFormat(prevDate, key);

	return currentTime !== prevTime;
};

/**
 * Checks if the given dates are are bigger or equal for a given {@link TimeFormat}
 * @example
 * const date1 = new Date('Fri Feb 10 2023 14:50:10 GMT+0500');
 * const date2 = new Date('Fri Feb 10 2023 14:50:10 GMT+0500');
 * const timeFormat: TimeFormat = 'day';
 * // `true` because it takes days from `Feb 10` and `Feb 10`, and 10 === 10
 * const areTheSame = datesAreTheSame(timeFormat)(date1, date2); // true
 */
const datesBiggerOrEqual = (key: TimeFormat) => (currentDate: Date, prevDate: Date) => {
	const currentTime = getTimeFromDateByTimeFormat(currentDate, key);
	const prevTime = getTimeFromDateByTimeFormat(prevDate, key);

	return currentTime >= prevTime;
};

//#region TimeFormat matchers
const weekdayCheckDict: Record<number, (date: Date | number) => boolean> = {
	1: isMonday,
	2: isTuesday,
	3: isWednesday,
	4: isThursday,
	5: isFriday,
	6: isSaturday,
	7: isSunday,
};

/**
 * Checks if the given {@link Date} matches with `weekMatchValue` and `weekdayMatchValue`
 * @example
 * const date = new Date('Fri Feb 10 2023 14:50:10 GMT+0500');
 * // '$' means last week of the month
 * const weekMatchValue = '$';
 * // 5 means Friday
 * const weekdayMatchValue = 5;
 * // to sum up '$' and 5 means `last Friday in month`
 *
 * // false, because `Feb 10` is 2nd Friday in Feb 2023
 * const match = weekWeekdayMatch(date, weekMatchValue, weekdayMatchValue); // false
 *
 * @example
 * const date = new Date('Tue Feb 7 2023 14:50:10 GMT+0500');
 * // 1 means first week of the month
 * const weekMatchValue = 1;
 * // 2 means Tuesday
 * const weekdayMatchValue = 2;
 * // to sum up 1 and 2 means `first Tuesday in month`
 *
 * // true, but there's a tricky part:
 * // Feb 2023 doesn't have a Tuesday on the first week, so for such cases
 * // match function will take the next week, and search Tuesday on it.
 * // Therefore weekMatchValue becomes 2, and 2nd weeks' Tuesday in Feb 2023 is Feb 7
 * const match = weekWeekdayMatch(date, weekMatchValue, weekdayMatchValue); // true
 */
const weekWeekdayMatch = (date: Date, weekMatchValue: number | '$', weekdayMatchValue: number) => {
	const fullMonthInterval = eachDayOfInterval({
		start: startOfMonth(date),
		end: endOfMonth(date),
	});

	const weekdayCheckFn = weekdayCheckDict[weekdayMatchValue] ?? (() => false);

	if (weekMatchValue === '$') {
		for (const dateOfInterval of fullMonthInterval.reverse()) {
			if (weekdayCheckFn(dateOfInterval)) {
				return isSameDay(date, dateOfInterval);
			}
		}
	} else {
		let week = 1;
		for (const dateOfInterval of fullMonthInterval) {
			if (weekdayCheckFn(dateOfInterval)) {
				if (week === weekMatchValue) {
					return isSameDay(date, dateOfInterval);
				} else {
					week++;
				}
			}
		}
	}

	return false;
};

/**
 * Checks if the given `value` and `matchValue` match exactly
 * @example
 * const match = exactMatch(10, 10); // true
 * const match = exactMatch(10, 5); // false
 **/
const exactMatch = (value: number, matchValue: number) => {
	return matchValue === 1 ? value === 1 : value / matchValue === 1;
};
/**
 * Checks if the given `value` is divisible by `matchValue`
 * const match = looseMatch(10, 5); // true
 * const match = looseMatch(11, 5); // false
 */
const looseMatch = (value: number, matchValue: number) => {
	return matchValue === 1 ? true : value % matchValue === 0;
};
//#endregion TimeFormat matchers

//#region TimeFormat matchers factories
const lessThanSecondMatcherFactory =
	(timeFormat: ParsedNCTimeFormat): TimeFormatMatcher =>
	(currentDate: Date, prevDate: Date) =>
		datesBiggerOrEqual(timeFormat.key)(currentDate, prevDate);

const monthMatcherFactory =
	(timeFormat: ParsedCTimeFormat): TimeFormatMatcher =>
	(currentDate: Date, prevDate: Date) => {
		const datesNotMatch = datesNOTtheSame(timeFormat.key)(currentDate, prevDate);
		const valueMatch = timeFormat.exact
			? exactMatch(getTimeFromDateByTimeFormat(currentDate, timeFormat.key) + 1, timeFormat.value)
			: looseMatch(getTimeFromDateByTimeFormat(currentDate, timeFormat.key) + 1, timeFormat.value);
		return datesNotMatch && valueMatch;
	};

const commonMatcherFactory =
	(timeFormat: ParsedCTimeFormat): TimeFormatMatcher =>
	(currentDate: Date, prevDate: Date) => {
		const datesNotMatch = datesNOTtheSame(timeFormat.key)(currentDate, prevDate);
		const valueMatch = timeFormat.exact
			? exactMatch(getTimeFromDateByTimeFormat(currentDate, timeFormat.key), timeFormat.value)
			: looseMatch(getTimeFromDateByTimeFormat(currentDate, timeFormat.key), timeFormat.value);
		return datesNotMatch && valueMatch;
	};

const weekWeekdayMatcherFactory =
	(timeFormat: ParsedWeekFormat): TimeFormatMatcher =>
	(currentDate: Date, prevDate: Date) => {
		const datesNotMatch = datesNOTtheSame(timeFormat.key)(currentDate, prevDate);
		const valueMatch = weekWeekdayMatch(currentDate, timeFormat.week, timeFormat.weekday);
		return datesNotMatch && valueMatch;
	};

//#endregion TimeFormat matchers factories
