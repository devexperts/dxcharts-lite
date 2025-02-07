/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasAnimation, VIEWPORT_ANIMATION_ID } from './canvas-animation';
import { ViewportModel, ViewportModelState } from '../model/scaling/viewport.model';

const VIEWPORT_ANIMATION_DURATION_MS = 400;

/**
 * Starts the animation for chart viewport movement.
 * @param canvasAnimation
 * @param viewportModel
 * @param state
 * @doc-tags animation,viewport
 */
export const startViewportModelAnimation = (
	canvasAnimation: CanvasAnimation,
	viewportModel: ViewportModel,
	state: ViewportModelState,
) => {
	const animation = canvasAnimation.startViewportMovementAnimation(
		viewportModel,
		{
			duration: VIEWPORT_ANIMATION_DURATION_MS,
			targetXStart: state.xStart,
			targetXEnd: state.xEnd,
			targetYStart: state.yStart,
			targetYEnd: state.yEnd,
			targetZoomX: state.zoomX,
			targetZoomY: state.zoomY,
		},
		VIEWPORT_ANIMATION_ID,
		() =>
			viewportModel.xStart === state.xStart &&
			viewportModel.xEnd === state.xEnd &&
			viewportModel.yStart === state.yStart &&
			viewportModel.yEnd === state.yEnd,
	);
	viewportModel.currentAnimation = animation;
};
