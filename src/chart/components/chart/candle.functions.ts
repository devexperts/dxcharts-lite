/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Candle } from '../../model/candle.model';
import { finite } from '../../utils/math.utils';
import { PartialCandle } from './chart.component';

/**
 * In the early days of Futures contract there is no much trading,
 * so there is not enough information to build a candle: only Open/Close value available.
 * In this case Daily candle, which we receive, must be completed to full OHLC with equal values.
 */
export const prepareCandle = (candle: PartialCandle): Candle | undefined => {
	try {
		const settlementPrice = finite(candle.close, candle.open, candle.hi, candle.lo);
		if (!isFinite(settlementPrice)) {
			throw new Error('Received candle without any price');
		}
		// @ts-ignore
		const preparedCandleHi = finite(candle.hi, Math.max(candle.open, candle.close), settlementPrice);
		// @ts-ignore
		const preparedCandleLo = finite(candle.lo, Math.min(candle.open, candle.close), settlementPrice);
		const preparedCandleOpen = finite(candle.open, candle.lo, settlementPrice);
		const preparedCandleClose = finite(candle.close, candle.hi, settlementPrice);
		const preparedVwap = Number.isNaN(candle.vwap) ? undefined : candle.vwap;
		return {
			id: candle.id,
			hi: preparedCandleHi,
			lo: preparedCandleLo,
			open: preparedCandleOpen,
			close: preparedCandleClose,
			timestamp: candle.timestamp,
			volume: candle.volume ?? 0,
			expansion: candle.expansion,
			idx: candle.idx,
			impVolatility: candle.impVolatility,
			vwap: preparedVwap,
		};
	} catch (e) {
		console.warn(e);
		return;
	}
};

/**
 * Adds index to candles according to their array index.
 * @param candles
 * @param startIdx {number}
 */
export const reindexCandles = (candles: Array<Candle>, startIdx: number = 0) => {
	for (let i = startIdx; i < candles.length; ++i) {
		candles[i].idx = i;
	}
};

export const deleteCandlesIndex = (candles: Array<Candle>) => {
	candles.forEach(candle => {
		candle.idx = undefined;
	});
};

export const isCandle = (value: Candle | undefined): value is Candle => value !== undefined;
