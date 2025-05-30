/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { PaneManager } from '../components/pane/pane-manager.component';
import { DataSeriesModel } from '../model/data-series.model';
import { HitTestCanvasModel } from '../model/hit-test-canvas.model';
import { HTSeriesDrawerConfig, SeriesDrawer } from './data-series.drawer';
import { clipToBounds } from '../utils/canvas/canvas-drawing-functions.utils';
import { Drawer } from './drawing-manager';

export const HIT_TEST_HOVER_WIDTH = 7;

/***
 * HitTest Chart drawer. It's used to draw hit test for chart types on the hit-test canvas.
 */
export class HTDataSeriesDrawer implements Drawer {
	constructor(
		private readonly seriesDrawers: Record<string, SeriesDrawer>,
		private canvasModel: HitTestCanvasModel,
		private paneManager: PaneManager,
		private drawPredicate: () => boolean = () => true,
	) {}

	draw() {
		if (this.drawPredicate()) {
			const ctx = this.canvasModel.ctx;
			this.paneManager.yExtents.forEach(comp => {
				ctx.save();
				clipToBounds(ctx, comp.getBounds());
				comp.dataSeries.forEach(series => this.drawSeries(ctx, series));
				ctx.restore();
			});
		}
	}

	public drawSeries(ctx: CanvasRenderingContext2D, series: DataSeriesModel) {
		if (series.config.visible) {
			const paintTool = series.config.type;
			const drawer = this.seriesDrawers[paintTool];
			if (drawer) {
				const drawConfig: HTSeriesDrawerConfig = {
					color: this.canvasModel.idToColor(series.htId),
					hoverWidth: HIT_TEST_HOVER_WIDTH,
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
