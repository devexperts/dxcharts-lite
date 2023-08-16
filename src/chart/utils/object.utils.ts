/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * @description
 * Helps with the partial objects functions arguments, but errors the empty object case, which is allowed by simple Partial<T>
 * @example
 * function badUpdateSomeEntity(updates: Partial<Entity>): Entity
 * badUpdateSomeEntity({ property: 123 }) // ok
 * badUpdateSomeEntity() // error - expected
 * badUpdateSomeEntity({}) // ok - not expected, should not be allowed to do such operation
 *
 * function goodUpdateSomeEntity(object: AtLeastOne<Entity>): Entity
 * goodUpdateSomeEntity({ property: 123 }) // ok
 * goodUpdateSomeEntity() // error - expected
 * goodUpdateSomeEntity({}) // error - nice!
 */
export type AtLeastOne<T, Keys extends keyof T = keyof T> = Partial<T> & { [K in Keys]: Required<Pick<T, K>> }[Keys];

export interface StringTMap<T> {
	[key: string]: T;
}

export type DeepPartial<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends Record<string, any>
	? T extends unknown[]
		? DeepPartial<T[number]>[]
		: { [P in keyof T]?: DeepPartial<T[P]> }
	: T;

export type DeepRequired<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends Record<string, any>
	? T extends unknown[]
		? DeepRequired<T[number]>[]
		: { [P in keyof T]-?: DeepRequired<T[P]> }
	: T;

export const cloneUnsafe = <T>(value: T): T => JSON.parse(JSON.stringify(value));

type Entries<T extends object> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

export function typedEntries_UNSAFE<T extends object>(obj: T): Entries<T> {
	// eslint-disable-next-line no-restricted-syntax
	return Object.entries(obj) as any;
}

export const findKeyFromValue = <K, V>(map: Map<K, V>, mapValue: V): K | undefined => {
	for (const [key, value] of Array.from(map.entries())) {
		if (value === mapValue) {
			return key;
		}
	}
};

export function keys<K extends string>(r: Partial<Record<K, unknown>>): Array<K> {
	// eslint-disable-next-line no-restricted-syntax
	return Object.keys(r) as Array<K>;
}

/**
 * Deeply compares two objects
 * @param {*} objA
 * @param {*} objB
 * @returns {Boolean}
 */
export function deepEqual(objA: object, objB: object): boolean {
	if (Object.is(objA, objB)) {
		return true;
	}

	if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
		return false;
	}

	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	if (keysA.length !== keysB.length) {
		return false;
	}

	// Test for A's keys different from B.
	for (let i = 0, len = keysA.length; i < len; i++) {
		// @ts-ignore
		if (!hasOwnProperty.call(objB, keysA[i]) || !deepEqual(objA[keysA[i]], objB[keysA[i]])) {
			return false;
		}
	}

	return true;
}
