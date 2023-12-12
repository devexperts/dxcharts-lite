/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { DateFormatter, FullChartConfig } from '../chart.config';
import { DateTimeFormatter, DateTimeFormatterFactory, dateTimeFormatterFactory } from './date-time.formatter';
import { Timestamp } from './scaling/viewport.model';
import { getTimezoneOffset } from '../utils/timezone.utils';

export interface TimeZone {
	readonly timeZone: string;
	readonly name: string;
	readonly utcOffset: string;
}

// 1 hour in milliseconds
const timeMultiplier = 60 * 1000;

export class TimeZoneModel {
	private timeZoneChangedSubject: Subject<string> = new ReplaySubject<string>();
	private dateTimeFormatterFactory: DateTimeFormatterFactory;

	public currentTzOffset = (time: Timestamp): number => {
		// we must pass time here, because we can have daylight saving time, otherwise we will get wrong offset
		return getTimezoneOffset(this.config.timezone, time) + new Date(time).getTimezoneOffset() * timeMultiplier;
	};

	constructor(private config: FullChartConfig) {
		this.dateTimeFormatterFactory = this.initFormatterFactory(this.config.dateFormatter);
	}

	/**
	 * Sets the timezone for the configuration and updates the current timezone offset.
	 * @param {string} timeZone - The timezone to set.
	 * @returns {void}
	 */
	public setTimeZone(timeZone: string) {
		this.config.timezone = timeZone;
		this.formatterCache = {};
		this.timeZoneChangedSubject.next(timeZone);
	}

	/**
	 * Returns an Observable that emits a string value when the time zone is changed.
	 * The Observable is created from the timeZoneChangedSubject Subject.
	 * @returns {Observable<string>} An Observable that emits a string value when the time zone is changed.
	 */
	public observeTimeZoneChanged(): Observable<string> {
		return this.timeZoneChangedSubject.asObservable();
	}

	/**
	 * Initializes a DateTimeFormatterFactory object.
	 * @param {DateFormatter} [dateFormatter] - Optional DateFormatter object.
	 * @returns {DateTimeFormatterFactory} - Returns a DateTimeFormatterFactory object.
	 * If a plain function is provided as the dateFormatter parameter, it will be used as a date formatter without applying UTC datetime override for candles more than 1d period.
	 * If a custom date formatter exists, it will be used for datetime formatting applying optionally UTC datetime override for candles more than 1d period.
	 * If no dateFormatter is provided, a default DateTimeFormatterFactory object will be returned.
	 */
	public initFormatterFactory(dateFormatter?: DateFormatter): DateTimeFormatterFactory {
		let result: DateTimeFormatterFactory;
		if (dateFormatter && typeof dateFormatter === 'function') {
			// backward compatibility - if date formatter is a plain function then there is no need to use UTC datetime
			// override for candles more than 1d period
			result = dateFormatter;
		} else if (
			dateFormatter &&
			dateFormatter.createFormatterFunction &&
			typeof dateFormatter.createFormatterFunction === 'function'
		) {
			// if custom date formatter exists we use it for datetime formatting applying optionally
			// UTC datetime override for candles more than 1d period
			const createFormatter = dateFormatter.createFormatterFunction;
			result = (pattern: string) => createFormatter(pattern).bind(dateFormatter);
		} else {
			result = dateTimeFormatterFactory(this.config, this.tzOffset);
		}
		return result;
	}

	/**
	 * Returns the DateTimeFormatterFactory instance used by this class.
	 *
	 * @returns {DateTimeFormatterFactory} The DateTimeFormatterFactory instance used by this class.
	 */
	public getFormatterFactory(): DateTimeFormatterFactory {
		return this.dateTimeFormatterFactory;
	}

	private formatterCache: { [key: string]: DateTimeFormatter } = {};

	public getDateTimeFormatter(format: string): DateTimeFormatter {
		if (this.formatterCache[format] === undefined) {
			this.formatterCache[format] = this.dateTimeFormatterFactory(format);
		}
		return this.formatterCache[format];
	}

	public tzOffset(timezone: string): (time: number) => Date {
		if (!timezone) {
			return time => new Date(time);
		} else {
			// In JS Date object is created with local tz offset,
			// so we have to subtract localOffset from current time
			return time => {
				return new Date(
					time + getTimezoneOffset(timezone, time) + new Date(time).getTimezoneOffset() * timeMultiplier,
				);
			};
		}
	}
}