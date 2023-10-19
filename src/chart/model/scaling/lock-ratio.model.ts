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
export const changeYToKeepRatio = (state: ViewportModelState, zoomXYRatio: ZoomXToZoomYRatio) => {
	const prevZoomY = state.zoomY;
	state.zoomY = zoomXToZoomY(state.zoomX, zoomXYRatio);
	const zoomYMult = state.zoomY / prevZoomY;
	const lastYHeight = state.yEnd - state.yStart;
	const newYHeight = lastYHeight * zoomYMult;
	const delta = newYHeight - lastYHeight;
	state.yEnd = state.yEnd + delta / 2;
	state.yStart = state.yStart - delta / 2;
};

/**
 *  Locks the zoomY with zoomX and zooms x-scale depending on y-scale.
 * @param state
 * @param zoomXYRatio
 */
export const changeXToKeepRatio = (state: ViewportModelState, zoomXYRatio: ZoomXToZoomYRatio) => {
	const prevZoomX = state.zoomX;
	state.zoomX = zoomYToZoomX(state.zoomY, zoomXYRatio);
	const zoomXMult = state.zoomX / prevZoomX;
	const lastXWidth = state.xEnd - state.xStart;
	const newXWidth = lastXWidth * zoomXMult;
	const delta = newXWidth - lastXWidth;
	state.xStart = state.xStart - delta;
};
