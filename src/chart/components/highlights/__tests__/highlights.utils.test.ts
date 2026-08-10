/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesPoint } from '../../../model/data-series.model';
import { findCandleIndicesInHighlight, isCandleOpenInHighlight } from '../highlights.utils';

const PERIOD_15M = 15 * 60 * 1000;

/** CT wall-clock helpers for a fixed calendar day (ms since epoch not needed — relative offsets). */
const t = (hours: number, minutes = 0): number => (hours * 60 + minutes) * 60 * 1000;

const REGULAR_FROM = t(8, 30);
const REGULAR_TO = t(15, 0);

const candle = (timestamp: number): DataSeriesPoint => ({
	timestamp,
	close: 1,
});

describe('highlights.utils', () => {
	describe('isCandleOpenInHighlight', () => {
		it('includes open at highlightFrom and excludes open at highlightTo', () => {
			expect(isCandleOpenInHighlight(REGULAR_FROM, REGULAR_FROM, REGULAR_TO)).toBe(true);
			expect(isCandleOpenInHighlight(REGULAR_TO, REGULAR_FROM, REGULAR_TO)).toBe(false);
		});
	});

	describe('findCandleIndicesInHighlight with open anchor', () => {
		const candles = [
			candle(t(8, 15)),
			candle(t(8, 30)),
			candle(t(8, 45)),
			candle(t(14, 45)),
			candle(t(15, 0)),
			candle(t(15, 15)),
		];

		it('selects candles whose open is in REGULAR [08:30, 15:00)', () => {
			const result = findCandleIndicesInHighlight(candles, REGULAR_FROM, REGULAR_TO, PERIOD_15M, 'open');
			expect(result).toEqual({ startIdx: 1, endIdx: 3 });
		});
	});

	describe('findCandleIndicesInHighlight with close anchor', () => {
		// timestamps are close times: candle open = previous close (or timestamp - period)
		const candles = [
			candle(t(8, 15)), // open 08:00
			candle(t(8, 30)), // open 08:15 — not in REGULAR
			candle(t(8, 45)), // open 08:30 — first REGULAR
			candle(t(9, 0)), // open 08:45
			candle(t(15, 0)), // open 14:45 — last REGULAR
			candle(t(15, 15)), // open 15:00 — not in REGULAR
		];

		it('does not include candle that closes at session start (open still in previous session)', () => {
			const result = findCandleIndicesInHighlight(candles, REGULAR_FROM, REGULAR_TO, PERIOD_15M, 'close');
			expect(result).toEqual({ startIdx: 2, endIdx: 4 });
			expect(candles[2].timestamp).toBe(t(8, 45));
		});

		it('does not include candle that closes at session end (open equals session end)', () => {
			const result = findCandleIndicesInHighlight(candles, REGULAR_FROM, REGULAR_TO, PERIOD_15M, 'close');
			expect(result).toEqual({ startIdx: 2, endIdx: 4 });
			expect(candles[4].timestamp).toBe(t(15, 0));
		});

		it('returns null when no candle open falls into a narrow session', () => {
			const narrowFrom = t(8, 32);
			const narrowTo = t(8, 33);
			const result = findCandleIndicesInHighlight(candles, narrowFrom, narrowTo, PERIOD_15M, 'close');
			expect(result).toBeNull();
		});
	});
});
