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
import { floor } from '../../utils/math.utils';
import { HTSeriesDrawerConfig, SeriesDrawer } from '../data-series.drawer';

export class AreaDrawer implements SeriesDrawer {
	constructor(private config: ChartConfigComponentsChart) {}

	public draw(
		ctx: CanvasRenderingContext2D,
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	) {
		const isHitTestDrawer = !!hitTestDrawerConfig.color;

		if (model instanceof CandleSeriesModel) {
			// @ts-ignore
			const visualCandles: VisualCandle[] = flat(points);
			if (visualCandles.length === 0) {
				return;
			}
			if (hitTestDrawerConfig.color) {
				ctx.strokeStyle = hitTestDrawerConfig.color;
			} else {
				ctx.strokeStyle = model.colors.areaTheme.lineColor;
			}

			if (isHitTestDrawer) {
				ctx.lineWidth = hitTestDrawerConfig.hoverWidth ?? this.config.selectedWidth * 3;
			} else if (model.highlighted) {
				ctx.lineWidth = this.config.selectedWidth;
			} else {
				ctx.lineWidth = this.config.areaLineWidth;
			}

			const paneBounds = model.extentComponent.getBounds();

			const first = visualCandles[0];
			const firstLineX = model.view.toX(first.centerUnit);
			for (let i = 0; i < visualCandles.length; i++) {
				const prev = visualCandles[i - 1];
				const next = visualCandles[i + 1];
				const visualCandle = visualCandles[i];

				const lineX = model.view.toX(visualCandle.centerUnit);
				const closeY = model.view.toY(visualCandle.close);
				const bottomY = paneBounds.y + paneBounds.height;
				if (prev === void 0) {
					ctx.beginPath();
					ctx.lineTo(floor(lineX), bottomY);
					ctx.moveTo(floor(lineX), closeY);
				} else if (next === void 0) {
					ctx.lineTo(floor(lineX), closeY);
					ctx.stroke();
					ctx.lineTo(floor(lineX), bottomY);
					ctx.lineTo(floor(firstLineX), bottomY);
					ctx.closePath();

					let fillColor: CanvasGradient;
					if (hitTestDrawerConfig.color) {
						ctx.fillStyle = hitTestDrawerConfig.color;
					} else {
						ctx.fillStyle =
							model.colors.areaTheme.startColor && model.colors.areaTheme.stopColor
								? ((fillColor = ctx.createLinearGradient(0, 0, 0, paneBounds.height)),
								  fillColor.addColorStop(0, model.colors.areaTheme.startColor),
								  fillColor.addColorStop(1, model.colors.areaTheme.stopColor),
								  fillColor)
								: '';
					}
					if (!isHitTestDrawer) {
						ctx.fill();
					}
				} else {
					ctx.lineTo(lineX, closeY);
				}
			}
		}
	}
}
