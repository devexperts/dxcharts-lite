/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AnimationConfig } from '../canvas-animation';

interface AnimationAware {
	tick: () => void;
}

/**
 * Basic animation. Holds current state: inProgress, timeLeft.
 * Additional params are useful to pass data which helps animating.
 */
export class Animation implements AnimationAware {
	animationTime: number;
	animationTimeLeft = 0;
	animationInProgress = false;

	constructor(animationConfig: AnimationConfig, private onTickFunction?: () => void) {
		this.animationTime = animationConfig.duration;
		this.animationTimeLeft =
			animationConfig.timeLeft === undefined ? animationConfig.duration : animationConfig.timeLeft;
		this.animationInProgress = true;
	}

	/**
	 * Decrements the animation time left and executes the onTickFunction if it exists.
	 * If the animation time left reaches zero, sets the animationInProgress flag to false.
	 */
	tick() {
		if (this.animationTimeLeft <= 0) {
			this.animationInProgress = false;
		} else {
			this.animationTimeLeft--;
		}
		this.onTickFunction && this.onTickFunction();
	}

	// normalized time [0..1]
	/**
	 * Calculates the normalized progress of an animation.
	 * @returns {number} A value between 0 and 1 representing the progress of the animation.
	 */
	getProgress() {
		return 1 - this.animationTimeLeft / this.animationTime;
	}

	/**
	 * Sets the animationInProgress flag to false and resets the animationTimeLeft to 0.
	 */
	public finishAnimation() {
		this.animationInProgress = false;
		this.animationTimeLeft = 0;
	}
}
