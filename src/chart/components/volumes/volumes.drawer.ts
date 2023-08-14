/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BarType, FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { clipToBounds } from '../../drawers/data-series.drawer';
import { Drawer } from '../../drawers/drawing-manager';
import { Pixel, unitToPixels, ViewportModel } from '../../model/scaling/viewport.model';
import VisualCandle from '../../model/visual-candle';
import { ceilToDPR, floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { ChartModel } from '../chart/chart.model';
import { resolveColorUsingConfig } from './volume-color-resolvers.functions';
import { VolumeColorResolver } from './volumes.component';
import { VolumesModel } from './volumes.model';
import { PriceMovement } from '../../model/candle-series.model';
import { flat } from '../../utils/array.utils';

// ratio of CHART bounds height which is for overlay volumes
const OVERLAY_VOLUME_TOTAL_HEIGHT_DIVISOR = 3;

export class VolumesDrawer implements Drawer {
	private readonly volumeBarColors: Record<PriceMovement, string> = {
		down: '#FF00FF',
		up: '#FF00FF',
		none: '#FF00FF',
	};
	constructor(
		private canvasModel: CanvasModel,
		private config: FullChartConfig,
		private volumesModel: VolumesModel,
		private chartModel: ChartModel,
		private viewportModel: ViewportModel,
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
	draw(): void {
		if (this.config.components.volumes.visible && this.drawPredicate()) {
			this.calculateColors(this.config.components.chart.type);
			const ctx = this.canvasModel.ctx;
			ctx.save();
			const bounds = this.viewportModel.getBounds();
			clipToBounds(ctx, bounds);
			this.drawVolumes();
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
	private drawVolumes() {
		const volumeMax = this.volumesModel.volumeMax.getValue();
		if (volumeMax === 0) {
			return;
		}
		const candles = flat(
			this.chartModel.mainCandleSeries
				// TODO volumes drawer should be a part of data series drawer
				.getSeriesInViewport(this.chartModel.scaleModel.xStart - 1, this.chartModel.scaleModel.xEnd + 1),
		);
		candles.forEach((vCandle, idx) => {
			if (vCandle.candle.volume) {
				const bounds = this.viewportModel.getBounds();
				const fullVHeight = bounds.height;
				const nextX =
					candles[idx + 1] !== undefined
						? floorToDPR(this.viewportModel.toX(candles[idx + 1].startUnit))
						: undefined;
				const x = floorToDPR(this.viewportModel.toX(vCandle.startUnit));
				const width =
					nextX !== undefined ? nextX - x : floorToDPR(unitToPixels(vCandle.width, this.viewportModel.zoomX));
				if (this.config.components.volumes.showSeparately) {
					const y = floorToDPR(this.viewportModel.toY(vCandle.candle.volume));
					const height = floorToDPR(this.viewportModel.toY(0)) - y;
					this.drawVolume(vCandle, x, y, width, height);
				} else {
					const zoomY = volumeMax / (fullVHeight / OVERLAY_VOLUME_TOTAL_HEIGHT_DIVISOR);
					const height = Math.max(unitToPixels(vCandle.candle.volume, zoomY), 2);
					const y = floorToDPR(bounds.y + fullVHeight - height);
					this.drawVolume(vCandle, x, y, width, height);
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
	private drawVolume(vCandle: VisualCandle, x: Pixel, y: Pixel, width: Pixel, height: Pixel) {
		const ctx = this.canvasModel.ctx;
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
			ctx.fillRect(x, y, width, ceilToDPR(height));
		}
	}
	/**
	 * Returns an array of canvas ids.
	 *
	 * @returns {Array<string>} An array containing the canvas id.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
