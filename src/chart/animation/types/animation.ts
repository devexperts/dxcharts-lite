/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AnimationConfig } from '../canvas-animation';

type OnTickFunction = () => void;

/**
 * Basic animation. Holds current state: inProgress, timeLeft.
 * Additional params are useful to pass data which helps animating.
 */
export class Animation {
	animationTime: number;
	animationTimeLeft = 0;
	animationStartTime: number;
	animationInProgress: boolean;
	onTickFunction?: OnTickFunction;

	constructor(animationConfig: AnimationConfig, onTickFunction: OnTickFunction) {
		this.onTickFunction = onTickFunction;
		this.animationTime = animationConfig.duration;
		this.animationStartTime = Date.now();
		this.animationInProgress = true;
	}

	/*
	 * Decrements the animation time left and executes the onTickFunction if it exists.
	 * If the animation time left reaches zero, sets the animationInProgress flag to false.
	 */
	tick() {
		if (Date.now() > this.animationStartTime + this.animationTime) {
			this.animationInProgress = false;
		}
		this.onTickFunction?.();
	}

	/*
	 * Gets the normalized progress of the animation.
	 * @returns {number} A value between 0 and 1 representing the progress of the animation.
	 */
	getProgress() {
		return Math.min((Date.now() - this.animationStartTime) / this.animationTime, 1);
	}

	/*
	 * Sets the animationInProgress flag to false and resets the animationStartTime to 0.
	 */
	finishAnimation() {
		this.animationInProgress = false;
		this.animationStartTime = 0;
	}
}
