/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { HTSeriesDrawerConfig, SeriesDrawer } from '../data-series.drawer';

export class TriangleDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	): void {
		allPoints.forEach((points, idx) => {
			const config = model.getPaintConfig(idx);
			ctx.fillStyle = hitTestDrawerConfig.color ?? config.color;
			points.forEach(p => {
				const x = model.view.toX(p.centerUnit);
				const y = model.view.toY(p.close);
				this.drawCandleTriangle(ctx, x, y, config.lineWidth);
			});
		});
	}

	private drawCandleTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, triangleWidth: number) {
		ctx.beginPath();
		ctx.moveTo(x - triangleWidth / 2, y);
		ctx.lineTo(x, y - triangleWidth);
		ctx.lineTo(x + triangleWidth / 2, y);
		ctx.fill();
	}
}
