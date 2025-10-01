/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasAnimation, DEFAULT_ANIMATION_TIME_MS, VIEWPORT_ANIMATION_ID } from './canvas-animation';
import { ViewportModel, ViewportModelState } from '../model/scaling/viewport.model';
import { AutoScaleViewportSubModel } from '../model/scaling/auto-scale.model';

const VIEWPORT_ANIMATION_DURATION_MS = DEFAULT_ANIMATION_TIME_MS;
const STUCK_ANIMATION_THRESHOLD = 0.90; // Force finish animations stuck at 90%+

/**
 * Starts the animation for chart viewport movement for safari.
 * @param canvasAnimation
 * @param viewportModel
 * @param state
 * @param autoScaleModel - Optional autoScale model to apply before animation
 * @doc-tags animation,viewport
 */
export const startViewportModelAnimationSafari = (
	canvasAnimation: CanvasAnimation,
	viewportModel: ViewportModel,
	state: ViewportModelState,
	autoScaleModel?: AutoScaleViewportSubModel,
) => {
	// Force finish stuck animations to prevent memory leaks
	if (viewportModel.currentAnimation && viewportModel.currentAnimation.animationInProgress) {
		const progress = viewportModel.currentAnimation.getProgress();

		// Force finish animation if it's taking too long (prevent stuck animations)
		if (progress > STUCK_ANIMATION_THRESHOLD) {
			viewportModel.currentAnimation.finishAnimation();
			viewportModel.currentAnimation = undefined;
		}
	}

	// Apply autoScale BEFORE starting animation to get correct Y scale
	if (autoScaleModel) {
		autoScaleModel.doAutoYScale(state);
	}

	startViewportModelAnimation(canvasAnimation, viewportModel, state);
};

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
