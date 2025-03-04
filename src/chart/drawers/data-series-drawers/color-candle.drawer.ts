/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartModel } from '../../components/chart/chart.model';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { unitToPixels } from '../../model/scaling/viewport.model';
import { floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { HTSeriesDrawerConfig, SeriesDrawer } from '../data-series.drawer';
import { floor } from '../../utils/math.utils';

/**
 * Some series have candles which are highlighted.
 * This drawer draws the candle box on top of original candles.
 */
export class ColorCandleDrawer implements SeriesDrawer {
	constructor(private chartModel: ChartModel) {}

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
				const visualCandle = this.chartModel.getVisualCandle(floor(p.centerUnit));
				const value = p.close;
				if (visualCandle && value === 1) {
					const zoomX = this.chartModel.scale.zoomX;
					const width = floorToDPR(unitToPixels(visualCandle.width, zoomX));
					const bodyH = floorToDPR(visualCandle.bodyHeight(this.chartModel.scale));
					const baseX = visualCandle.xCenter(this.chartModel.scale) - width / 2;
					const bodyStart = visualCandle.yBodyStart(this.chartModel.scale);
					const paddingPercent = this.chartModel.config.components.chart.candlePaddingPercent;
					const paddingWidthOffset = floorToDPR((width * paddingPercent) / 2);
					const paddingBaseX = baseX + paddingWidthOffset;
					const paddingWidth = width - paddingWidthOffset * 2;
					ctx.fillRect(paddingBaseX, bodyStart, paddingWidth, bodyH);
				}
			});
		});
	}
}
