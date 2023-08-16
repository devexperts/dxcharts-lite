/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Animation } from './animation';
import { AnimationConfig } from '../canvas-animation';
import { Unit, ViewportModel, Zoom } from '../../model/scaling/viewport.model';
import { easeExpOut } from '../../utils/math.utils';
import { uuid } from '../../utils/uuid.utils';

export type easingFn = (normalizedTime: number) => number;

export interface ViewportMovementAnimationConfig extends AnimationConfig {
	targetXStart: Unit;
	targetXEnd: Unit;
	targetYStart: Unit;
	targetYEnd: Unit;
	targetZoomX: Zoom;
	targetZoomY: Zoom;
	easingFn?: easingFn;
}

/**
 * Animates the viewport X movement. Uses d3-ease library for easing functions.
 * https://www.npmjs.com/package/d3-ease
 * @doc-tags animation,scaling
 */
export class ViewportMovementAnimation extends Animation {
	public readonly xStart;
	public readonly xEnd;
	public readonly yStart;
	public readonly yEnd;
	public readonly zoomX;
	public readonly zoomY;
	public readonly easingFn: easingFn;
	public readonly id = uuid();

	constructor(
		private viewportModel: ViewportModel,
		public readonly animationConfig: ViewportMovementAnimationConfig,
		onTickFunction?: () => void,
	) {
		super(animationConfig, onTickFunction);
		this.xStart = viewportModel.xStart;
		this.xEnd = viewportModel.xEnd;
		this.yStart = viewportModel.yStart;
		this.yEnd = viewportModel.yEnd;
		this.zoomX = viewportModel.zoomX;
		this.zoomY = viewportModel.zoomY;
		this.easingFn = animationConfig.easingFn ?? easeExpOut;
	}

	/**
	 * Updates the viewport model's properties based on the animation configuration and easing function. If an animation is in progress, the properties are updated based on the current progress of the animation. The updated properties include the start and end coordinates for the x and y axes, as well as the zoom level for both axes. The updated properties are then applied to the viewport model.
	 */
	tick() {
		super.tick();
		if (this.animationInProgress) {
			const easedProgress = this.easingFn(this.getProgress());
			const newXStart = this.xStart + (this.animationConfig.targetXStart - this.xStart) * easedProgress;
			const newXEnd = this.xEnd + (this.animationConfig.targetXEnd - this.xEnd) * easedProgress;
			const newYStart = this.yStart + (this.animationConfig.targetYStart - this.yStart) * easedProgress;
			const newYEnd = this.yEnd + (this.animationConfig.targetYEnd - this.yEnd) * easedProgress;
			const newZoomX = this.zoomX + (this.animationConfig.targetZoomX - this.zoomX) * easedProgress;
			const newZoomY = this.zoomY + (this.animationConfig.targetZoomY - this.zoomY) * easedProgress;
			this.viewportModel.apply({
				xStart: newXStart,
				xEnd: newXEnd,
				yStart: newYStart,
				yEnd: newYEnd,
				zoomX: newZoomX,
				zoomY: newZoomY,
				inverseY: this.viewportModel.inverseY,
			});
		}
	}

	/**
	 * This method finishes the animation and applies the target viewport model configuration. It calls the `finishAnimation()` method of the parent class and then applies the target configuration to the `viewportModel` object. The target configuration includes the `xStart`, `xEnd`, `yStart`, `yEnd`, `zoomX`, `zoomY`, and `inverseY` properties.
	 */
	finishAnimation() {
		super.finishAnimation();
		this.viewportModel.apply({
			xStart: this.animationConfig.targetXStart,
			xEnd: this.animationConfig.targetXEnd,
			yStart: this.animationConfig.targetYStart,
			yEnd: this.animationConfig.targetYEnd,
			zoomX: this.animationConfig.targetZoomX,
			zoomY: this.animationConfig.targetZoomY,
			inverseY: this.viewportModel.inverseY,
		});
	}
}
