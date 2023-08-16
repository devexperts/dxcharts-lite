/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ParsedTimeFormat } from './time-formats.model';

/**
 * Validators are aimed to check if the `ParsedTimeFormat` is correct
 *
 * @example
 * const timeFormat: ParsedTimeFormat = {
 * 	key: 'day',
 *  value: 13,
 *  exact: true
 * };
 * // valid, because day should be between 1 and 31
 * const valid = validateParsedTimeFormat(timeFormat); // true
 *
 * @example
 * const timeFormat: ParsedTimeFormat = {
 * 	key: 'minute',
 *  value: 255,
 *  exact: true
 * };
 * // INvalid, because minute should be between 1 and 60
 * const valid = validateParsedTimeFormat(timeFormat); // false
 */

export const validateParsedTimeFormat = <T extends ParsedTimeFormat>(parsed: T) => {
	switch (parsed.key) {
		case 'second':
		case 'minute':
			return secondsAndMinutesValidator(parsed.value);
		case 'hour':
			return hoursValidator(parsed.value);
		case 'day':
			return dayValidatior(parsed.value);
		case 'month':
			return monthValidatior(parsed.value);
		case 'year':
			return yearValidatior(parsed.value);
		case 'week-weekday':
			const weekValid = weekValidator(parsed.week);
			const weekdayValid = weekdayValidator(parsed.weekday);
			return weekValid && weekdayValid;
		case 'lessThanSecond':
			return true;
		default:
			return false;
	}
};

//#region validators
const secondsAndMinutesValidator = (value: number) => {
	return value > 0 && value <= 60;
};

const hoursValidator = (value: number) => {
	return value > 0 && value <= 24;
};
const dayValidatior = (value: number) => {
	return value > 0 && value <= 31;
};

const weekdayValidator = (value: number) => {
	if (!isValidNumber(value)) {
		return false;
	}
	return value >= 1 && value <= 7;
};

const weekValidator = (value: number | '$') => {
	if (value === '$') {
		return true;
	}
	if (!isValidNumber(value)) {
		return false;
	}
	return value >= 1 && value <= 6;
};

const monthValidatior = (value: number) => {
	return value > 0 && value <= 12;
};
const yearValidatior = (value: number) => {
	return value > 0;
};

const isValidNumber = (value: number) => {
	return !isNaN(value) && isFinite(value);
};

//#endregion validators
