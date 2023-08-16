/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
	ParsedTimeFormat,
	SpecialSymbol,
	timeFormatConfirugableGuard,
	timeFormatNoNConfirugableGuard,
	TimeFormatWithDuration,
	weekWeekdayGuard,
} from './time-formats.model';

/**
 * Parses a parameter string and returns a Map containg
 * `specialSymbol: boolean` pairs, which tells if the special symbol
 * is presented in the parameter string
 *
 * @example
 * const parameter = `12!`;
 * const specialSymbolsMap = parseSpecialSymbolsFromParameter(parameter); // { '!': true, '$': false }
 *
 */
const parseSpecialSymbolsFromParameter = (parameter: string) => {
	const specialSymbolsMap: Record<SpecialSymbol, boolean> = {
		'!': false,
		$: false,
	};
	if (parameter.includes('!')) {
		specialSymbolsMap['!'] = true;
	}
	if (parameter.includes('$')) {
		specialSymbolsMap['$'] = true;
	}
	return specialSymbolsMap;
};

const parseValueFromParameter = (parameter: string) => {
	return parseInt(parameter, 10);
};

/**
 * Parses the {@link TimeFormatWithDuration}
 * and returns {@link ParsedTimeFormat} for a successfil parsing and `null`
 * if the {@link TimeFormatWithDuration} couldn't be parsed.
 * @example
 * const timeFormat = 'day_14!';
 * const parsedTimeFormat = parseTimeFormatsFromKey(timeFormat); // { key: 'day', value: 14, exact: true }
 *
 * @example
 * const timeFormat = 'week-weekday_3_5';
 * const parsedTimeFormat = parseTimeFormatsFromKey(timeFormat); // { key: 'week-weekday', week: 3, weekday: 5 }
 *
 * @example
 * const timeFormat = 'bla-bla_1234';
 * const parsedTimeFormat = parseTimeFormatsFromKey(timeFormat); // null
 */
export const parseTimeFormatsFromKey = (format: TimeFormatWithDuration): ParsedTimeFormat | null => {
	const [keyType, ...parameters] = format.split('_');

	if (timeFormatConfirugableGuard(keyType)) {
		const [parameter] = parameters;
		const specialSymbols = parseSpecialSymbolsFromParameter(parameter);
		const value = parseValueFromParameter(parameter);

		return {
			key: keyType,
			value,
			exact: specialSymbols['!'],
		};
	} else if (weekWeekdayGuard(keyType)) {
		const [parameter1, parameter2] = parameters;
		const specialSymbols = parseSpecialSymbolsFromParameter(parameter1);
		const week = parseValueFromParameter(parameter1);
		const weekday = parseValueFromParameter(parameter2);
		return {
			key: keyType,
			week: specialSymbols['$'] ? '$' : week,
			weekday,
		};
	} else if (timeFormatNoNConfirugableGuard(keyType)) {
		return {
			key: keyType,
		};
	} else {
		console.warn(
			`${format} is not fit, check the documentation to see available formats https://webdev.prosp.devexperts.com:8095/docs/chart/x-axis`,
		);
		return null;
	}
};
