/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { animationFrameThrottled } from './request-animation-frame-throttle.utils';
import { uuid } from '../uuid.utils';

/**
 * Use this as a wrapper to cache calculation results during single animation frame cycle.
 * It is useful if
 * - you have multiple invocations of same code in same animation frame
 * - you're sure that result will always be the same
 */
export class AnimationFrameCache<T> {
	calculatedInThisFrame: boolean = false;
	cache?: T;
	private animFrameId = `anim_cache_${uuid()}`;
	constructor(private dataProvider: () => T, private dataUpdatedPredicate = () => true) {}

	/**
	 * Calculates or retrieves a cached value.
	 * If the value has not been calculated in the current frame, it calculates it by calling the dataProvider function.
	 * If the data has been updated, it sets the calculatedInThisFrame flag to true.
	 * It also sets a throttled animation frame to reset the calculatedInThisFrame flag to false.
	 * If the cache is not null, it returns the cached value, otherwise it calls the dataProvider function and returns its result.
	 * @returns {T} The cached or calculated value.
	 */
	calculateOrGet(): T {
		if (!this.calculatedInThisFrame) {
			this.cache = this.dataProvider();
			if (this.dataUpdatedPredicate()) {
				this.calculatedInThisFrame = true;
			}
			animationFrameThrottled(this.animFrameId, () => {
				this.calculatedInThisFrame = false;
			});
		}
		return this.cache ?? this.dataProvider();
	}

	/**
	 * Invalidates the current state and returns the result of the calculateOrGet() method.
	 * @returns {T} The result of the calculateOrGet() method.
	 */
	forceCalculateOrGet(): T {
		this.invalidate();
		return this.calculateOrGet();
	}

	/**
	 * Returns the last cached value or undefined if there is no cached value.
	 * @returns {T | undefined} The last cached value or undefined.
	 */
	getLastCachedValue(): T | undefined {
		return this.cache;
	}

	/**
	 * Updates the cache value with the provided value.
	 * @param {T} value - The new value to be set in the cache.
	 * @returns {void}
	 */
	updateCacheValue(value: T) {
		this.cache = value;
	}

	/**
	 * Invalidates the cache and sets the calculatedInThisFrame flag to false.
	 * @function
	 * @name invalidate
	 * @memberof ClassName
	 * @instance
	 * @returns {void}
	 */
	invalidate() {
		this.cache = undefined;
		this.calculatedInThisFrame = false;
	}
}
