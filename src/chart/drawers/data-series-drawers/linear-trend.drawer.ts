/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';
import { HTSeriesDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';

export class LinearTrendDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	): void {
		const allPointsFlat = flat(allPoints);
		const config = model.getPaintConfig(0);
		setLineWidth(ctx, config.lineWidth, model, hitTestDrawerConfig, config.hoveredLineWidth);
		ctx.lineCap = 'round';
		allPointsFlat.forEach((point, idx) => {
			const previousValue = getPreviousValue(allPointsFlat, idx) || allPointsFlat[0];
			const isNegativeTrend = previousValue && point.close < previousValue.close;
			if (config.multiplyColors?.length === 2) {
				ctx.strokeStyle =
					hitTestDrawerConfig.color ??
					((isNegativeTrend ? config.multiplyColors[1] : config.multiplyColors[0]) ||
						config.color ||
						'#FF00FF');

				const x = model.view.toX(point.centerUnit);
				const y = model.view.toY(point.close);

				const prevX = model.view.toX(previousValue.centerUnit);
				const prevY = model.view.toY(previousValue.close);

				ctx.beginPath();
				ctx.moveTo(prevX, prevY);
				ctx.lineTo(x, y);
				ctx.stroke();

				return;
			}
		});
	}
}

export const getPreviousValue = (arr: VisualSeriesPoint[], idx: number) => {
	do {
		idx--;
	} while (idx >= 0 && !isFinite(arr[idx] && arr[idx].close));
	return arr[idx] ? arr[idx] : undefined;
};
