/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ScaleModel } from '../../model/scale.model';
import VisualCandle from '../../model/visual-candle';
import { Timestamp } from '../../model/scaling/viewport.model';
import { ChartModel } from './chart.model';

/**
 * Calculates the initial viewport.
 * @param scaleModel
 * @doc-tags scaling,viewport
 */
export const createBasicScaleViewportTransformer = (scaleModel: ScaleModel) => (visualCandleSource: VisualCandle[]) => {
	if (visualCandleSource.length !== 0) {
		const vCandles = visualCandleSource.slice(
			Math.max(visualCandleSource.length - scaleModel.state.defaultViewportItems, 0),
		);
		const startCandle = vCandles[0];
		const endCandle = vCandles[vCandles.length - 1];
		scaleModel.setXScale(startCandle.startUnit, endCandle.startUnit + endCandle.width + scaleModel.offsets.right);
		scaleModel.doAutoScale(true);
		scaleModel.recalculateZoomXYRatio();
		scaleModel.fireChanged();
	}
};

/**
 * Moves the viewport between 2 timestamps.
 * @param scaleModel
 * @param chartModel
 * @param canvasAnimationContainer
 */
export const createTimeFrameViewportTransformer =
	(scaleModel: ScaleModel, chartModel: ChartModel) =>
	(timeframe: [Timestamp, Timestamp], zoomIn: boolean | null = null) => {
		const [firstTimestamp, lastTimestamp] = timeframe;
		const xStart = chartModel.candleFromTimestamp(firstTimestamp).startUnit;
		const xEnd = chartModel.candleFromTimestamp(lastTimestamp).startUnit;
		const additionalAnimationWidth = zoomIn === null ? 0 : chartModel.mainCandleSeries.meanCandleWidth * 2;
		const animationEffectXStart = zoomIn ? xStart - additionalAnimationWidth : xStart + additionalAnimationWidth;
		const animationEffectXEnd = zoomIn ? xEnd + additionalAnimationWidth : xEnd - additionalAnimationWidth;
		scaleModel.setXScale(animationEffectXStart, animationEffectXEnd);
	};
