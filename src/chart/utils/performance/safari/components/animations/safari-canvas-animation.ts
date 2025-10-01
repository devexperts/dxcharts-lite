/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject } from 'rxjs';
import EventBus from '../../../../../events/event-bus';
import { ViewportModel } from '../../../../../model/scaling/viewport.model';
import { cancelThrottledAnimationFramePrior } from '../../../../../utils/performance/request-animation-frame-throttle.utils';
import {
	ViewportMovementAnimation,
	ViewportMovementAnimationConfig,
} from '../../../../../animation/types/viewport-movement-animation';
import {
	AnimationConfig,
	CanvasAnimation,
	DEFAULT_ANIMATION_TIME_MS,
	VIEWPORT_ANIMATION_ID,
} from '../../../../../animation/canvas-animation';
import { ColorAlphaAnimation, ColorAlphaAnimationConfig } from '../../../../../animation/types/color-alpha-animation';
import {
	ColorTransitionAnimation,
	ColorTransitionAnimationConfig,
} from '../../../../../animation/types/color-transition-animation';

export class SafariCanvasAnimation extends CanvasAnimation {
	animations: Record<string, any> = {};
	animFrameId = 'animation';
	animationInProgressSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
	private microtaskQueued = false; // Flag to prevent accumulation of queueMicrotask calls

	constructor(eventBus: EventBus) {
		super(eventBus);
	}

	/**
	 * Starts a viewport movement animation with the given configuration and adds it to the list of animations.
	 * @param {ViewportModel} viewportModel - The viewport model to animate.
	 * @param {ViewportMovementAnimationConfig} config - The configuration for the animation.
	 * @param {string} [uniqueAnimationId=VIEWPORT_ANIMATION_ID] - The unique ID for the animation.
	 * @param {Function} [onTickFunction] - The function to be called on each tick of the animation.
	 * @returns {ViewportMovementAnimation} The container for the created animation.
	 */
	startViewportMovementAnimation(
		viewportModel: ViewportModel,
		config: ViewportMovementAnimationConfig,
		uniqueAnimationId = VIEWPORT_ANIMATION_ID,
		onTickFunction: { (): boolean; (): void },
	) {
		const animation = new ViewportMovementAnimation(viewportModel, config, onTickFunction);
		this.animations[uniqueAnimationId] = animation;
		this.processAnimation();
		return animation;
	}

	/**
	 * Starts a color alpha animation with the given configuration and adds it to the list of animations.
	 * @param {string} uniqueAnimationId - A unique identifier for the animation.
	 * @param {Array<ColorAlphaAnimationConfig>} colorConfigs - An array of color alpha animation configurations.
	 * @param {() => void} [onTickFunction] - A function to be called on each animation tick.
	 * @param {Partial<ACAnimationConfig>} [animationConfig] - An optional configuration for the animation.
	 * @returns {ColorAlphaAnimation} - The created animation container.
	 */
	startColorAlphaAnimation(
		uniqueAnimationId: string,
		colorConfigs: Array<ColorAlphaAnimationConfig>,
		onTickFunction?: (() => void) | undefined,
		animationConfig?: AnimationConfig,
	) {
		const animation = new ColorAlphaAnimation(
			{
				...animationConfig,
				duration: (animationConfig && animationConfig.duration) || DEFAULT_ANIMATION_TIME_MS,
			},
			colorConfigs,
			onTickFunction,
		);
		this.animations[uniqueAnimationId] = animation;
		this.processAnimation();
		return animation;
	}

	/**
	 * Starts a color transition animation with the given configurations and duration.
	 * @param {string} uniqueAnimationId - A unique identifier for the animation.
	 * @param {Array<ColorTransitionAnimationConfig>} colorConfigs - An array of color transition configurations.
	 * @param {number} [duration=DEFAULT_ANIMATION_TIME] - The duration of the animation in milliseconds.
	 * @param {Function} [onTickFunction] - A function to be called on each tick of the animation.
	 * @returns {ColorTransitionAnimation} - The created animation container.
	 */
	startColorTransitionAnimation(
		uniqueAnimationId: string,
		colorConfigs: Array<ColorTransitionAnimationConfig>,
		duration = DEFAULT_ANIMATION_TIME_MS,
		onTickFunction?: () => void,
	) {
		const animation = new ColorTransitionAnimation({ duration }, colorConfigs, onTickFunction);
		this.animations[uniqueAnimationId] = animation;
		this.processAnimation();
		return animation;
	}
	/**
	 * This function takes an id as a string and returns an animation container object of type T. It retrieves the animation container object from the animations object using the provided id. The @ts-ignore comment is used to ignore any TypeScript errors that may occur due to the dynamic nature of the function.
	 */
	getAnimation(id: string | number) {
		// @ts-ignore
		return this.animations[id];
	}

	/**
	 * Returns a ColorAlphaAnimation object for the given animation ID.
	 *
	 * @param {string} id - The ID of the animation to retrieve.
	 * @returns {ColorAlphaAnimation} - The ColorAlphaAnimation object for the given ID.
	 */
	getColorAlphaAnimation(id: string) {
		return this.getAnimation(id);
	}

	/**
	 * Returns a ColorTransitionAnimation object for the given id.
	 * @param {string} id - The id of the animation to retrieve.
	 * @returns {ColorTransitionAnimation} - The ColorTransitionAnimation object for the given id.
	 */
	getColorTransitionAnimation(id: string) {
		return this.getAnimation(id);
	}

	/**
	 * Stops the animation with the given ID.
	 * @param {string} id - The ID of the animation to be stopped.
	 * @returns {void}
	 */
	forceStopAnimation(id: string) {
		const animation = this.animations[id];
		if (animation) {
			animation.animationInProgress = false;
			animation.animationStartTime = 0;
			// CRITICAL: Completely remove the animation to prevent it from being processed in tick()
			delete this.animations[id];
		}
		// Stop the animation loop if no animations are running
		if (Object.keys(this.animations).length === 0) {
			this.stopInterval();
		}
	}

	/**
	 * This is a private method that iterates through all the animations in the container and calls their tick method. If any animation is still in progress, it sets the allCompleted flag to false. If all animations are completed, it stops the interval. If not, it fires the draw event.
	 */
	tick() {
		let allCompleted = true;
		for (const i of Object.keys(this.animations)) {
			const animation = this.animations[i];
			animation.tick();
			if (animation.animationInProgress) {
				allCompleted = false;
			}
		}
		this.animationInProgressSubject.next(!allCompleted);
		if (!allCompleted) {
			// CRITICAL: Prevent accumulation of queueMicrotask calls during rapid animation updates
			if (!this.microtaskQueued) {
				this.microtaskQueued = true;
				queueMicrotask(() => {
					this.microtaskQueued = false; // Reset flag when microtask executes
					this.processAnimation();
					this.eventBus.fireDraw();
				});
			}
		} else {
			this.stopInterval();
		}
	}

	stopInterval() {
		cancelThrottledAnimationFramePrior(this.animFrameId);
		// Reset microtask flag to ensure clean state
		this.microtaskQueued = false;
	}
}
