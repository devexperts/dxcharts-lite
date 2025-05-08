/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DynamicModelDrawer } from '../components/dynamic-objects/dynamic-objects.drawer';
import { PaneManager } from '../components/pane/pane-manager.component';
import { CanvasModel } from '../model/canvas.model';
import { DataSeriesModel, VisualSeriesPoint } from '../model/data-series.model';
import { clipToBounds } from '../utils/canvas/canvas-drawing-functions.utils';
import { isEmpty } from '../utils/object.utils';

export interface HTSeriesDrawerConfig {
	color?: string;
	hoverWidth?: number;
}

export interface SeriesDrawer {
	draw: (
		ctx: CanvasRenderingContext2D,
		/**
		 * You can pass two-dimension array to divide series into multiple parts
		 */
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
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
export class DataSeriesDrawer implements DynamicModelDrawer<DataSeriesModel> {
	constructor(private paneManager: PaneManager, private readonly seriesDrawers: Record<string, SeriesDrawer>) {}

	draw(canvasModel: CanvasModel, model: DataSeriesModel, paneUUID?: string) {
		const ctx = canvasModel.ctx;
		const pane = paneUUID && this.paneManager.panes[paneUUID];

		if (model) {
			ctx.save();
			pane && clipToBounds(ctx, pane.getBounds());
			this.drawSeries(ctx, model);
			ctx.restore();
		}
	}

	public drawSeries(ctx: CanvasRenderingContext2D, series: DataSeriesModel) {
		const visibilityPredicates = series.config.additionalVisibilityPredicatesMap;
		if (series.config.visible || (visibilityPredicates && !isEmpty(visibilityPredicates))) {
			const paintTool = series.config.type;
			const drawer = this.seriesDrawers[paintTool];
			if (drawer) {
				const viewportSeries = series.getSeriesInViewport(series.scale.xStart - 1, series.scale.xEnd + 1);
				if (viewportSeries && viewportSeries.length >= 1) {
					// +- 1 to correctly draw points which are partly inside bounds
					drawer.draw(ctx, viewportSeries, series, {});
				}
			} else {
				console.error(`Data series drawer with type ${paintTool} isn't registered!`);
			}
		}
	}
}

export const setLineWidth = (
	ctx: CanvasRenderingContext2D,
	lineWidth: number,
	dataSeries: DataSeriesModel,
	hitTestDrawerConfig: HTSeriesDrawerConfig,
	seriesSelectedWidth: number = lineWidth,
) => {
	if (hitTestDrawerConfig.hoverWidth) {
		ctx.lineWidth = hitTestDrawerConfig.hoverWidth;
	} else if (dataSeries.highlighted) {
		ctx.lineWidth = lineWidth !== seriesSelectedWidth ? lineWidth + 1 : seriesSelectedWidth;
	} else {
		ctx.lineWidth = lineWidth;
	}
};
