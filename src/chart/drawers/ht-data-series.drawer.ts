/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { PaneManager } from '../components/pane/pane-manager.component';
import { DataSeriesModel } from '../model/data-series.model';
import { HitTestCanvasModel } from '../model/hit-test-canvas.model';
import { ChartDrawerConfig, SeriesDrawer } from './data-series.drawer';
import { clipToBounds } from '../utils/canvas/canvas-drawing-functions.utils';
import { Drawer } from './drawing-manager';

/***
 * HitTest Chart drawer. It's used to draw hit test for chart types on the hit-test canvas.
 */
export class HTDataSeriesDrawer implements Drawer {
	constructor(
		private readonly seriesDrawers: Record<string, SeriesDrawer>,
		private canvasModel: HitTestCanvasModel,
		private paneManager: PaneManager,
	) {}

	draw() {
		const ctx = this.canvasModel.ctx;
		this.paneManager.yExtents.forEach(comp => {
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
				const drawConfig: ChartDrawerConfig = {
					singleColor: this.canvasModel.idToColor(series.htId),
					forceBold: 7,
				};
				// +- 1 to correctly draw points which are partly inside bounds
				drawer.draw(
					ctx,
					series.getSeriesInViewport(series.scale.xStart - 1, series.scale.xEnd + 1),
					series,
					drawConfig,
				);
			}
		}
	}

	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
