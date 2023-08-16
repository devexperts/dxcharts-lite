/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesPoint } from '../model/data-series.model';

/**
 * Automatically detect period of candle source.
 * Cannot just take first-second candles distance because of non-trading hours.
 * Naive approach:
 *  1. get all time distances between candles
 *  2. the most frequent distance = period
 * @param candles
 * @doc-tags tricky,period
 */
export function autoDetectPeriod(candles: Array<DataSeriesPoint>): number | undefined {
	if (candles.length > 1) {
		// simply get distance between two candles
		const periodToCount: Record<number, number> = candles.reduce<Record<number, number>>((acc, candle, idx) => {
			if (idx !== candles.length - 1) {
				const period = candles[idx + 1].timestamp - candle.timestamp;
				if (acc[period]) {
					acc[period]++;
				} else {
					acc[period] = 1;
				}
			}
			return acc;
		}, {});
		let maxCount = 0;
		let naivePeriod;
		for (const _period of Object.keys(periodToCount)) {
			const period = parseInt(_period, 10);
			const count = periodToCount[period];
			if (count > maxCount && period > 0) {
				maxCount = count;
				naivePeriod = period;
			}
		}
		if (naivePeriod) {
			return naivePeriod;
		}
	}
}
