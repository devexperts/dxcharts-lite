/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CandleSeriesModel } from './candle-series.model';
import { HighLowWithIndex } from './scale.model';
import { HighLowProvider } from './scaling/auto-scale.model';
import VisualCandle from './visual-candle';

/**
 * Candles high low provider.
 * @param candleSeriesModel
 * @doc-tags viewport,scaling
 */
export const createCandleSeriesHighLowProvider = (candleSeriesModel: CandleSeriesModel): HighLowProvider => {
	return {
		isHighLowActive: () => true,
		calculateHighLow: () => {
			// to calculate correct high low for percent scale
			const baseLine = () => candleSeriesModel.visualPoints[candleSeriesModel.dataIdxStart]?.close ?? 1;
			// zipped highlow should always contains actual highLow state for candleSeriesModel
			const highLowWithIndex = candleSeriesModel.zippedHighLow;
			return {
				...highLowWithIndex,
				low: candleSeriesModel.view.toAxisUnits(highLowWithIndex.low, baseLine),
				high: candleSeriesModel.view.toAxisUnits(highLowWithIndex.high, baseLine),
			};
		},
	};
};

/**
 * Calculates the high and low values for given candles array.
 * @param visualCandles
 */
export const calculateCandlesHighLow = (
	visualCandles: VisualCandle[],
	start: number,
	end: number,
): HighLowWithIndex => {
	start = Math.max(start, 0);
	end = Math.min(end, visualCandles.length - 1);
	const result = {
		high: Number.MIN_SAFE_INTEGER,
		low: Number.MAX_SAFE_INTEGER,
		highIdx: 0,
		lowIdx: 0,
	};
	for (let i = start; i <= end; i++) {
		const candle = visualCandles[i];
		if (candle.high > result.high) {
			result.high = candle.high;
			result.highIdx = i;
		}
		if (candle.low < result.low) {
			result.low = candle.low;
			result.lowIdx = i;
		}
	}
	return result;
};
