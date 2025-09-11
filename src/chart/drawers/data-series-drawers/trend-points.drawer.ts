/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { VisualSeriesPoint, DataSeriesModel } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';
import { HTSeriesDrawerConfig, SeriesDrawer } from '../data-series.drawer';

const DEFAULT_FILL_COLOR = '#FF00FF';

export class TrendPointsDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	): void {
		const allPointsFlat = flat(allPoints);
		const config = model.getPaintConfig(0);
		const radius = hitTestDrawerConfig.hoverWidth ? hitTestDrawerConfig.hoverWidth / 2 : config.lineWidth;

		allPointsFlat.forEach((point, idx) => {
			// 2 colors: Negative and Positive
			const previousClose = previousValue(allPointsFlat, idx);
			const isNegativeTrend = previousClose && point.close < previousClose;
			if (config.multiplyColors?.length === 2) {
				ctx.fillStyle =
					hitTestDrawerConfig.color ??
					((isNegativeTrend ? config.multiplyColors[1] : config.multiplyColors[0]) ||
						config.color ||
						DEFAULT_FILL_COLOR);

				const x = model.view.toX(point.centerUnit);
				const y = model.view.toY(point.close);
				ctx.arc(x, y, radius, 0, Math.PI * 2);
				ctx.fill();
				return;
			}
			// 4 colors: Negative and Down, Negative and Up, Positive and Down, Positive and Up
			if (config.multiplyColors?.length === 4) {
				if (isNegativeTrend && point.close < 0) {
					ctx.fillStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[0] || config.color || DEFAULT_FILL_COLOR);
				}
				if (!isNegativeTrend && point.close < 0) {
					ctx.fillStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[1] || config.color || DEFAULT_FILL_COLOR);
				}
				if (isNegativeTrend && point.close > 0) {
					ctx.fillStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[2] || config.color || DEFAULT_FILL_COLOR);
				}
				if (!isNegativeTrend && point.close > 0) {
					ctx.fillStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[3] || config.color || DEFAULT_FILL_COLOR);
				}
				ctx.beginPath();
				const x = model.view.toX(point.centerUnit);
				const y = model.view.toY(point.close);
				ctx.arc(x, y, radius, 0, Math.PI * 2);
				ctx.fill();
				return;
			}
			// 1 color
			ctx.fillStyle = hitTestDrawerConfig.color ?? (config.color || DEFAULT_FILL_COLOR);
			ctx.beginPath();
			const x = model.view.toX(point.centerUnit);
			const y = model.view.toY(point.close);
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();
		});
	}
}

export const previousValue = (arr: VisualSeriesPoint[], idx: number): number | undefined => {
	do {
		idx--;
	} while (idx >= 0 && !isFinite(arr[idx] && arr[idx].close));
	return arr[idx] ? arr[idx].close : undefined;
};
