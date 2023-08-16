/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { ChartBaseElement } from '../../model/chart-base-element';
import { FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { DrawingManager } from '../../drawers/drawing-manager';
import { ChartModel } from '../chart/chart.model';
import { HighLowDrawer } from './high-low.drawer';

/**
 * Shows the highest and lowest prices labels over all candles in chart (not only in viewport).
 */
export class HighLowComponent extends ChartBaseElement {
	constructor(
		config: FullChartConfig,
		canvasModel: CanvasModel,
		chartModel: ChartModel,
		canvasBoundsContainer: CanvasBoundsContainer,
		drawingManager: DrawingManager,
	) {
		super();
		const hiLowDrawer = new HighLowDrawer(canvasModel, chartModel, config, canvasBoundsContainer);
		drawingManager.addDrawer(hiLowDrawer, 'HIGH_LOW');
	}
}
