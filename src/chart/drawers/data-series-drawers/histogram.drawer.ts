/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { floor } from '../../utils/math.utils';
import { HTSeriesDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';

export class HistogramDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	): void {
		const zero = model.view.toY(0);
		allPoints.forEach((points, idx) => {
			// odd width is crucial to draw histogram without antialiasing
			const config = model.getPaintConfig(idx);
			setLineWidth(ctx, config.lineWidth, model, hitTestDrawerConfig, config.hoveredLineWidth);
			ctx.strokeStyle = hitTestDrawerConfig.color ?? config.color;
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
}
