/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { isOffscreenCanvasModel } from '../../canvas/offscreen/canvas-offscreen-wrapper';
import { ChartConfigComponentsHistogram } from '../../chart.config';
import { CandleSeriesModel } from '../../model/candle-series.model';
import { CanvasModel } from '../../model/canvas.model';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import VisualCandle from '../../model/visual-candle';
import { floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { ChartDrawerConfig, SeriesDrawer } from '../data-series.drawer';

export class HistogramDrawer implements SeriesDrawer {
	constructor(private config: ChartConfigComponentsHistogram) {}

	public draw(
		canvasModel: CanvasModel,
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	) {
		const ctx = canvasModel.ctx;
		if (model instanceof CandleSeriesModel) {
			// @ts-ignore
			const visualCandles: VisualCandle[] = points.flat();
			const bounds = model.scale.getBounds();
			const bottomY = bounds.y + bounds.height;
			for (const visualCandle of visualCandles) {
				ctx.beginPath();
				const direction = visualCandle.name;
				const capHeight = this.config.barCapSize;
				const histogramColors = model.colors.histogram;
				if (histogramColors === undefined) {
					return;
				}
				if (drawerConfig.singleColor) {
					ctx.fillStyle = drawerConfig.singleColor;
				} else {
					ctx.fillStyle = histogramColors[`${direction}Bright`];
				}

				// histogram cap
				const baseX = visualCandle.xStart(model.view);
				const closeY = floorToDPR(model.view.toY(visualCandle.close));
				const width = floorToDPR(model.view.xPixels(visualCandle.width));
				ctx.fillRect(baseX, closeY, width, capHeight);

				// the bar itself
				if (drawerConfig.singleColor) {
					ctx.fillStyle = drawerConfig.singleColor;
				} else {
					if (isOffscreenCanvasModel(canvasModel)) {
						const offscreenCtx = canvasModel.ctx;
						// special method for gradient fill, because we can't transfer CanvasGradient directly to offscreen
						offscreenCtx.setGradientFillStyle(
							0,
							closeY + capHeight,
							0,
							bottomY,
							0,
							histogramColors[`${direction}Cap`],
							1,
							histogramColors[`${direction}Bottom`],
						);
					} else {
						const gradient = ctx.createLinearGradient(0, closeY + capHeight, 0, bottomY);
						gradient.addColorStop(0, histogramColors[`${direction}Cap`]);
						gradient.addColorStop(1, histogramColors[`${direction}Bottom`]);
						ctx.fillStyle = gradient;
					}
				}
				if (width === 0) {
					// just draw a vertical line
					ctx.beginPath();
					ctx.strokeStyle = histogramColors[`${direction}Cap`];
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
