/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { ChartDrawerConfig, SeriesDrawer } from '../data-series.drawer';

export class PointsDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	): void {
		allPoints.forEach((points, idx) => {
			const config = model.getPaintConfig(idx);
			const radius = config.lineWidth;
			ctx.fillStyle = drawerConfig.singleColor ?? config.color;
			ctx.lineWidth = 1;
			points.forEach(p => {
				ctx.beginPath();
				const x = model.view.toX(p.centerUnit);
				const y = model.view.toY(p.close);
				ctx.arc(x, y, radius, 0, Math.PI * 2);
				ctx.fill();
			});
		});
	}
}
