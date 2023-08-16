/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { PaneManager } from '../components/pane/pane-manager.component';
import { Bounds } from '../model/bounds.model';
import { DataSeriesModel, VisualSeriesPoint } from '../model/data-series.model';
import { CanvasModel } from '../model/canvas.model';
import { Drawer } from './drawing-manager';
import { flatMap } from '../utils/array.utils';

export interface ChartDrawerConfig {
	singleColor?: string;
	forceBold?: number;
}

export interface SeriesDrawer {
	draw: (
		ctx: CanvasRenderingContext2D,
		/**
		 * You can pass two-dimension array to divide series into multiple parts
		 */
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	) => void;
}

export const transformToTwoDimension = (
	points: VisualSeriesPoint[] | VisualSeriesPoint[][],
	// @ts-ignore
): VisualSeriesPoint[][] => (Array.isArray(points[0]) ? points : [points]);

/**
 * Basic data series drawer.
 * Have multiple paint tools: linear, histogram, points, text above/below candle and others.
 *
 * (may support multiple layers in future)
 */
export class DataSeriesDrawer implements Drawer {
	constructor(
		private paneManager: PaneManager,
		private canvasModel: CanvasModel,
		private readonly seriesDrawers: Record<string, SeriesDrawer>,
	) {}

	draw() {
		const ctx = this.canvasModel.ctx;
		flatMap(Object.values(this.paneManager.paneComponents), c => c.yExtentComponents).forEach(comp => {
			ctx.save();
			clipToBounds(ctx, comp.getBounds());
			comp.dataSeries.forEach(series => this.drawSeries(ctx, series));
			ctx.restore();
		});
	}

	public drawSeries(ctx: CanvasRenderingContext2D, series: DataSeriesModel) {
		if (series.config.visible) {
			const paintTool = series.config.type;
			const drawer = this.seriesDrawers[paintTool];
			if (drawer) {
				const viewportSeries = series.getSeriesInViewport(
					series.scaleModel.xStart - 1,
					series.scaleModel.xEnd + 1,
				);
				if (viewportSeries && viewportSeries.length >= 1) {
					// +- 1 to correctly draw points which are partly inside bounds
					drawer.draw(ctx, viewportSeries, series, {});
				}
			} else {
				console.error(`Data series drawer with type ${paintTool} isn't registered!`);
			}
		}
	}

	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}

export const clipToBounds = (ctx: CanvasRenderingContext2D, bounds: Bounds) => {
	ctx.beginPath();
	ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
	ctx.clip();
	ctx.closePath();
};

export const setLineWidth = (
	ctx: CanvasRenderingContext2D,
	lineWidth: number,
	dataSeries: DataSeriesModel,
	drawerConfig: ChartDrawerConfig,
	seriesSelectedWidth: number = lineWidth,
) => {
	if (drawerConfig.forceBold) {
		ctx.lineWidth = drawerConfig.forceBold;
	} else if (dataSeries.hovered) {
		ctx.lineWidth = seriesSelectedWidth;
	} else {
		ctx.lineWidth = lineWidth;
	}
};
