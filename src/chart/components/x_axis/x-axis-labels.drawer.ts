/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { drawXAxisLabel } from './x-axis-draw.functions';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import * as Color from 'color';
import { XAxisLabel, XAxisLabelsModel } from './x-axis-labels.model';
import { CanvasModel } from '../../model/canvas.model';
import { Drawer } from '../../drawers/drawing-manager';
import { FullChartConfig } from '../../chart.config';
import { fillRect } from '../../utils/canvas/canvas-drawing-functions.utils';

/**
 * This drawer draws custom labels for X Axis, using labels from XAxisLabelModel.
 * By default labels for drawings are drawn by this drawer.
 */
export class XAxisLabelsDrawer implements Drawer {
	constructor(
		private backgroundCanvasModel: CanvasModel,
		private config: FullChartConfig,
		private canvasModel: CanvasModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private xAxisLabelsModel: XAxisLabelsModel,
	) {}

	/**
	 * Draws the X axis labels on the canvas.
	 * @function
	 * @name draw
	 * @memberof XAxisLabelsDrawer
	 * @returns {void}
	 */
	draw() {
		const ctx = this.canvasModel.ctx;
		this.drawHighlightedBackgroundBetweenLabels();
		this.xAxisLabelsModel.labels.forEach(l => {
			drawXAxisLabel(this.backgroundCanvasModel.ctx, ctx, this.canvasBoundsContainer, this.config, l);
		});
	}

	// this is a very simple solution which matches 2 labels with same "subGroupId"
	// in future we may want to change it, but for now it's enough
	/**
	 * Draws a highlighted background between two labels with the same "subGroupId".
	 *
	 * @returns {void}
	 */
	drawHighlightedBackgroundBetweenLabels() {
		const ctx = this.canvasModel.ctx;
		const initial: { [key: string]: XAxisLabel[] } = {};
		const groupedLabels = this.xAxisLabelsModel.labels.reduce((acc, label) => {
			if (label.subGroupId !== undefined) {
				let group = acc[label.subGroupId];
				if (!group) {
					group = [];
					acc[label.subGroupId] = group;
				}
				group.push(label);
			}
			return acc;
		}, initial);
		Object.keys(groupedLabels).forEach(subGroupId => {
			const labels = groupedLabels[subGroupId];
			// expect 2 labels only
			if (labels.length === 2) {
				const xAxisBounds = this.canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
				ctx.fillStyle = Color.rgb(labels[0].color).alpha(0.1).toString();
				fillRect(
					ctx,
					{ x: labels[0].x, y: xAxisBounds.y },
					{ x: labels[1].x, y: xAxisBounds.y + xAxisBounds.height },
				);
			}
		});
	}

	/**
	 * Returns an array with the ID of the canvas model.
	 *
	 * @returns {Array} An array with the ID of the canvas model.
	 */
	getCanvasIds() {
		return [this.canvasModel.canvasId];
	}
}
