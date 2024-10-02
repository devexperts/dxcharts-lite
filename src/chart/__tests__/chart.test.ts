/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import './env';
import { createChart } from '../../index';
import { generateCandlesDataTS } from '../utils/candles-generator-ts.utils';

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
		[
			"fill in the gap (won't work but should not error)",
			[candles.slice(0, 10), candles.slice(11, 20), candles.slice(10, 11)],
		],
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
});
