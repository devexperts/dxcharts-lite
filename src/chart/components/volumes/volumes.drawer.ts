/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BarType, FullChartConfig } from '../../chart.config';
import { clipToBounds } from '../../utils/canvas/canvas-drawing-functions.utils';
import { PriceMovement } from '../../model/candle-series.model';
import { CanvasModel } from '../../model/canvas.model';
import { Pixel, ViewportModel, unitToPixels } from '../../model/scaling/viewport.model';
import VisualCandle from '../../model/visual-candle';
import { flat } from '../../utils/array.utils';
import { ceilToDPR, floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { ChartModel } from '../chart/chart.model';
import { DynamicModelDrawer } from '../dynamic-objects/dynamic-objects.drawer';
import { resolveColorUsingConfig } from './volume-color-resolvers.functions';
import { VolumeColorResolver } from './volumes.component';
import { VolumesModel } from './volumes.model';

// ratio of CHART bounds height which is for overlay volumes
const OVERLAY_VOLUME_TOTAL_HEIGHT_DIVISOR = 3;

export class VolumesDrawer implements DynamicModelDrawer<VolumesModel> {
	private readonly volumeBarColors: Record<PriceMovement, string> = {
		down: '#FF00FF',
		up: '#FF00FF',
		none: '#FF00FF',
	};
	constructor(
		private config: FullChartConfig,
		private volumesModel: VolumesModel,
		private chartModel: ChartModel,
		public getViewportModel: () => ViewportModel,
		private volumesColorByChartTypeMap: Partial<Record<BarType, VolumeColorResolver>>,
		private drawPredicate: () => boolean,
	) {}

	/**
	 * This function is used to calculate the colors for each volume bar. It is an optimization to avoid calculating the color for each volume, which can be expensive.
	 * @param {BarType} barType - The type of bar to calculate the color for.
	 * @returns {void}
	 */
	private calculateColors(barType: BarType) {
		const getVolumeBarColor = this.volumesColorByChartTypeMap[barType] ?? resolveColorUsingConfig;
		this.volumeBarColors['down'] = getVolumeBarColor('down', this.config.colors);
		this.volumeBarColors['up'] = getVolumeBarColor('up', this.config.colors);
		this.volumeBarColors['none'] = getVolumeBarColor('none', this.config.colors);
	}

	/**
	 * Draws the volumes on the chart canvas if the volumes are visible and the drawPredicate is true.
	 * Calculates the colors based on the chart type and saves the canvas context.
	 * Clips the canvas to the viewport bounds and draws the volumes.
	 * Restores the canvas context.
	 * @returns {void}
	 */
	draw(canvasModel: CanvasModel): void {
		if (this.config.components.volumes.visible && this.drawPredicate()) {
			this.calculateColors(this.config.components.chart.type);
			const ctx = canvasModel.ctx;
			ctx.save();
			const bounds = this.getViewportModel().getBounds();
			clipToBounds(ctx, bounds);
			this.drawVolumes(canvasModel);
			ctx.restore();
		}
	}

	/**
	 * Draws the last bar of the chart if the volumes component is visible.
	 * TODO: Rework the function.
	 *
	 * @returns {void}
	 */
	drawLastBar(): void {
		if (this.config.components.volumes.visible) {
			// TODO rework
			// this.calculateColors(this.config.components.chart.type);
			// const ctx = this.canvasModel.ctx;
			// const lastVolume = lastOf(this.volumes.data);
			// if (lastVolume) {
			// 	ctx.fillStyle = this.volumeBarColors[lastVolume.direction];
			// 	const { width, height, x, y } = lastVolume;
			// 	ctx.fillRect(x, y, width, height);
			// }
		}
	}

	/**
	 * Draws volumes on the chart based on the data provided by the volumesModel and chartModel.
	 * If the volumeMax is 0, the function will return without drawing anything.
	 * The function loops through all the candles in the viewport and calculates the x, y, width and height of each volume bar.
	 * If the config.components.volumes.showSeparately is true, the function will draw each volume bar separately.
	 * Otherwise, it will calculate the zoomY based on the volumeMax and the fullVHeight, and draw all the volume bars together.
	 * @private
	 */
	private drawVolumes(canvasModel: CanvasModel) {
		const volumeMax = this.volumesModel.volumeMax.getValue();
		if (volumeMax === 0) {
			return;
		}
		const viewportModel = this.getViewportModel();
		if (!viewportModel.isViewportValid()) {
			return;
		}
		const candles = flat(
			this.chartModel.mainCandleSeries
				// TODO volumes drawer should be a part of data series drawer
				.getSeriesInViewport(this.chartModel.scale.xStart - 1, this.chartModel.scale.xEnd + 1),
		);
		candles.forEach((vCandle, idx) => {
			if (vCandle.candle.volume) {
				const bounds = viewportModel.getBounds();
				const fullVHeight = bounds.height;
				if (fullVHeight <= 0) {
					return;
				}
				const nextX =
					candles[idx + 1] !== undefined
						? floorToDPR(viewportModel.toX(candles[idx + 1].startUnit))
						: undefined;
				const x = floorToDPR(viewportModel.toX(vCandle.startUnit));
				const width =
					nextX !== undefined ? nextX - x : floorToDPR(unitToPixels(vCandle.width, viewportModel.zoomX));
				if (this.config.components.volumes.showSeparately) {
					const y = floorToDPR(viewportModel.toY(vCandle.candle.volume));
					const height = ceilToDPR(viewportModel.toY(0)) - y;
					this.drawVolume(canvasModel, vCandle, x, y, width, height);
				} else {
					const volumeHeightDivisor = fullVHeight / OVERLAY_VOLUME_TOTAL_HEIGHT_DIVISOR;
					if (volumeHeightDivisor <= 0) {
						return;
					}
					const zoomY = volumeMax / volumeHeightDivisor;
					if (!isFinite(zoomY) || zoomY <= 0) {
						return;
					}
					const calculatedHeight = Math.max(ceilToDPR(unitToPixels(vCandle.candle.volume, zoomY)), 2);
					const height = Math.min(calculatedHeight, fullVHeight);
					const y = floorToDPR(bounds.y + fullVHeight - height);
					this.drawVolume(canvasModel, vCandle, x, y, width, height);
				}
			}
		});
	}
	/**
	 * Draws a volume bar on the canvas.
	 *
	 * @private
	 * @param {VisualCandle} vCandle - The visual candle object.
	 * @param {Pixel} x - The x coordinate of the top-left corner of the volume bar.
	 * @param {Pixel} y - The y coordinate of the top-left corner of the volume bar.
	 * @param {Pixel} width - The width of the volume bar.
	 * @param {Pixel} height - The height of the volume bar.
	 * @returns {void}
	 */
	private drawVolume(
		canvasModel: CanvasModel,
		vCandle: VisualCandle,
		x: Pixel,
		y: Pixel,
		width: Pixel,
		height: Pixel,
	) {
		const ctx = canvasModel.ctx;
		const yStart = y;
		const yEnd = y + height;
		const direction = vCandle.name;
		ctx.fillStyle = this.volumeBarColors[direction];
		ctx.strokeStyle = this.volumeBarColors[direction];
		if (width === 0) {
			// just draw a vertical line
			ctx.beginPath();
			ctx.moveTo(x, yStart);
			ctx.lineTo(x, ceilToDPR(yEnd));
			ctx.stroke();
		} else {
			ctx.fillRect(x, y, width, height);
		}
	}
}
