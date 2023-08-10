/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import {
	CanvasBoundsContainer,
	CanvasElement,
	CHART_UUID,
	limitYToBounds,
} from '../../../canvas/canvas-bounds-container';
import { ChartConfigComponentsYAxis, FullChartColors } from '../../../chart.config';
import { CanvasModel } from '../../../model/canvas.model';
import { Drawer } from '../../../drawers/drawing-manager';
import { Bounds } from '../../../model/bounds.model';
import { fillRect } from '../../../utils/canvas/canvas-drawing-functions.utils';
import { drawLabel } from './price-label.drawer';
import { LabelGroup, VisualYAxisLabel } from './y-axis-labels.model';

export class YAxisPriceLabelsDrawer implements Drawer {
	constructor(
		private labelsProvider: () => LabelGroup[],
		private yAxisLabelsCanvasModel: CanvasModel,
		private backgroundCanvasModel: CanvasModel,
		private yAxisState: ChartConfigComponentsYAxis,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private yAxisColors: FullChartColors['yAxis'],
		private readonly customLabels: Record<string, VisualYAxisLabel>,
	) {}

	draw() {
		const ctx = this.yAxisLabelsCanvasModel.ctx;
		const backgroundCtx = this.backgroundCanvasModel.ctx;

		const yAxisBounds = this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID_Y_AXIS(CHART_UUID));
		const paneBounds = this.canvasBoundsContainer.getBounds(CanvasElement.ALL_PANES);
		this.drawHighlightedBackgroundBetweenLabels(yAxisBounds);
		const orderedLabels = this.labelsProvider();
		orderedLabels.forEach(l => {
			const bounds = l.bounds ?? yAxisBounds;
			l.labels.forEach(vl =>
				drawLabel(
					ctx,
					backgroundCtx,
					bounds,
					paneBounds,
					vl,
					this.canvasBoundsContainer,
					l.axisState ?? this.yAxisState,
					this.yAxisColors,
				),
			);
		});
		// TODO I added this as a simple mechanism to add custom labels, we need to review it
		Object.values(this.customLabels).forEach(l =>
			drawLabel(
				ctx,
				backgroundCtx,
				yAxisBounds,
				paneBounds,
				l,
				this.canvasBoundsContainer,
				this.yAxisState,
				this.yAxisColors,
			),
		);
	}

	// this is a very simple solution which matches 2 labels with same "subGroupId"
	// in future we may want to change it, but for now it's enough
	drawHighlightedBackgroundBetweenLabels(bounds: Bounds) {
		const ctx = this.yAxisLabelsCanvasModel.ctx;
		const acc: VisualYAxisLabel[] = [];
		const orderedLabels = this.labelsProvider();
		const flatLabels = orderedLabels.reduce((acc, labelGroup) => {
			return acc.concat(labelGroup.labels);
		}, acc);
		const initial: { [key: string]: VisualYAxisLabel[] } = {};
		const groupedLabels = flatLabels.reduce((acc, label) => {
			if (label.subGroupId) {
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
				const yAxisBounds = this.canvasBoundsContainer.getBounds(CanvasElement.Y_AXIS);
				ctx.save();
				ctx.fillStyle = labels[0].highlightColor ?? labels[0].bgColor;
				// start and end are sorted in ascending order
				const [startY, endY] =
					labels[0].y > labels[1].y ? [labels[1].y, labels[0].y] : [labels[0].y, labels[1].y];
				fillRect(
					ctx,
					{ x: yAxisBounds.x, y: limitYToBounds(startY, bounds) },
					{ x: yAxisBounds.x + yAxisBounds.width - 6, y: limitYToBounds(endY, bounds) },
				);
				ctx.restore();
			}
		});
	}

	getCanvasIds(): Array<string> {
		return [this.yAxisLabelsCanvasModel.canvasId];
	}
}
