/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig, DateTimeFormatConfig } from '../chart.config';

export interface TimeFormatterConfig {
	shortDays?: string[];
	shortMonths?: string[];
}

export interface DateTimeFormatter {
	(date: Date | number): string;
}
export type DateTimeFormatterFactory = (format: string) => DateTimeFormatter;

export const defaultDateTimeFormatter = () => (date: Date | number) => date.toString();

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
	const re = new RegExp(Object.keys(patterns).sort().reverse().join('|'), 'g');
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

	/**
	 * Returns a string that concatenates a pattern from an object with a string
	 * @param {string} pattern - The key of the pattern to be concatenated
	 * @returns {string} - A string that concatenates a pattern from an object with a string
	 */
	function applyPattern(pattern: string) {
		return "' + (" + patterns[pattern] + ") + '";
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
				function (date: Date | number): Date {
					return date instanceof Date ? date : new Date(+date);
				},
		};
		// eslint-disable-next-line no-new-func
		return new Function(
			'date',
			'date=this.' + 'tzDate' + "(date); return '" + pattern.replace(re, applyPattern) + "'",
		).bind(context);
	};
};

/**
 * Returns an array of short day names based on the provided configuration object.
 * If the configuration object does not contain shortDays property, it returns an array of default short day names.
 *
 * @param {TimeFormatterConfig} config - The configuration object containing shortDays property.
 * @returns {string[]} - An array of short day names.
 */
function getShortDays(config: TimeFormatterConfig) {
	return config.shortDays ?? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}
/**
 * Returns an array of short month names based on the provided configuration object.
 * If the configuration object does not have a 'shortMonths' property, it returns the default array of short month names.
 *
 * @param {TimeFormatterConfig} config - The configuration object that contains the shortMonths property.
 * @returns {string[]} - An array of short month names.
 */
function getShortMonths(config: TimeFormatterConfig) {
	return config.shortMonths ?? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

export const recalculateXFormatter = (
	xAxisLabelFormat: string | Array<DateTimeFormatConfig>,
	period: number,
	formatterFactory: (format: string) => (timestamp: number | Date) => string,
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
