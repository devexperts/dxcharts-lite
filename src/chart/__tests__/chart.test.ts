/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import './env';
import { createChart } from '../../index';
import { Candle } from '../model/candle.model';
import { generateCandlesDataTS } from '../utils/candles-generator-ts.utils';

const candle = (timestamp: number, close: number, id = `${timestamp}_${close}`): Candle => ({
	id,
	hi: close,
	lo: close,
	open: close,
	close,
	timestamp,
	volume: 1,
});

const timestampsOf = (chart: ReturnType<typeof createChart>): number[] =>
	chart.chartModel.getCandles().map(c => c.timestamp);

describe('chart', () => {
	const candles = generateCandlesDataTS({ quantity: 50 });

	it.each([
		['zero -> non-zero candles', [[], candles]],
		['prepend candles', [candles.slice(10), candles.slice(0, 10)]],
		['prepend with a gap', [candles.slice(0, 10), candles.slice(20, 30)]],
		['prepend with overlap', [candles.slice(10), candles.slice(0, 20)]],
		['prepend with full overlap', [candles.slice(10), candles]],
		['only update existing candles', [candles, candles.slice(10, 20)]],
		['update all candles', [candles, candles]],
		['append candles', [candles.slice(0, 10), candles.slice(10)]],
		['append candles with a gap', [candles.slice(0, 10), candles.slice(20)]],
		['append candles with overlap', [candles.slice(0, 20), candles.slice(10)]],
		['append candles with full overlap', [candles.slice(0, 20), candles]],
		['prepend and append', [candles.slice(10, 20), candles.slice(0, 30)]],
		['fill in the gap', [candles.slice(0, 10), candles.slice(11, 20), candles.slice(10, 11)]],
	])('should update candles in various scenarios: %s', async (scenario, updates) => {
		const div = document.createElement('div');
		const chart = createChart(div);
		updates.forEach((update, i) => {
			if (i === 0) {
				chart.setData({ candles: update });
			} else {
				chart.updateData({ candles: update });
			}
		});
		// wait for async tasks to complete successfully
		await new Promise(done => setTimeout(done, 100));
	});

	describe('updateData (in-range inserts)', () => {
		let warnSpy: jest.SpiedFunction<typeof console.warn>;

		beforeEach(() => {
			warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		});

		afterEach(() => {
			warnSpy.mockRestore();
		});

		it('keeps a candle which timestamp lands strictly between two already-loaded bars', () => {
			const div = document.createElement('div');
			const chart = createChart(div);
			chart.setData({
				candles: [candle(1_000, 10), candle(3_000, 30), candle(5_000, 50)],
			});

			chart.updateData({
				candles: [candle(2_000, 20)],
			});

			expect(timestampsOf(chart)).toEqual([1_000, 2_000, 3_000, 5_000]);
			expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("Couldn't update candle with timestamp"));
			chart.destroy();
		});

		it('merges prepend, in-range insert, exact replace, and append in one batch', () => {
			const div = document.createElement('div');
			const chart = createChart(div);
			chart.setData({
				candles: [candle(1_000, 10), candle(3_000, 30), candle(5_000, 50)],
			});

			chart.updateData({
				candles: [candle(500, 5), candle(2_000, 20), candle(3_000, 31), candle(6_000, 60)],
			});

			const result = chart.chartModel.getCandles();
			expect(result.map(c => c.timestamp)).toEqual([500, 1_000, 2_000, 3_000, 5_000, 6_000]);
			expect(result.find(c => c.timestamp === 3_000)?.close).toBe(31);
			expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("Couldn't update candle with timestamp"));
			chart.destroy();
		});

		it('fills a gap left by an earlier overlapping history fetch', () => {
			const generated = generateCandlesDataTS({ quantity: 20 });
			const div = document.createElement('div');
			const chart = createChart(div);
			chart.setData({ candles: generated.slice(0, 10) });
			chart.updateData({ candles: generated.slice(11, 20) });
			chart.updateData({ candles: generated.slice(10, 11) });

			expect(timestampsOf(chart)).toEqual(generated.map(c => c.timestamp));
			expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("Couldn't update candle with timestamp"));
			chart.destroy();
		});

		it('prepends a candle that is older than the series by less than the default 1s search period', () => {
			const div = document.createElement('div');
			const chart = createChart(div);
			chart.setData({
				candles: [candle(1_000, 10), candle(1_137, 11)],
			});

			chart.updateData({
				candles: [candle(863, 8)],
			});

			expect(timestampsOf(chart)).toEqual([863, 1_000, 1_137]);
			expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("Couldn't update candle with timestamp"));
			chart.destroy();
		});

		it('replaces an equal timestamp using the incoming candle, even when ids differ', () => {
			const div = document.createElement('div');
			const chart = createChart(div);
			chart.setData({
				candles: [candle(1_000, 10, 'old-id'), candle(2_000, 20, 'keep-id')],
			});

			chart.updateData({
				candles: [candle(1_000, 11, 'new-id')],
			});

			const updated = chart.chartModel.getCandles().find(c => c.timestamp === 1_000);
			expect(updated?.close).toBe(11);
			expect(updated?.id).toBe('new-id');
			expect(timestampsOf(chart)).toEqual([1_000, 2_000]);
			chart.destroy();
		});

		it('still runs config.components.chart.sortCandles on the incoming batch', () => {
			const sortCandles = jest.fn((incoming: Candle[]) =>
				incoming.slice().sort((a, b) => a.timestamp - b.timestamp),
			);
			const div = document.createElement('div');
			const chart = createChart(div, {
				components: { chart: { sortCandles } },
			});
			chart.setData({
				candles: [candle(1_000, 10), candle(3_000, 30)],
			});
			sortCandles.mockClear();

			chart.updateData({
				candles: [candle(4_000, 40), candle(2_000, 20)],
			});

			expect(sortCandles).toHaveBeenCalled();
			expect(timestampsOf(chart)).toEqual([1_000, 2_000, 3_000, 4_000]);
			chart.destroy();
		});
	});
});
