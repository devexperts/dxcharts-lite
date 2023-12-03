/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { isOffscreenCanvasModel } from '../../canvas/offscreen/canvas-offscreen-wrapper';
import { FullChartConfig } from '../../chart.config';
import { redrawBackgroundArea } from '../../drawers/chart-background.drawer';
import { CanvasModel } from '../../model/canvas.model';
import { XAxisLabel } from './x-axis-labels.model';

const DEFAULT_X_LABEL_PADDING = { x: 4, y: 4 };

export type LabelAlign = 'start' | 'end' | 'middle';

/**
 * Draws the label on X axis.
 * @param ctx
 * @param canvasBoundsContainer
 * @param config
 * @param label
 */
export function drawXAxisLabel(
	backgroundCanvasModel: CanvasModel,
	canvasModel: CanvasModel,
	canvasBoundsContainer: CanvasBoundsContainer,
	config: FullChartConfig,
	label: XAxisLabel,
): void {
	const alignType = label.alignType ?? 'middle';
	const { fontSize, fontFamily, padding } = config.components.xAxis;
	const offsetTop = padding.top ?? 0;

	const ctx = canvasModel.ctx;
	const backgroundCtx = backgroundCanvasModel.ctx;
	const xAxis = canvasBoundsContainer.getBounds(CanvasElement.X_AXIS);
	ctx.save();
	ctx.font = `bold ${fontSize}px ${fontFamily}`;
	const labelWidth = ctx.measureText(label.text).width;
	const boxWidth = labelWidth + DEFAULT_X_LABEL_PADDING.x * 2;
	let boxStart = 0;
	const x = label.x;
	switch (alignType) {
		case 'start':
			boxStart = x - boxWidth;
			break;
		case 'end':
			boxStart = x;
			break;
		case 'middle':
		default:
			boxStart = x - boxWidth / 2;
			break;
	}
	// label can overlap with regular x-axis label, so we need to hide regular x-axis label
	if (isOffscreenCanvasModel(canvasModel)) {
		canvasModel.ctx.redrawBackgroundArea(
			backgroundCanvasModel.idx,
			canvasModel.idx,
			boxStart,
			xAxis.y,
			boxWidth,
			xAxis.height - 1,
		);
	} else {
		redrawBackgroundArea(backgroundCtx, ctx, boxStart, xAxis.y, boxWidth, xAxis.height - 1);
	}

	if (alignType !== 'middle') {
		ctx.strokeStyle = label.color;
		ctx.beginPath();
		ctx.moveTo(x, xAxis.y);
		ctx.lineTo(x, xAxis.y + xAxis.height);
		ctx.stroke();
	}

	ctx.fillStyle = label.color;
	const xTextPos = boxStart + DEFAULT_X_LABEL_PADDING.x;
	const yTextPos = xAxis.y + offsetTop + fontSize; // -2 for vertical adjustment
	ctx.fillText(label.text, xTextPos, yTextPos);
	ctx.restore();
}
