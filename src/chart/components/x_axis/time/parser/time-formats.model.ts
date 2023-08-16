/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const weekWeekday = 'week-weekday' as const;
const timeFormatsConfirugable = ['second', 'minute', 'hour', 'day', 'month', 'year'] as const;
const timeFormatsNoNConfirugable = ['lessThanSecond'] as const;

type TimeFormatWeekWeekdayType = typeof weekWeekday;
type TimeFormatConfirugableType = typeof timeFormatsConfirugable[number];
type TimeFormatNonConfirugableType = typeof timeFormatsNoNConfirugable[number];

export type TimeFormat = TimeFormatConfirugableType | TimeFormatNonConfirugableType | TimeFormatWeekWeekdayType;

type TimeFormatConfirugableWithDurationType =
	| `${TimeFormatConfirugableType}_${number}`
	| `${TimeFormatConfirugableType}_${number}!`
	| `${TimeFormatWeekWeekdayType}_${number | '$'}_${number}`;

export type TimeFormatWithDuration = TimeFormatConfirugableWithDurationType | TimeFormatNonConfirugableType;

export interface ParsedCTimeFormat {
	key: TimeFormatConfirugableType;
	value: number;
	exact: boolean;
}

export interface ParsedWeekFormat {
	key: TimeFormatWeekWeekdayType;
	week: number | '$';
	weekday: number;
}

export interface ParsedNCTimeFormat {
	key: TimeFormatNonConfirugableType;
}

export type ParsedTimeFormat = ParsedCTimeFormat | ParsedWeekFormat | ParsedNCTimeFormat;

export type SpecialSymbol = '!' | '$';

//#region `ParsedTimeFormat` guards
export const timeFormatConfirugableGuard = (key: string): key is TimeFormatConfirugableType => {
	return timeFormatsConfirugable.some(type => type === key);
};

export const weekWeekdayGuard = (key: string): key is TimeFormatWeekWeekdayType => {
	return key === 'week-weekday';
};

export const timeFormatNoNConfirugableGuard = (key: string): key is TimeFormatNonConfirugableType => {
	return timeFormatsNoNConfirugable.some(type => type === key);
};
//#endregion guards
