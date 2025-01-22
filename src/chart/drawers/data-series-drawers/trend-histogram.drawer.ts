/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { VisualSeriesPoint, DataSeriesModel } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';
import { SeriesDrawer } from '../data-series.drawer';

export class TrendHistogramDrawer implements SeriesDrawer {
	constructor() {}

	draw(ctx: CanvasRenderingContext2D, allPoints: VisualSeriesPoint[][], model: DataSeriesModel): void {
		const zero = model.view.toY(0);
		//  here I do flat, thinks that there is no more that 1 series
		const allPointsFlat = flat(allPoints);
		const config = model.getPaintConfig(0);

		allPointsFlat.forEach((point, idx) => {
			// odd width is crucial to draw histogram without antialiasing
			// 2 colors: Negative and Positive
			if (config.multiplyColors?.length === 2) {
				ctx.strokeStyle =
					(point.close < this.previousValue(allPointsFlat, idx)
						? config.multiplyColors[1]
						: config.multiplyColors[0]) ||
					config.color ||
					'#FF00FF';
				ctx.lineWidth = config.lineWidth;
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
				const prevPointClose = this.previousValue(allPointsFlat, idx);
				if (point.close < prevPointClose && point.close < 0) {
					ctx.strokeStyle = config.multiplyColors[0] || config.color || '#FF00FF';
				}
				if (point.close > prevPointClose && point.close < 0) {
					ctx.strokeStyle = config.multiplyColors[1] || config.color || '#FF00FF';
				}
				if (point.close < prevPointClose && point.close > 0) {
					ctx.strokeStyle = config.multiplyColors[2] || config.color || '#FF00FF';
				}
				if (point.close > prevPointClose && point.close > 0) {
					ctx.strokeStyle = config.multiplyColors[3] || config.color || '#FF00FF';
				}
				ctx.lineWidth = config.lineWidth;
				ctx.beginPath();
				const x = model.view.toX(point.centerUnit);
				const y = model.view.toY(point.close);
				ctx.moveTo(x, zero);
				ctx.lineTo(x, y);
				ctx.stroke();
				return;
			}
			// 1 color
			ctx.strokeStyle = config.color || '#FF00FF';
			ctx.lineWidth = config.lineWidth;
			ctx.beginPath();
			const x = model.view.toX(point.centerUnit);
			const y = model.view.toY(point.close);
			ctx.moveTo(x, zero);
			ctx.lineTo(x, y);
			ctx.stroke();
		});
	}

	//weird but works
	private previousValue(arr: VisualSeriesPoint[], idx: number): number {
		do {
			idx--;
		} while (idx >= 0 && !isFinite(arr[idx] && arr[idx].close));
		return arr[idx] ? arr[idx].close : Number.NaN;
	}
}
