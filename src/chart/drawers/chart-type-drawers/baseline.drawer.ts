/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { BaselineModel } from '../../model/baseline.model';
import { CandleSeriesModel } from '../../model/candle-series.model';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { Pixel } from '../../model/scaling/viewport.model';
import { flat } from '../../utils/array.utils';
import { ChartDrawerConfig, SeriesDrawer } from '../data-series.drawer';

export class BaselineDrawer implements SeriesDrawer {
	constructor(private baseLineModel: BaselineModel, private canvasBoundContainer: CanvasBoundsContainer) {}

	public draw(
		ctx: CanvasRenderingContext2D,
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig?: ChartDrawerConfig,
	) {
		if (drawerConfig !== undefined && model instanceof CandleSeriesModel) {
			const visualCandles = flat(points);
			// calculate baseline
			const baselineYPercents = this.baseLineModel.baselineYPercents;
			const chartBounds = this.canvasBoundContainer.getBounds(CanvasElement.CHART);
			const baseLine: Pixel = chartBounds.y + chartBounds.height * (baselineYPercents / 100);

			const first = visualCandles[0];
			for (let i = 0; i < visualCandles.length; i++) {
				const current = visualCandles[i];
				const prev = visualCandles[i - 1];
				const next = visualCandles[i + 1];

				const firstLineXPx = model.view.toX(first.centerUnit);
				const currentLineXPx = model.view.toX(current.centerUnit);
				const currentCloseYPx = model.view.toY(current.close);

				const prevHigherThanBL = prev ? model.view.toY(prev.close) < baseLine : false;
				const curHigherThanBL = currentCloseYPx < baseLine;

				if (prev !== void 0 && prevHigherThanBL !== curHigherThanBL) {
					setBaselineFillStyle(ctx, model, drawerConfig, prevHigherThanBL);

					const prevLineXPx = model.view.toX(prev.centerUnit);
					const prevCloseYPx = model.view.toY(prev.close);

					// our goal here is to find the crossing point X between chart line and baseline
					const distanceWidth = currentLineXPx - prevLineXPx;
					const distanceHeight = currentCloseYPx - prevCloseYPx;
					const tg = distanceWidth / distanceHeight;
					const distanceHeightToBL = currentCloseYPx - baseLine;
					// distance from crossing point BL and area line to current candle X
					const distanceWidthBL = tg * distanceHeightToBL;

					const xPx = prevLineXPx + (distanceWidth - distanceWidthBL);
					ctx.lineTo(xPx, baseLine);
					ctx.stroke();
					ctx.lineTo(firstLineXPx, baseLine);
					ctx.closePath();
					ctx.fill();

					ctx.beginPath();
					ctx.moveTo(xPx, baseLine);
				}

				if (prev === void 0) {
					ctx.beginPath();
					ctx.moveTo(currentLineXPx, currentCloseYPx);
				} else if (next === void 0) {
					setBaselineFillStyle(ctx, model, drawerConfig, curHigherThanBL);
					ctx.lineTo(currentLineXPx, currentCloseYPx);
					ctx.stroke();
					ctx.lineTo(currentLineXPx, baseLine);
					ctx.lineTo(firstLineXPx, baseLine);
					ctx.closePath();
					ctx.fill();

					ctx.beginPath();
					ctx.moveTo(firstLineXPx, baseLine);
					ctx.lineTo(currentLineXPx, baseLine);
					ctx.strokeStyle = model.colors.baseLineTheme.baselineColor;
					ctx.stroke();
				} else {
					ctx.lineTo(currentLineXPx, currentCloseYPx);
				}
			}
		}
	}
}

const setBaselineFillStyle = (
	ctx: CanvasRenderingContext2D,
	candleSeries: CandleSeriesModel,
	drawerConfig: ChartDrawerConfig,
	upper: boolean,
): void => {
	if (drawerConfig.singleColor) {
		ctx.fillStyle = drawerConfig.singleColor;
		ctx.strokeStyle = drawerConfig.singleColor;
	} else {
		ctx.fillStyle = upper
			? candleSeries.colors.baseLineTheme.upperSectionFillColor
			: candleSeries.colors.baseLineTheme.lowerSectionFillColor;
		ctx.strokeStyle = upper
			? candleSeries.colors.baseLineTheme.upperSectionStrokeColor
			: candleSeries.colors.baseLineTheme.lowerSectionStrokeColor;
	}
};
