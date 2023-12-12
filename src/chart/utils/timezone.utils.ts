/**
 * Get a cached Intl.DateTimeFormat instance for the IANA `timeZone`. This can be used
 * to get deterministic local date/time output according to the `en-US` locale which
 * can be used to extract local time parts as necessary.
 * Returns the [year, month, day, hour, minute] tokens of the provided timezone
 */
const dateTimeFormatCache: Record<string, Intl.DateTimeFormat> = {};
export function getDateTimeFormat(timeZone: string) {
	if (!dateTimeFormatCache[timeZone]) {
		// New browsers use `hourCycle`, IE and Chrome <73 does not support it and uses `hour12`
		dateTimeFormatCache[timeZone] = new Intl.DateTimeFormat('en-US', {
			hourCycle: 'h23',
			timeZone,
			year: 'numeric',
			month: 'numeric',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}
	return dateTimeFormatCache[timeZone];
}

/**
 * Calulates provided timezone offset.
 * @param timeZone - timezone as IANA string ('Asia/Amman', 'Europe/Amsterdam')
 * @param timestamp - timestamp as number (1701251319717)
 * Returns offset from UTC
 */
export const getTimezoneOffset = (timeZone: string, timestamp: number = Date.now()) => {
	const formatter = getDateTimeFormat(timeZone);
	const dateString = formatter.format(timestamp);
	// exec() returns  [, fMonth, fDay, fYear, fHour, fMinute]
	const tokens = /(\d+)\/(\d+)\/(\d+),? (\d+):(\d+)/.exec(dateString);

	if (tokens) {
		const asUTC = Date.UTC(+tokens[3], +tokens[1] - 1, +tokens[2], +tokens[4] % 24, +tokens[5], 0);
		let asTimezone = timestamp;
		const over = asTimezone % 1000;
		asTimezone -= over >= 0 ? over : 1000 + over;
		return asUTC - asTimezone;
	}
	return 0;
};
