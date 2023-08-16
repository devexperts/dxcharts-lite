/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ScatterPlotStyle } from '../../chart.config';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';
import { floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { ChartDrawerConfig, SeriesDrawer } from '../data-series.drawer';

const SCATTER_PLOT_RADIUS = 1.5;

export class ScatterPlotDrawer implements SeriesDrawer {
	constructor(private config: ScatterPlotStyle) {}

	public draw(
		ctx: CanvasRenderingContext2D,
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	) {
		ctx.fillStyle = drawerConfig.singleColor ?? this.config.mainColor;
		for (const visualCandle of flat(points)) {
			ctx.beginPath();
			const lineX = floorToDPR(model.view.toX(visualCandle.centerUnit));
			const closeY = floorToDPR(model.view.toY(visualCandle.close));
			ctx.arc(lineX, closeY, SCATTER_PLOT_RADIUS, 0, Math.PI * 2, true);
			ctx.fill();
		}
	}
}
