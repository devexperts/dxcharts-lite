/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartConfigComponentsChart } from '../../chart.config';
import { at } from '../../utils/array.utils';
import { Bounds, BoundsProvider } from '../bounds.model';
import VisualCandle from '../visual-candle';
import { ViewportModelState, calculateZoom, pixelsToUnits } from './viewport.model';

/**
 * Return constraited state that handled zooming and moving chart near first/last candles
 * this and other constraits that works with state should mutate and return state
 * @param initialState
 * @param state
 * @param visualCandlesCoordinates
 * @param candleLimit
 * @param bounds
 * @returns
 * @doc-tags viewport,zoom,scaling
 */

export const candleEdgesConstrait = (
	state: ViewportModelState,
	visualCandlesCoordinates: VisualCandle[],
	candleLimit: number,
	bounds: Bounds,
) => {
	const newState = {
		...state,
	};

	const leftConstraitCoordinate = visualCandlesCoordinates[candleLimit]?.startUnit ?? 0;
	const rightConstraintCoordinate = at(-candleLimit, visualCandlesCoordinates)?.startUnit ?? 0;

	let normalizedXStart = state.xStart;
	let normalizedXEnd = state.xEnd;
	if (newState.xStart >= rightConstraintCoordinate) {
		normalizedXStart = rightConstraintCoordinate;
		normalizedXEnd = normalizedXEnd - (newState.xStart - rightConstraintCoordinate);
	}
	if (newState.xEnd < leftConstraitCoordinate) {
		normalizedXStart = leftConstraitCoordinate - pixelsToUnits(bounds.width, newState.zoomX);
		normalizedXEnd = leftConstraitCoordinate;
	}
	newState.xStart = normalizedXStart;
	newState.xEnd = normalizedXEnd;
	return newState;
};

/**
 * This function limits minimum and maximum chart viewport dependening on visible x-units
 * @returns
 * @doc-tags viewport,zoom,scaling
 */
export const zoomConstraint = (
	initialState: ViewportModelState,
	state: ViewportModelState,
	chartConfig: ChartConfigComponentsChart,
	boundsProvider: BoundsProvider,
) => {
	const newState = {
		...state,
	};

	const bounds = boundsProvider();
	// 1 - is an average candle width: newXEnd - newXStart = avg candles amount in the viewport
	const avgCandlesInViewport = newState.xEnd - newState.xStart;
	const minViewportReached = avgCandlesInViewport < chartConfig.minCandles;
	const maxCandlesInViewport = bounds.width / chartConfig.minWidth;
	const maxViewportReached = avgCandlesInViewport > maxCandlesInViewport;
	// rules work only if chart is shown
	if (bounds.width > 0) {
		if (maxViewportReached) {
			newState.xStart = newState.xEnd - maxCandlesInViewport;
			newState.zoomX = calculateZoom(newState.xEnd - newState.xStart, bounds.width);
			return newState;
		}

		if (minViewportReached) {
			newState.xEnd = initialState.xEnd;
			newState.xStart = newState.xEnd - chartConfig.minCandles;
			newState.zoomX = calculateZoom(newState.xEnd - newState.xStart, bounds.width);
			return newState;
		}
	}
	return newState;
};
