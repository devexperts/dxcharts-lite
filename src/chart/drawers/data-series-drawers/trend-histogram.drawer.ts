/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { VisualSeriesPoint, DataSeriesModel } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';
import { floor } from '../../utils/math.utils';
import { SeriesDrawer } from '../data-series.drawer';

export class TrendHistogramDrawer implements SeriesDrawer {
	constructor() {}

	draw(ctx: CanvasRenderingContext2D, allPoints: VisualSeriesPoint[][], model: DataSeriesModel): void {
		const zero = model.view.toY(0);
		// here I do flat, thinks that there is no more that 1 series
		const allPointsFlat = flat(allPoints);
		const items: [VisualSeriesPoint[], VisualSeriesPoint[]] = [[], []];
		allPointsFlat.forEach((item, idx, array) => {
			items[item.close < this.previousValue(array, idx) ? 1 : 0].push(item);
		});

		items.forEach((points, idx) => {
			// odd width is crucial to draw histogram without antialiasing
			const config = model.getPaintConfig(idx);
			ctx.strokeStyle = idx === 0 ? config.color : config.aditionalColor || '#FF00FF';
			ctx.lineWidth = config.lineWidth;
			ctx.beginPath();
			points.forEach(p => {
				const x = model.view.toX(p.centerUnit);
				const y = model.view.toY(p.close);
				ctx.moveTo(x, floor(zero));
				ctx.lineTo(x, floor(y));
			});
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
