/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { HighLowProvider } from './scaling/auto-scale.model';
import { ViewportModelState } from './scaling/viewport.model';
import VisualCandle from './visual-candle';
import { HighLowWithIndex } from './scale.model';
import { CandleSeriesModel } from './candle-series.model';

/**
 * Candles high low provider.
 * @param candleSeriesModel
 * @doc-tags viewport,scaling
 */
export const createCandleSeriesHighLowProvider = (candleSeriesModel: CandleSeriesModel): HighLowProvider => {
	return {
		isHighLowActive: () => true,
		calculateHighLow: (state: ViewportModelState | undefined) => {
			const xStart = state ? state.xStart : candleSeriesModel.scaleModel.xStart;
			const xEnd = state ? state.xEnd : candleSeriesModel.scaleModel.xEnd;
			const { dataIdxStart, dataIdxEnd } = candleSeriesModel.calculateDataViewportIndexes(xStart, xEnd);
			// +1 because dataIdxEnd candle should be included in the result
			const visualCandles = candleSeriesModel.visualPoints.slice(dataIdxStart, dataIdxEnd + 1);
			const highLowWithIndex = calculateCandlesHighLow(visualCandles);
			// to calculate correct high low for percent scale
			const baseLine = () => candleSeriesModel.visualPoints[dataIdxStart]?.close ?? 1;
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
export const calculateCandlesHighLow = (visualCandles: VisualCandle[]): HighLowWithIndex => {
	const result = {
		high: Number.MIN_SAFE_INTEGER,
		low: Number.MAX_SAFE_INTEGER,
		highIdx: 0,
		lowIdx: 0,
	};
	for (let i = 0; i < visualCandles.length; i++) {
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
