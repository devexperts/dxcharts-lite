/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { VisualCandleCalculator } from './chart.model';
import { Candle, hollowDirection, nameDirection } from '../../model/candle.model';
import VisualCandle from '../../model/visual-candle';

export const defaultCandleTransformer: VisualCandleCalculator = (candle, { x, width, activeCandle }) =>
	new VisualCandle(
		x,
		width,
		candle.open,
		candle.close,
		candle.hi,
		candle.lo,
		nameDirection(candle.open, candle.close),
		candle,
		true,
		getCandleIsActive(candle, activeCandle),
	);

export const hollowCandleTransformer: VisualCandleCalculator = (candle, { x, width, activeCandle, prevCandle }) =>
	new VisualCandle(
		x,
		width,
		candle.open,
		candle.close,
		candle.hi,
		candle.lo,
		hollowDirection(prevCandle?.close ?? candle.close, candle.close),
		candle,
		true,
		getCandleIsActive(candle, activeCandle),
		candle.close > candle.open,
	);

export const trendCandleTransformer: VisualCandleCalculator = (candle, { x, width, activeCandle, prevCandle }) =>
	new VisualCandle(
		x,
		width,
		candle.open,
		candle.close,
		candle.hi,
		candle.lo,
		nameDirection(prevCandle?.close ?? candle.close, candle.close),
		candle,
		true,
		getCandleIsActive(candle, activeCandle),
		candle.close > candle.open,
	);

export const getCandleIsActive = (candle: Candle, activeCandle?: Candle): boolean => {
	const isActive = activeCandle && activeCandle.idx === candle.idx;
	return isActive ?? false;
};
