/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import generateCandlesData from './candles-generator.utils.js';

export interface GenerateCandlesDataConfig {
	quantity?: number;
	startY?: number;
	avgCandleSize?: number;
	avgTrendLength?: {
		sw?: number;
		down?: number;
		up?: number;
	};
	withVolume?: boolean;
	period?: number;
}

/**
 * Generated mock candles data.
 *
 * @param config
 *   quantity - avg number of candles
 *   startY - avg candle Y to start generation with
 *   avgCandleSize - avg size of candle
 *   avgTrendLength:
 *     sw - avg length of SIDEWAYS trend
 *     down - avg length of DOWN trend
 *     up - avg length of UP trend
 *   withVolume - add random volumes or not
 *   period - specify distance between candles (60 for 1m, 3600 for 1h, 84600 for 1d)
 * @return Array<Candle>
 * @doc-tags tricky
 */
export function generateCandlesDataTS(config?: GenerateCandlesDataConfig) {
	return generateCandlesData(config);
}
