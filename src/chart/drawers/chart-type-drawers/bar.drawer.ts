/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartConfigComponentsChart } from '../../chart.config';
import { CandleSeriesModel } from '../../model/candle-series.model';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import VisualCandle from '../../model/visual-candle';
import { flat } from '../../utils/array.utils';
import { avoidAntialiasing } from '../../utils/canvas/canvas-drawing-functions.utils';
import { floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { HTSeriesDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';

export class BarDrawer implements SeriesDrawer {
	constructor(private config: ChartConfigComponentsChart) {}

	private setFillStyle(
		ctx: CanvasRenderingContext2D,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
		candleSeries: CandleSeriesModel,
		visualCandle: VisualCandle,
	) {
		if (hitTestDrawerConfig.color) {
			ctx.strokeStyle = hitTestDrawerConfig.color;
		} else {
			const barTheme = candleSeries.colors.barTheme;
			if (barTheme) {
				ctx.strokeStyle = barTheme[`${visualCandle.name}Color`];
			}
		}
	}

	public draw(
		ctx: CanvasRenderingContext2D,
		points: VisualSeriesPoint[][],
		candleSeries: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	) {
		if (candleSeries instanceof CandleSeriesModel) {
			// @ts-ignore
			const visualCandles: VisualCandle[] = flat(points);
			setLineWidth(ctx, this.config.barLineWidth, candleSeries, hitTestDrawerConfig);
			avoidAntialiasing(ctx, () => {
				for (const visualCandle of visualCandles) {
					this.setFillStyle(ctx, hitTestDrawerConfig, candleSeries, visualCandle);
					ctx.beginPath();
					const bodyLineX = candleSeries.view.toX(visualCandle.centerUnit);
					const openLineStartX = candleSeries.view.toX(visualCandle.startUnit);
					const [wickStartY, bodyStartY, bodyEndY, wickEndY] = visualCandle.yBodyKeyPoints(candleSeries.view);
					const w = floorToDPR(candleSeries.view.xPixels(visualCandle.width) / 2);
					const bodyCloseY = candleSeries.view.toY(visualCandle.close);
					const bodyOpenY = candleSeries.view.toY(visualCandle.open);

					if (this.config.showWicks) {
						ctx.moveTo(bodyLineX, wickStartY);
						ctx.lineTo(bodyLineX, wickEndY);
					} else {
						ctx.moveTo(bodyLineX, bodyStartY);
						ctx.lineTo(bodyLineX, bodyEndY);
					}

					/* close line start */
					ctx.moveTo(bodyLineX, bodyCloseY);
					ctx.lineTo(bodyLineX + w, bodyCloseY);
					/* close line end */

					/* open line start */
					ctx.moveTo(openLineStartX, bodyOpenY);
					ctx.lineTo(bodyLineX, bodyOpenY);
					/* open line end */
					ctx.stroke();
				}
			});
		}
	}
}
