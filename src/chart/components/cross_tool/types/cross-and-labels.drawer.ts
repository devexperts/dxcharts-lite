/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer, CanvasElement } from '../../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../../chart.config';
import { avoidAntialiasing, drawRoundedRect } from '../../../utils/canvas/canvas-drawing-functions.utils';
import { PaneManager } from '../../pane/pane-manager.component';
import { priceLabelDrawersMap } from '../../y_axis/price_labels/price-label.drawer';
import { CrossToolTypeDrawer } from '../cross-tool.drawer';
import { CrossToolHover } from '../cross-tool.model';

interface Coordinates {
	start: [number, number];
	end: [number, number];
}

export class CrossAndLabelsDrawerType implements CrossToolTypeDrawer {
	constructor(
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private paneManager: PaneManager,
		private crossDrawPredicate: () => boolean = () => true,
		private noLines?: boolean,
	) {}

	/**
	 * Draws a cross tool on a canvas context and its labels if the crossDrawPredicate is true.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {CrossToolHover} hover - The hover object containing information about the cross tool's position.
	 */
	draw(ctx: CanvasRenderingContext2D, hover: CrossToolHover) {
		if (this.crossDrawPredicate()) {
			avoidAntialiasing(ctx, () => this.drawCrossTool(ctx, hover));
		}
	}

	/**
	 * This is a protected method called `drawCrossTool` that takes two parameters: `ctx` of type `CanvasRenderingContext2D` and `hover` of type `CrossToolHover`.
	 * The method draws a cross tool on the canvas using the provided context. It first gets the bounds of all panes and the hit test bounds of all panes. It then gets the top padding of the x-axis from the configuration and the left padding of the y-axis from the configuration based on the type of y-label.
	 * If the hit test bounds of all panes contain the hover coordinates, it draws a horizontal line and a vertical line using the provided coordinates and the bounds of all panes. It sets the stroke style to the line color from the configuration and sets the line dash to the line dash from the configuration. It then begins a new path, moves to the start of the horizontal line, draws a line to the end of the horizontal line, moves to the start of the vertical line, and draws a line to the end of the vertical line. Finally, it strokes the path.
	 */
	protected drawCrossTool(ctx: CanvasRenderingContext2D, hover: CrossToolHover) {
		const allPanes = this.canvasBoundsContainer.getBounds(CanvasElement.ALL_PANES);
		// extension is need for allPanes.y to fit into hit test
		const allPanesHT = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES, { extensionY: 0.0001 });
		const xAxisTopPadding = this.config.components.xAxis.padding.top ?? 0;
		const padding =
			this.config.components.yAxis.typeConfig[this.config.components.crossTool.yLabel.type ?? 'badge']?.paddings;
		const yAxisLeftPadding = padding?.start ?? 0;
		// we want to draw hover even if y coordinate is beyond chart
		// Example: snap option is turned on, and chart is scrolled down, so it's not visible
		const paneHT = this.paneManager.paneComponents[hover.paneId]?.ht;
		if (allPanesHT(hover.x, allPanes.y)) {
			const horizontalLineCoords: Coordinates = {
				start: [allPanes.x, hover.y],
				end: [allPanes.x + allPanes.width + yAxisLeftPadding, hover.y],
			};
			const verticalLineCoords: Coordinates = {
				start: [hover.x, allPanes.y],
				end: [hover.x, allPanes.y + allPanes.height + xAxisTopPadding],
			};
			const allowHorizontal = paneHT?.(hover.x, hover.y);

			if (!this.noLines) {
				ctx.strokeStyle = this.config.colors.crossTool.lineColor;
				ctx.setLineDash(this.config.components.crossTool.lineDash);
				ctx.beginPath();
				// don't draw horizontal line if it's not in hit test
				if (allowHorizontal) {
					ctx.moveTo(...horizontalLineCoords.start);
					ctx.lineTo(...horizontalLineCoords.end);
				}
				ctx.moveTo(...verticalLineCoords.start);
				ctx.lineTo(...verticalLineCoords.end);
				ctx.stroke();
			}

			allowHorizontal && this.drawYLabel(ctx, hover);
			this.drawXLabel(ctx, hover);
		}
	}

	/**
	 * Draws the X axis label for the cross tool on the canvas.
	 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context for the canvas.
	 * @param {CrossToolHover} hover - The hover object containing the x and y coordinates of the cross tool.
	 * @returns {void}
	 */
	protected drawXLabel(ctx: CanvasRenderingContext2D, hover: CrossToolHover) {
		const xLabelPadding = this.config.components.crossTool.xLabel.padding;
		const xLabelMargin = this.config.components.crossTool.xLabel.margin;
		const crossToolColors = this.config.colors.crossTool;
		// X axis label same for all
		if (this.config.components.xAxis.visible) {
			ctx.font = this.config.components.xAxis.fontSize + 'px ' + this.config.components.xAxis.fontFamily;
			// X hover
			const x = hover.x;
			const labelText = hover.time;
			const width = ctx.measureText(labelText).width;
			const fontHeight = this.config.components.xAxis.fontSize;
			// box
			const xAxis = this.canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
			ctx.save();
			ctx.fillStyle = crossToolColors.labelBoxColor;
			const xLabelPaddingLeft = xLabelPadding?.left ?? 0;
			const xLabelPaddingRight = xLabelPadding?.right ?? 0;
			const xLabelPaddingTop = xLabelPadding?.top ?? 0;
			const xLabelPaddingBottom = xLabelPadding?.bottom ?? 0;
			const xLabelMarginTop = xLabelMargin?.top ?? 0;
			const boxWidth = width + xLabelPaddingLeft + xLabelPaddingRight;
			const boxHeight = fontHeight + xLabelPaddingTop + xLabelPaddingBottom;
			const xBoxPos = Math.max(x - boxWidth / 2, 0);
			const yBoxPos = xAxis.y + xLabelMarginTop;
			drawRoundedRect(ctx, xBoxPos, yBoxPos, boxWidth, boxHeight);
			// label
			ctx.fillStyle = crossToolColors.labelTextColor;
			const xTextPos = Math.max(x - width / 2, xLabelPaddingLeft);
			const yTextPos = xAxis.y + xLabelMarginTop + fontHeight + xLabelPaddingTop - 1; // -1 for vertical adjustment
			ctx.fillText(labelText, xTextPos, yTextPos);
			ctx.restore();
		}
	}

	/**
	 * Draws the Y-axis label on the canvas context at the given point.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {Point} point - The point where the label should be drawn.
	 * @returns {void}
	 */
	protected drawYLabel(ctx: CanvasRenderingContext2D, point: CrossToolHover) {
		const yLabelPadding = this.config.components.crossTool.yLabel.padding;
		const crossToolColors = this.config.colors.crossTool;
		// Y axis label different for main chart pane and the rest panes
		if (this.config.components.yAxis.visible) {
			const pane = this.paneManager.paneComponents[point.paneId];
			const y = point.y;
			if (!pane) {
				return;
			}
			for (const extent of pane.yExtentComponents) {
				const price = extent.regularValueFromY(y);
				const label = extent.valueFormatter(price);
				const bounds = this.canvasBoundsContainer.getBounds(
					CanvasElement.PANE_UUID_Y_AXIS(pane.uuid, extent.idx),
				);
				const drawYLabel = priceLabelDrawersMap[this.config.components.crossTool.yLabel.type];
				drawYLabel(
					ctx,
					bounds,
					label,
					y,
					{
						textColor: crossToolColors.labelTextColor,
						bgColor: crossToolColors.labelBoxColor,
						paddingBottom: yLabelPadding?.bottom,
						paddingEnd: yLabelPadding?.end,
						paddingTop: yLabelPadding?.top,
					},
					extent.yAxisComponent?.state ?? this.config.components.yAxis,
					this.config.colors.yAxis,
					true,
				);
			}
		}
	}
}
