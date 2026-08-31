/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CandleTimestampAnchor } from '../../chart.config';
import { DataSeriesPoint } from '../../model/data-series.model';
import { getCandleStart } from '../../utils/candles.utils';

export type HighlightBoundaryEdge = 'start' | 'end';

/**
 * Which visual edge of the candle found by timestamp search a highlight boundary should snap to.
 * Close-anchor: exact close → right edge; timestamp before that close (e.g. overnight gap) → left edge.
 */
export const resolveHighlightBoundaryEdge = (
	highlightTimestamp: number,
	candleTimestamp: number,
	anchor: CandleTimestampAnchor,
): HighlightBoundaryEdge => {
	if (anchor === 'close') {
		return candleTimestamp <= highlightTimestamp ? 'end' : 'start';
	}
	if (candleTimestamp < highlightTimestamp) {
		return 'end';
	}
	return 'start';
};

/**
 * Whether candle open-time belongs to highlight interval [highlightFrom, highlightTo).
 */
export const isCandleOpenInHighlight = (candleOpenTime: number, highlightFrom: number, highlightTo: number): boolean =>
	highlightFrom <= candleOpenTime && candleOpenTime < highlightTo;

/**
 * Finds first/last candle indices whose open-time falls into [highlightFrom, highlightTo).
 * Open-time is derived via getCandleStart so both open and close timestamp anchors work.
 */
export const findCandleIndicesInHighlight = (
	candles: DataSeriesPoint[],
	highlightFrom: number,
	highlightTo: number,
	periodMs: number,
	anchor: CandleTimestampAnchor,
): { startIdx: number; endIdx: number } | null => {
	let startIdx = -1;
	let endIdx = -1;
	for (let i = 0; i < candles.length; i++) {
		const openTime = getCandleStart(candles, i, periodMs, anchor);
		if (isCandleOpenInHighlight(openTime, highlightFrom, highlightTo)) {
			if (startIdx === -1) {
				startIdx = i;
			}
			endIdx = i;
		}
	}
	return startIdx === -1 ? null : { startIdx, endIdx };
};
