/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ScatterPlotStyle } from '../../chart.config';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';
import { HTSeriesDrawerConfig, SeriesDrawer } from '../data-series.drawer';

const SCATTER_PLOT_RADIUS = 1.5;

export class ScatterPlotDrawer implements SeriesDrawer {
	constructor(private config: ScatterPlotStyle) {}

	public draw(
		ctx: CanvasRenderingContext2D,
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	) {
		const radius = hitTestDrawerConfig.hoverWidth ? hitTestDrawerConfig.hoverWidth / 2 : SCATTER_PLOT_RADIUS;

		ctx.fillStyle = hitTestDrawerConfig.color ?? this.config.mainColor;
		for (const visualCandle of flat(points)) {
			ctx.beginPath();
			const lineX = model.view.toX(visualCandle.centerUnit);
			const closeY = model.view.toY(visualCandle.close);
			ctx.arc(lineX, closeY, radius, 0, Math.PI * 2, true);
			ctx.fill();
		}
	}
}
