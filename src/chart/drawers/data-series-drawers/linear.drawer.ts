/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { Viewable } from '../../model/scaling/viewport.model';
import { ChartDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';
import { buildLinePath } from './data-series-drawers.utils';

export class LinearDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	): void {
		allPoints.forEach((points, idx) => {
			const config = model.getPaintConfig(idx);
			setLineWidth(ctx, config.lineWidth, model, drawerConfig, config.hoveredLineWidth);
			ctx.strokeStyle = drawerConfig.singleColor ?? config.color;
			this.drawLinePath(ctx, points, model.view);
		});
	}

	private drawLinePath(ctx: CanvasRenderingContext2D, points: VisualSeriesPoint[], view: Viewable) {
		ctx.beginPath();
		buildLinePath(points, ctx, view);
		ctx.stroke();
	}
}
