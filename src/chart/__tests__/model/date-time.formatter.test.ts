/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import '../env';
import { formatDate, getShortDays, getShortMonths } from '../../model/date-time.formatter';
import { getDefaultConfig } from '../../chart.config';
import { getTimezoneOffset } from '../../utils/timezone.utils';

describe('Date time formatter', () => {
	const config = getDefaultConfig();
	const days = getShortDays(config);
	const months = getShortMonths(config);
	const timestamp = 1710501810500;
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const utcTimestamp = timestamp - getTimezoneOffset(tz, timestamp);
	const utcDate = new Date(utcTimestamp); // 03/15/2024 @ 11:23am UTC

	describe('Timezones', () => {
		it('should always be UTC', () => {
			expect(getTimezoneOffset('UTC', utcTimestamp)).toBe(0);
		});
	});

	describe('Formatter', () => {
		it('should return formatted value according to given pattern', () => {
			expect(formatDate(utcDate, 'YYYY', days, months)).toEqual('2024');
			expect(formatDate(utcDate, 'HH:mm:ss', days, months)).toEqual('11:23:30');
			expect(formatDate(utcDate, 'dd.MM.YYYY', days, months)).toEqual('15.03.2024');
		});
	});
});
