/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import EventBus from '../events/event-bus';
import { Animation } from './types/animation';
import { ColorAlphaAnimationConfig, ColorAlphaAnimation } from './types/color-alpha-animation';
import { ColorTransitionAnimationConfig, ColorTransitionAnimation } from './types/color-transition-animation';
import { ViewportMovementAnimationConfig, ViewportMovementAnimation } from './types/viewport-movement-animation';
import { ViewportModel } from '../model/scaling/viewport.model';
import { StringTMap } from '../utils/object.utils';

const DEFAULT_ANIMATION_TIME = 10;

export interface AnimationConfig {
	duration: number;
	timeLeft?: number;
}

export const VIEWPORT_ANIMATION_ID = 'VIEWPORT_ANIMATION';

/**
 * Singleton animation container for all chart animations.
 * Does the following things:
 *  - registers animations and updates their state
 *  - fires only 1 DRAW event for all animations at once
 *
 * Add specific animation here as well with typed API.
 * Like "color" animation which auto-updates color alpha channel.
 *
 * @doc-tags chart-core,animation
 */
export class CanvasAnimation {
	animationIntervalId?: number;
	animations: StringTMap<Animation> = {};

	constructor(private eventBus: EventBus) {}

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
		uniqueAnimationId: string = VIEWPORT_ANIMATION_ID,
		onTickFunction?: () => void,
	): ViewportMovementAnimation {
		const animation = new ViewportMovementAnimation(viewportModel, config, onTickFunction);
		this.animations[uniqueAnimationId] = animation;
		this.ensureIntervalStarted();
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
		onTickFunction?: () => void,
		animationConfig?: Partial<AnimationConfig>,
	): ColorAlphaAnimation {
		const animation = new ColorAlphaAnimation(
			{ ...animationConfig, duration: (animationConfig && animationConfig.duration) || DEFAULT_ANIMATION_TIME },
			colorConfigs,
			onTickFunction,
		);
		this.animations[uniqueAnimationId] = animation;
		this.ensureIntervalStarted();
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
		duration = DEFAULT_ANIMATION_TIME,
		onTickFunction?: () => void,
	) {
		const animation = new ColorTransitionAnimation({ duration }, colorConfigs, onTickFunction);
		this.animations[uniqueAnimationId] = animation;
		this.ensureIntervalStarted();
		return animation;
	}
	/**
	 * This function takes an id as a string and returns an animation container object of type T. It retrieves the animation container object from the animations object using the provided id. The @ts-ignore comment is used to ignore any TypeScript errors that may occur due to the dynamic nature of the function.
	 */
	getAnimation<T extends Animation>(id: string): T {
		// @ts-ignore
		return this.animations[id];
	}

	/**
	 * Returns a ColorAlphaAnimation object for the given animation ID.
	 *
	 * @param {string} id - The ID of the animation to retrieve.
	 * @returns {ColorAlphaAnimation} - The ColorAlphaAnimation object for the given ID.
	 */
	getColorAlphaAnimation(id: string): ColorAlphaAnimation {
		return this.getAnimation(id);
	}

	/**
	 * Returns a ColorTransitionAnimation object for the given id.
	 * @param {string} id - The id of the animation to retrieve.
	 * @returns {ColorTransitionAnimation} - The ColorTransitionAnimation object for the given id.
	 */
	getColorTransitionAnimation(id: string): ColorTransitionAnimation {
		return this.getAnimation(id);
	}

	/**
	 * Stops the animation with the given ID.
	 * @param {string} id - The ID of the animation to be stopped.
	 * @returns {void}
	 */
	forceStopAnimation(id: string): void {
		const animation = this.animations[id];
		if (animation) {
			animation.animationTimeLeft = -1;
			animation.animationInProgress = false;
		}
	}

	/**
	 * This method ensures that the animation interval is started. If the animation interval ID is not set, it sets it to a new interval ID using `window.setInterval()` with a callback function of `this.tick()` and a delay of 20 milliseconds.
	 */
	private ensureIntervalStarted() {
		if (!this.animationIntervalId) {
			this.animationIntervalId = window.setInterval(() => this.tick(), 20);
		}
	}

	/**
	 * This is a private method that iterates through all the animations in the container and calls their tick method. If any animation is still in progress, it sets the allCompleted flag to false. If all animations are completed, it stops the interval. If not, it fires the draw event.
	 */
	private tick() {
		let allCompleted = true;
		for (const i of Object.keys(this.animations)) {
			const animation: Animation = this.animations[i];
			animation.tick();
			if (animation.animationInProgress) {
				allCompleted = false;
			}
		}
		if (!allCompleted) {
			this.eventBus.fireDraw();
		} else {
			this.stopInterval();
		}
	}

	/**
	 * Stops the interval for the animation.
	 */
	private stopInterval() {
		clearInterval(this.animationIntervalId);
		this.animationIntervalId = undefined;
	}
}
