/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer, CanvasElement, CHART_UUID } from '../../../canvas/canvas-bounds-container';
import {
	ChartConfigComponentsYAxis,
	FullChartColors,
	getFontFromConfig,
	YAxisAlign,
	YAxisLabelAppearanceType,
} from '../../../chart.config';
import { redrawBackgroundArea } from '../../../drawers/chart-background.drawer';
import { Bounds } from '../../../model/bounds.model';
import { avoidAntialiasing, drawLine } from '../../../utils/canvas/canvas-drawing-functions.utils';
import { calculateSymbolHeight, calculateTextWidth } from '../../../utils/canvas/canvas-font-measure-tool.utils';
import { floor } from '../../../utils/math.utils';
import { drawBadgeLabel, drawPlainLabel, drawRectLabel } from '../y-axis-labels.drawer';
import { VisualYAxisLabel, YAxisVisualLabelType } from './y-axis-labels.model';

type LabelDrawer = typeof drawBadgeLabel | typeof drawRectLabel | typeof drawPlainLabel;

export const DEFAULT_LABEL_APPEARANCE_TYPE: YAxisLabelAppearanceType = 'badge';

const DEFAULT_PADDING = 4;

export const priceLabelDrawersMap: Record<YAxisVisualLabelType, LabelDrawer> = {
	badge: drawBadgeLabel,
	rectangle: drawRectLabel,
	plain: drawPlainLabel,
};

/**
 * Draws label on Y axis with provided parameters.
 * @param ctx - canvas 2D context to draw on
 * @param bounds - bounds of Y axis
 * @param visualLabel
 * @param canvasBoundsContainer
 * @param config
 */
export function drawLabel(
	ctx: CanvasRenderingContext2D,
	backgroundCtx: CanvasRenderingContext2D,
	bounds: Bounds,
	paneBounds: Bounds,
	visualLabel: VisualYAxisLabel,
	canvasBoundsContainer: CanvasBoundsContainer,
	config: ChartConfigComponentsYAxis,
	colors: FullChartColors['yAxis'],
) {
	const centralY = visualLabel.y;
	const text = visualLabel.labelText;
	const mode = visualLabel.mode ?? 'label';
	const appearanceType = visualLabel.labelType ?? DEFAULT_LABEL_APPEARANCE_TYPE;
	const description = visualLabel.description;

	const textFont = visualLabel.textFont ?? getFontFromConfig(config);
	const bgColor = visualLabel.bgColor;
	const lineColor = visualLabel.lineColor ?? bgColor;
	const descriptionWidth = calculateTextWidth(description ?? '', ctx, textFont) + 8;
	const labelY = floor(visualLabel.y);
	const fontHeight = calculateSymbolHeight(textFont, ctx);
	const labelBoxTopY = centralY - fontHeight / 2;
	const labelBoxBottomY = centralY + fontHeight / 2;
	const labelBoxHeight = labelBoxBottomY - labelBoxTopY;

	ctx.save();
	ctx.fillStyle = bgColor;
	ctx.strokeStyle = lineColor;

	const chartBounds = canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(CHART_UUID));

	const drawLabel = priceLabelDrawersMap[appearanceType];
	const showDescription = config.labels.descriptions;
	const showLine = isLineVisible(bounds, labelY, labelBoxHeight);

	const _drawDescription = () =>
		showDescription && drawDescription(backgroundCtx, ctx, bounds, paneBounds, visualLabel, config.align, config);

	let lineXStart: number;
	let lineXEnd: number;
	// line should touch the label
	const lineStartAdjust = 2;
	if (config.align === 'right') {
		lineXStart = chartBounds.x;
		lineXEnd = showDescription
			? chartBounds.x + chartBounds.width - descriptionWidth
			: chartBounds.x + chartBounds.width + lineStartAdjust;
	} else {
		lineXStart = showDescription ? chartBounds.x + descriptionWidth : chartBounds.x - lineStartAdjust;
		lineXEnd = chartBounds.x + chartBounds.width;
	}
	const lineY = visualLabel.lineY ?? visualLabel.y;
	const _drawLine = () =>
		showLine && avoidAntialiasing(ctx, () => drawLine(ctx, lineXStart, lineY, lineXEnd, lineY, 1));
	const _drawLabel = () => drawLabel(ctx, bounds, text, centralY, visualLabel, config, colors, false, backgroundCtx);

	switch (mode) {
		case 'line':
			_drawLine();
			_drawDescription();
			break;
		case 'line-label':
			_drawLine();
			_drawDescription();
			_drawLabel();
			break;
		case 'label':
			_drawDescription();
			_drawLabel();
			break;
		case 'none':
			break;
	}

	ctx.restore();
}

const isLineVisible = (bounds: Bounds, labelY: number, labelBoxHeight: number) =>
	labelY > bounds.y + labelBoxHeight / 2 && labelY < bounds.y + bounds.height - labelBoxHeight / 2;

function drawDescription(
	backgroundCtx: CanvasRenderingContext2D,
	ctx: CanvasRenderingContext2D,
	labelBounds: Bounds,
	paneBounds: Bounds,
	visualLabel: VisualYAxisLabel,
	align: YAxisAlign = 'right',
	yAxisState: ChartConfigComponentsYAxis,
): void {
	const description = visualLabel.description;
	if (!description || description.length === 0) {
		return;
	}
	const centralY = visualLabel.y;
	const textFont = getFontFromConfig(yAxisState);
	const descriptionWidth = calculateTextWidth(description, ctx, textFont);
	const fontHeight = calculateSymbolHeight(textFont, ctx);
	const paddingTop = visualLabel.paddingTop ?? DEFAULT_PADDING;
	const paddingBottom = visualLabel.paddingBottom ?? DEFAULT_PADDING;
	const labelBoxY = centralY - fontHeight / 2 - paddingTop;
	const labelBoxBottom = centralY + fontHeight / 2 + paddingBottom;
	const labelBoxHeight = labelBoxBottom - labelBoxY;

	// do not draw, if description is out of bounds
	if (
		centralY < labelBounds.y + labelBoxHeight / 2 ||
		centralY > labelBounds.y + labelBounds.height - labelBoxHeight / 2
	) {
		return;
	}

	ctx.save();

	// overlay rect
	const width = descriptionWidth + 5;
	const descriptionPadding = 4;
	const rectWidth = descriptionWidth + descriptionPadding * 2;
	const boundsEnd = paneBounds.x + paneBounds.width;
	const x = align === 'right' ? boundsEnd - rectWidth : paneBounds.x + descriptionPadding;

	redrawBackgroundArea(backgroundCtx, ctx, x, labelBoxY, width, labelBoxHeight, 0.8);

	ctx.fillStyle = visualLabel.descColor ?? visualLabel.bgColor;
	ctx.font = textFont;
	const xTextBounds =
		align === 'right'
			? boundsEnd - descriptionWidth - descriptionPadding * 2
			: paneBounds.x + descriptionPadding * 2;

	ctx.fillText(description, xTextBounds, centralY + fontHeight / 2 - 1); // -1 for font height adjustment

	ctx.restore();
}
