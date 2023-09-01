/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
interface Eq<A> {
	readonly equals: (x: A, y: A) => boolean;
}

// eslint-disable-next-line no-restricted-syntax
export const MEMOIZE_CLEAR_FUNCTION = Symbol('MEMOIZE_CLEAR_FUNCTION') as symbol;

/**
 * Memoizes function for passed arguments
 * @doc-tags utility
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function memoize<F extends Function>(this: any, fn: F): F {
	const storage: Record<string, unknown> = {};
	const result = function (this: any) {
		const args = Array.prototype.slice.call(arguments);
		const key = serialize(args);
		if (typeof storage[key] === 'undefined') {
			// eslint-disable-next-line no-restricted-syntax
			storage[key] = fn.apply(this, args as any);
		}
		return storage[key];
	}.bind(this);

	// inject clearer
	// @ts-ignore
	result[MEMOIZE_CLEAR_FUNCTION] = function () {
		const args = Array.prototype.slice.call(arguments);
		const key = serialize(args);
		delete storage[key];
	};

	// eslint-disable-next-line no-restricted-syntax
	return result as any;
}

export const memoOnce =
	<A>(E: Eq<A>) =>
	<Args extends A[], R>(f: (...args: Args) => R): ((...args: Args) => R) => {
		let hasValue = false;
		let cachedR: R;
		// eslint-disable-next-line no-restricted-syntax
		let cachedArgs: Args = [] as any;
		const update = (args: Args): void => {
			cachedR = f(...args);
			hasValue = true;
			cachedArgs = args;
		};
		return (...args: Args): R => {
			const length = args.length;
			if (hasValue && length === 0) {
				return cachedR;
			}
			if (!hasValue || cachedArgs.length !== length) {
				update(args);
				return cachedR;
			}
			for (let i = 0; i < length; i++) {
				if (!E.equals(cachedArgs[i], args[i])) {
					update(args);
					return cachedR;
				}
			}
			return cachedR;
		};
	};

/**
 * @param {Array.<*>} args
 * @returns {String}
 */
export function serialize(args: any[]): string {
	const argsAreValid = args.every(arg => {
		return typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'boolean';
	});
	if (!argsAreValid) {
		throw Error('Arguments to memoized function can only be strings or numbers');
	}
	return JSON.stringify(args);
}
