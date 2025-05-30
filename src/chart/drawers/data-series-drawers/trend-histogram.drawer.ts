/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { VisualSeriesPoint, DataSeriesModel } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';
import { HTSeriesDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';

export class TrendHistogramDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	): void {
		const zero = model.view.toY(0);
		//  here I do flat, thinks that there is no more that 1 series
		const allPointsFlat = flat(allPoints);
		const config = model.getPaintConfig(0);
		setLineWidth(ctx, config.lineWidth, model, hitTestDrawerConfig, config.hoveredLineWidth);

		allPointsFlat.forEach((point, idx) => {
			// odd width is crucial to draw histogram without antialiasing
			// 2 colors: Negative and Positive
			const previousClose = previousValue(allPointsFlat, idx);
			const isNegativeTrend = previousClose && point.close < previousClose;
			if (config.multiplyColors?.length === 2) {
				ctx.strokeStyle =
					hitTestDrawerConfig.color ??
					((isNegativeTrend ? config.multiplyColors[1] : config.multiplyColors[0]) ||
						config.color ||
						'#FF00FF');

				ctx.beginPath();
				const x = model.view.toX(point.centerUnit);
				const y = model.view.toY(point.close);
				ctx.moveTo(x, zero);
				ctx.lineTo(x, y);
				ctx.stroke();
				return;
			}
			// 4 colors: Negative and Down, Negative and Up, Positive and Down, Positive and Up
			if (config.multiplyColors?.length === 4) {
				if (isNegativeTrend && point.close < 0) {
					ctx.strokeStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[0] || config.color || '#FF00FF');
				}
				if (!isNegativeTrend && point.close < 0) {
					ctx.strokeStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[1] || config.color || '#FF00FF');
				}
				if (isNegativeTrend && point.close > 0) {
					ctx.strokeStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[2] || config.color || '#FF00FF');
				}
				if (!isNegativeTrend && point.close > 0) {
					ctx.strokeStyle =
						hitTestDrawerConfig.color ?? (config.multiplyColors[3] || config.color || '#FF00FF');
				}
				ctx.beginPath();
				const x = model.view.toX(point.centerUnit);
				const y = model.view.toY(point.close);
				ctx.moveTo(x, zero);
				ctx.lineTo(x, y);
				ctx.stroke();
				return;
			}
			// 1 color
			ctx.strokeStyle = hitTestDrawerConfig.color ?? (config.color || '#FF00FF');
			ctx.beginPath();
			const x = model.view.toX(point.centerUnit);
			const y = model.view.toY(point.close);
			ctx.moveTo(x, zero);
			ctx.lineTo(x, y);
			ctx.stroke();
		});
	}
}

// weird but works
export const previousValue = (arr: VisualSeriesPoint[], idx: number): number | undefined => {
	do {
		idx--;
	} while (idx >= 0 && !isFinite(arr[idx] && arr[idx].close));
	return arr[idx] ? arr[idx].close : undefined;
};
