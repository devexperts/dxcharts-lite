/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasAnimation } from './canvas-animation';
import { ViewportModel, ViewportModelState } from '../model/scaling/viewport.model';

const VIEWPORT_ANIMATION_DURATION = 30;

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
	const animation = canvasAnimation.startViewportMovementAnimation(viewportModel, {
		duration: VIEWPORT_ANIMATION_DURATION,
		targetXStart: state.xStart,
		targetXEnd: state.xEnd,
		targetYStart: state.yStart,
		targetYEnd: state.yEnd,
		targetZoomX: state.zoomX,
		targetZoomY: state.zoomY,
	});
	viewportModel.currentAnimation = animation;
};
