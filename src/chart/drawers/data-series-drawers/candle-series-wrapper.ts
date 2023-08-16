/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BarType, FullChartConfig } from '../../chart.config';
import { BoundsProvider } from '../../model/bounds.model';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { ChartDrawerConfig, clipToBounds, SeriesDrawer } from '../data-series.drawer';

export const candleTypesList: BarType[] = [
	'candle',
	'bar',
	'line',
	'area',
	'scatterPlot',
	'hollow',
	'histogram',
	'baseline',
	'trend',
];

/**
 * A decorator for drawers, that draw something depending on visual candles
 */
export class CandleSeriesWrapper implements SeriesDrawer {
	constructor(private drawer: SeriesDrawer, private config: FullChartConfig, private chartBounds: BoundsProvider) {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		config: ChartDrawerConfig,
	): void {
		if (this.isChartTypeAllowed()) {
			this.beforeDraw(ctx);
			this.drawer.draw(ctx, allPoints, model, config);
			this.afterDraw(ctx, model);
		}
	}

	private beforeDraw(ctx: CanvasRenderingContext2D) {
		// by default we have clip to study underlay area if study is underlying
		// remove clip if study is underlying, because we need to color candles on main chart
		// in the end we have to restore original clip
		// if (!studySeries.overlaying) {
		ctx.restore();
		ctx.save();
		clipToBounds(ctx, this.chartBounds());
		// }
	}

	private isChartTypeAllowed() {
		return candleTypesList.includes(this.config.components.chart.type);
	}

	private afterDraw(ctx: CanvasRenderingContext2D, model: DataSeriesModel) {
		// restore previous clip
		// if (!studySeries.overlaying) {
		ctx.restore();
		ctx.save();
		clipToBounds(ctx, model.scaleModel.getBounds());
		// }
	}
}
