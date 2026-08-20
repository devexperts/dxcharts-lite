/*
 * Copyright (C) 2019 - 2026 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Candle } from '../../../model/candle.model';
import {
	adjustSecondarySeriesToMain,
	assignDenseSecondarySeriesIndexes,
	isDenseAlignedSecondarySeries,
} from '../candle.functions';

const candle = (timestamp: number, close: number, idx?: number): Candle => ({
	id: `${timestamp}_${close}`,
	hi: close,
	lo: close,
	open: close,
	close,
	timestamp,
	volume: 1,
	idx,
});

describe('candle.functions dense compare / secondary adjustments', () => {
	describe('isDenseAlignedSecondarySeries', () => {
		it('returns true when lengths match and timestamps align 1:1', () => {
			const main = [candle(100, 1), candle(200, 2), candle(300, 3)];
			const secondary = [candle(100, 10), candle(200, 20), candle(300, 30)];
			expect(isDenseAlignedSecondarySeries(main, secondary)).toBe(true);
		});

		it('returns false when lengths differ', () => {
			const main = [candle(100, 1), candle(200, 2)];
			const secondary = [candle(100, 10)];
			expect(isDenseAlignedSecondarySeries(main, secondary)).toBe(false);
		});

		it('returns false when a timestamp does not match', () => {
			const main = [candle(100, 1), candle(200, 2)];
			const secondary = [candle(100, 10), candle(250, 20)];
			expect(isDenseAlignedSecondarySeries(main, secondary)).toBe(false);
		});

		it('returns false for empty main', () => {
			expect(isDenseAlignedSecondarySeries([], [])).toBe(false);
		});
	});

	describe('assignDenseSecondarySeriesIndexes', () => {
		it('sets sequential idx without reindex/gap-fill', () => {
			const secondary = [candle(100, 10), candle(200, 20), candle(300, 30)];
			const result = assignDenseSecondarySeriesIndexes(secondary);
			expect(result.map(c => c.idx)).toEqual([0, 1, 2]);
			expect(result).toHaveLength(3);
			expect(result.map(c => c.timestamp)).toEqual([100, 200, 300]);
		});
	});

	describe('adjustSecondarySeriesToMain', () => {
		it('fills sparse gaps with fake candles on the correct idx (not all on 0)', () => {
			const main = [candle(100, 1, 0), candle(200, 2, 1), candle(300, 3, 2), candle(400, 4, 3)];
			const secondary: Array<Candle | undefined> = [];
			secondary[1] = candle(200, 20, 1);
			secondary[3] = candle(400, 40, 3);

			const adjusted = adjustSecondarySeriesToMain(main, secondary);
			expect(adjusted).toHaveLength(4);
			expect(adjusted.map(c => c.idx)).toEqual([0, 1, 2, 3]);
			// gap at 0 filled from nearest right (idx 1)
			expect(adjusted[0].close).toBe(20);
			expect(adjusted[0].hi).toBe(20);
			expect(adjusted[0].lo).toBe(20);
			expect(adjusted[0].open).toBe(20);
			// real candle at 1
			expect(adjusted[1].close).toBe(20);
			expect(adjusted[1].hi).toBe(20);
			// gap at 2 filled from nearest left (idx 1)
			expect(adjusted[2].close).toBe(20);
			expect(adjusted[2].idx).toBe(2);
			// real candle at 3
			expect(adjusted[3].close).toBe(40);
		});

		it('keeps dense secondary candles as-is', () => {
			const main = [candle(100, 1, 0), candle(200, 2, 1)];
			const secondary = [candle(100, 10, 0), candle(200, 20, 1)];
			const adjusted = adjustSecondarySeriesToMain(main, secondary);
			expect(adjusted).toEqual(secondary);
		});
	});
});
