/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartConfigComponentsOffsets } from '../../chart.config';
import { HighLow, HighLowProvider } from '../../model/scaling/auto-scale.model';
import { ViewportModelState } from '../../model/scaling/viewport.model';

/**
 * Constraint on top of high low provider - makes additional offset bounds.
 * @doc-tags viewport,scaling
 * @param offsetsProvider
 * @doc-tags viewport,scaling,offsets
 */
export const createHighLowOffsetCalculator =
	(offsetsProvider: () => ChartConfigComponentsOffsets) => (highLow: HighLow) => {
		const { top, bottom } = offsetsProvider();
		const _height = highLow.high - highLow.low;
		// TODO what should we do if height is 0?
		const height = _height === 0 ? 1 : _height;
		const offsetTop = (height * top) / 100;
		const offsetBottom = (height * bottom) / 100;
		const low = highLow.low - offsetBottom;
		const high = highLow.high + offsetTop;
		return { low, high };
	};

/**
 * Constraint on top of high low provider - makes additional offset bounds.
 * @doc-tags viewport,scaling
 * @param offsetsProvider
 * @param highLowProvider
 * @doc-tags viewport,scaling,offsets
 */
export const createCandlesOffsetProvider = (
	offsetsProvider: () => ChartConfigComponentsOffsets,
	highLowProvider: HighLowProvider,
): HighLowProvider => {
	const offsetsCalculator = createHighLowOffsetCalculator(offsetsProvider);
	return {
		isHighLowActive: () => true,
		calculateHighLow: (state: ViewportModelState | undefined) => {
			const highLow = highLowProvider.calculateHighLow(state);
			return offsetsCalculator(highLow);
		},
	};
};
