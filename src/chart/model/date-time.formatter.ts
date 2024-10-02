/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig, DateTimeFormatConfig } from '../chart.config';

export interface TimeFormatterConfig {
	shortDays?: string[];
	shortMonths?: string[];
}

export interface DateTimeFormatter {
	(date: number): string;
}
export type DateTimeFormatterFactory = (format: string) => DateTimeFormatter;

export const defaultDateTimeFormatter = () => (date: number) => date.toString();

/**
 * Default chart-core time formatter.
 * @param config
 * @param offsetFunction
 * @doc-tags chart-core,default-config,date-formatter
 */
export const dateTimeFormatterFactory = (
	config: FullChartConfig,
	offsetFunction: (timezone: string) => (time: number) => Date,
): DateTimeFormatterFactory => {
	const getPrefix = 'date.get' + (offsetFunction(config.timezone ?? '') ? '' : 'UTC');
	const patterns: Record<string, string> = {
		YYYY: apply('FullYear'),
		YY: apply('FullYear') + ' % 100',
		MMM: from('shortMonths', 'Month'),
		MMMM: upperCase(from('shortMonths', 'Month')),
		M: '1+' + apply('Month'),
		d: apply('Date'),
		H: apply('Hours'),
		m: apply('Minutes'),
		s: apply('Seconds'),
		sss: apply('Milliseconds'),
		EEE: from('shortDays', 'Day'),
		SSS: 'this.' + 'addTwoZeros' + '(' + apply('Milliseconds') + ')',
		T: 'date.getTime()',
	};
	['s', 'm', 'H', 'd', 'M'].forEach(function (k) {
		patterns[k + k] = 'this.' + 'addZero' + '(' + patterns[k] + ')';
	});
	/**
	 * Returns a string that concatenates the result of the function getPrefix with the input string fn and the string '()'.
	 * @param {string} fn - The input string to concatenate.
	 * @returns {string} - The resulting string.
	 */
	function apply(fn: string): string {
		return getPrefix + fn + '()';
	}
	/**
	 * Returns a string that represents an element of an array by applying a function to its index.
	 *
	 * @param {string} array - The name of the array.
	 * @param {string} fn - The name of the function to apply to the index.
	 * @returns {string} - A string that represents an element of the array.
	 */
	function from(array: string, fn: string) {
		return 'this.' + array + '[' + apply(fn) + ']';
	}
	/**
	 * Returns a string with the function name and the '.toUpperCase()' method appended to it.
	 * @param {string} fn - The name of the function to be converted to uppercase.
	 * @returns {string} - The resulting string with the function name in uppercase.
	 */
	function upperCase(fn: string) {
		return fn + '.toUpperCase()';
	}

	return function (pattern) {
		const context = {
			shortDays: getShortDays(config),
			shortMonths: getShortMonths(config),

			/**
			 * Adds a leading zero to a number if it is less than 10
			 * @param {number} x - The number to add a leading zero to
			 * @returns {string|number} - The number with a leading zero if it is less than 10, otherwise the original number
			 */
			addZero(x: number) {
				return x < 10 ? '0' + x : x;
			},

			/**
			 * Adds two zeros to a number if it is less than 10 or 100
			 * @param {number} x - The number to add zeros to
			 * @returns {string} - The number with two zeros added if necessary
			 */
			addTwoZeros(x: number) {
				return (x < 100 ? '0' : '') + (x < 10 ? '0' : '') + x;
			},
			tzDate:
				offsetFunction(config.timezone ?? '') ||
				function (date: number): Date {
					return new Date(+date);
				},
		};

		return (date: number) => formatDate(context.tzDate(date), pattern, context.shortDays, context.shortMonths);
	};
};

/**
 * Returns an array of short day names based on the provided configuration object.
 * If the configuration object does not contain shortDays property, it returns an array of default short day names.
 *
 * @param {TimeFormatterConfig} config - The configuration object containing shortDays property.
 * @returns {string[]} - An array of short day names.
 */
export function getShortDays(config: TimeFormatterConfig) {
	return config.shortDays ?? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}
/**
 * Returns an array of short month names based on the provided configuration object.
 * If the configuration object does not have a 'shortMonths' property, it returns the default array of short month names.
 *
 * @param {TimeFormatterConfig} config - The configuration object that contains the shortMonths property.
 * @returns {string[]} - An array of short month names.
 */
export function getShortMonths(config: TimeFormatterConfig) {
	return config.shortMonths ?? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

export const recalculateXFormatter = (
	xAxisLabelFormat: string | Array<DateTimeFormatConfig>,
	period: number,
	formatterFactory: (format: string) => (timestamp: number) => string,
): DateTimeFormatter => {
	if (xAxisLabelFormat) {
		if (typeof xAxisLabelFormat === 'string') {
			// always same format
			return formatterFactory(xAxisLabelFormat);
		} else if (Array.isArray(xAxisLabelFormat)) {
			// conditional format
			const matchingFormats = xAxisLabelFormat.filter(config => {
				if (config.showWhen) {
					const predicates = [];
					if (config.showWhen.periodLessThen) {
						predicates.push(() => period < (config.showWhen?.periodLessThen ?? 0));
					}
					if (config.showWhen.periodMoreThen) {
						predicates.push(() => period >= (config.showWhen?.periodMoreThen ?? 0));
					}
					return predicates.every(p => p());
				} else {
					return true;
				}
			});
			if (matchingFormats.length > 0) {
				const formatConfig = matchingFormats[0];
				if (formatConfig.format) {
					return formatterFactory(formatConfig.format);
				} else if (formatConfig.customFormatter) {
					return formatConfig.customFormatter;
				}
			}
		}
	}
	return defaultDateTimeFormatter();
};

//#region Custom date pattern parser, transforms Date object to string by given pattern
// examples: dd.MM => 15.12, YYYY => 2024, HH:mm => 15:56
export const formatDate = (date: Date, patternStr: string, daysOfWeek: string[], months: string[]) => {
	if (!patternStr) {
		patternStr = 'M/d/yyyy';
	}
	const day = date.getDate();
	const month = date.getMonth();
	const year = date.getFullYear();
	const hour = date.getHours();
	const minute = date.getMinutes();
	const second = date.getSeconds();
	const miliseconds = date.getMilliseconds();
	const h = hour % 12;
	const hh = twoDigitPad(h);
	const HH = twoDigitPad(hour);
	const mm = twoDigitPad(minute);
	const ss = twoDigitPad(second);
	const aaa = hour < 12 ? 'AM' : 'PM';
	const EEEE = daysOfWeek[date.getDay()];
	const EEE = EEEE.substring(0, 3);
	const dd = twoDigitPad(day);
	const M = month + 1;
	const MM = twoDigitPad(M);
	const MMMM = months[month];
	const MMM = MMMM.substring(0, 3);
	const yyyy = year + '';
	const yy = yyyy.substring(2, 4);
	// checks to see if month name will be used
	patternStr = patternStr
		.replace('hh', hh + '')
		.replace('h', h + '')
		.replace('HH', HH + '')
		.replace('H', hour + '')
		.replace('mm', mm + '')
		.replace('m', minute + '')
		.replace('ss', ss + '')
		.replace('s', second + '')
		.replace('S', miliseconds + '')
		.replace('dd', dd + '')
		.replace('d', day + '')

		.replace('EEEE', EEEE)
		.replace('EEE', EEE)
		.replace('YYYY', yyyy)
		.replace('yyyy', yyyy)
		.replace('YY', yy)
		.replace('yy', yy)
		.replace('aaa', aaa);
	if (patternStr.indexOf('MMM') > -1) {
		patternStr = patternStr.replace('MMMM', MMMM).replace('MMM', MMM);
	} else {
		patternStr = patternStr.replace('MM', MM + '').replace('M', M + '');
	}
	return patternStr;
};
const twoDigitPad = (num: string | number) => (typeof num === 'number' && num < 10 ? '0' + num : num);
//#endregion
