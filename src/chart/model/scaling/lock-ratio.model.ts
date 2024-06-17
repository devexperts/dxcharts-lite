/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ViewportModelState, Zoom } from './viewport.model';

// zoomX / zoomY
export type ZoomXToZoomYRatio = number;
export const ratioFromZoomXY = (zoomX: Zoom, zoomY: Zoom): ZoomXToZoomYRatio => zoomX / zoomY;
export const zoomXToZoomY = (zoomX: Zoom, ratio: ZoomXToZoomYRatio): Zoom => zoomX / ratio;
export const zoomYToZoomX = (zoomY: Zoom, ratio: ZoomXToZoomYRatio): Zoom => zoomY * ratio;

/**
 * Locks the zoomY with zoomX and zooms y-scale depending on x-scale.
 * @param state
 * @param zoomXYRatio
 */
export const changeYToKeepRatio = (prevState: ViewportModelState, newState: ViewportModelState) => {
	const prevZoomX = prevState.zoomX;
	const prevZoomY = prevState.zoomY;
	const prevZoomXY = ratioFromZoomXY(prevZoomX, prevZoomY);
	const prevYHeight = prevState.yEnd - prevState.yStart;
	// recalculate zoomY
	newState.zoomY = zoomXToZoomY(newState.zoomX, prevZoomXY);
	const zoomYMult = newState.zoomY / prevZoomY;
	const newYHeight = prevYHeight * zoomYMult;
	const delta = newYHeight - prevYHeight;
	newState.yEnd = newState.yEnd + delta / 2;
	newState.yStart = newState.yStart - delta / 2;
	// recalculate zoomXY ratio
	const newZoomXY = ratioFromZoomXY(newState.zoomX, newState.zoomY);
	newState.zoomXY = newZoomXY;
};

/**
 *  Locks the zoomY with zoomX and zooms x-scale depending on y-scale.
 * @param state
 * @param zoomXYRatio
 */
export const changeXToKeepRatio = (prevState: ViewportModelState, newState: ViewportModelState) => {
	const prevZoomX = prevState.zoomX;
	const prevZoomY = prevState.zoomY;
	const prevZoomXY = ratioFromZoomXY(prevZoomX, prevZoomY);
	const prevXWidth = prevState.xEnd - prevState.xStart;
	// recalculate zoomX
	newState.zoomX = zoomYToZoomX(newState.zoomY, prevZoomXY);
	const zoomXMult = newState.zoomX / prevZoomX;
	const newXWidth = prevXWidth * zoomXMult;
	const delta = newXWidth - prevXWidth;
	newState.xStart = newState.xStart - delta;
	// recalculate zoomXY ratio
	const newZoomXY = ratioFromZoomXY(newState.zoomX, newState.zoomY);
	newState.zoomXY = newZoomXY;
};
