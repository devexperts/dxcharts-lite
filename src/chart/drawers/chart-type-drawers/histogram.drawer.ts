/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartConfigComponentsHistogram } from '../../chart.config';
import { isCandleSeriesModel } from '../../model/candle-series.model';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import VisualCandle from '../../model/visual-candle';
import { floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { HTSeriesDrawerConfig, SeriesDrawer } from '../data-series.drawer';

export class HistogramDrawer implements SeriesDrawer {
	constructor(private config: ChartConfigComponentsHistogram) {}

	public draw(
		ctx: CanvasRenderingContext2D,
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	) {
		if (isCandleSeriesModel(model)) {
			// @ts-ignore
			const visualCandles: VisualCandle[] = points.flat();
			const bounds = model.scale.getBounds();
			const bottomY = bounds.y + bounds.height;
			for (const visualCandle of visualCandles) {
				ctx.beginPath();
				const direction = visualCandle.name;
				const capHeight = this.config.barCapSize;
				const histogramColors = model.colors.histogram;
				const customHistogramColor = model.customCandleColors[visualCandle.candle.idx ?? 0];

				if (histogramColors === undefined) {
					return;
				}
				if (hitTestDrawerConfig.color) {
					ctx.fillStyle = hitTestDrawerConfig.color;
				} else if (customHistogramColor) {
					ctx.fillStyle = customHistogramColor;
				} else {
					ctx.fillStyle = histogramColors[`${direction}Bright`];
				}

				// histogram cap
				const baseX = visualCandle.xStart(model.view);
				const closeY = model.view.toY(visualCandle.close);
				const width = floorToDPR(model.view.xPixels(visualCandle.width));
				ctx.fillRect(baseX, closeY, width, capHeight);

				// the bar itself
				const gradient = ctx.createLinearGradient(0, closeY + capHeight, 0, bottomY);
				if (hitTestDrawerConfig.color) {
					ctx.fillStyle = hitTestDrawerConfig.color;
				} else {
					const histogramCapColor = customHistogramColor || histogramColors[`${direction}Cap`];
					const histogramBottomColor = customHistogramColor || histogramColors[`${direction}Bottom`];
					gradient.addColorStop(0, histogramCapColor);
					gradient.addColorStop(1, histogramBottomColor);
					ctx.fillStyle = gradient;
				}
				if (width === 0) {
					// just draw a vertical line
					ctx.beginPath();
					ctx.strokeStyle = gradient;
					ctx.moveTo(baseX, closeY + capHeight);
					ctx.lineTo(baseX, bottomY);
					ctx.stroke();
					ctx.closePath();
				} else {
					ctx.fillRect(baseX, closeY + capHeight, width, bottomY - closeY - capHeight);
				}
			}
		}
	}
}
