/*
 * Copyright (C) 2019 - 2026 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Bounds } from '../model/bounds.model';

export interface CanvasPointerPoint {
	readonly x: number;
	readonly y: number;
}

/**
 * Canvas-space hit test for the lower band (time scale / volume strip).
 * Reusable for any UI that should react when the pointer is near the bottom of the chart.
 *
 * Rectangle matches the Figma hover region (full width, lower ~15% of canvas height plus offsets).
 */
export function isCanvasPointInLowerHoverStrip(
	point: CanvasPointerPoint,
	canvasBounds: Bounds,
	bottomOffsetPx: number,
): boolean {
	const rectX = 0;
	const rectY = canvasBounds.height * 0.85 - bottomOffsetPx + 10;
	const rectWidth = canvasBounds.width;
	const rectHeight = canvasBounds.height * 0.15 + bottomOffsetPx + 10;
	const dx = point.x - rectX;
	const dy = point.y - rectY;
	return dx >= 0 && dx < rectWidth && dy >= 0 && dy < rectHeight;
}
