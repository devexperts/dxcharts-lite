/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { identity } from './function.utils';
import { clamp, shiftRight } from './math.utils';

/**
 * Intersects 2 arrays.
 * Example:
 *  source: [1, 2, 3, 1]
 *  target: [1, 2, 4, 5, 6]
 *  result: [1, 2]
 *  result (with duplicates): [1, 1, 2]
 * @param source
 * @param target
 * @param compareFn
 * @param removeDuplicates
 * @doc-tags fp,utility
 */
export function arrayIntersect<T>(
	source: T[],
	target: T[],
	compareFn: (a: T, b: T) => boolean = eqeqeq,
	removeDuplicates = true,
): T[] {
	const intersection = source.filter(a => target.some(b => compareFn(a, b)));

	if (removeDuplicates) {
		return intersection.filter((value, index, self) => self.indexOf(value) === index);
	}

	return intersection;
}

/**
 * Reorders source array according to newOrder.
 * Returns a reorder copy of the source array.
 * Example:
 * 	source: ['1', '2', '3']
 * 	newOrder: ['3', '1']
 * 	result: ['3', '2', '1']
 */
export const reorderArray = <T>(source: T[], newOrder: T[]): T[] => {
	// filter out elements which are not presented in the source array
	const order = newOrder.slice().filter(i => source.find(s => s === i));
	return source.map(el => {
		if (newOrder.indexOf(el) >= 0) {
			return order.shift() ?? el;
		}
		return el;
	});
};

export const eqeqeq = <T>(a: T, b: T) => a === b;

/**
 * Subtracts target from source array.
 * Example:
 *   source: [1, 2, 3, 4]
 *   target: [2, 4, 6]
 *   result: [1, 3]
 * @param source
 * @param target
 * @param compareFn
 */
export const arraySubtract = <T>(source: T[], target: T[], compareFn: (a: T, b: T) => boolean) => {
	return source.filter(a => target.filter(b => compareFn(a, b)).length === 0);
};

const eqStrict = <T>(a: T, b: T) => a === b;

export const arrayCompare = <T>(source: T[], target: T[], compareFn: (a: T, b: T) => boolean = eqStrict): boolean => {
	return source.length === target.length && source.every((w, i) => compareFn(w, target[i]));
};

export function moveInArray<T>(arr: Array<T>, from: number, to: number): Array<T> {
	const result = arr.slice();
	const item = result[from];
	result.splice(from, 1);
	result.splice(to, 0, item);
	return result;
}

export function moveInArrayMutable<T>(arr: Array<T>, _from: number, _to: number): Array<T> {
	const n = arr.length;
	const from = clamp(_from, 0, n - 1);
	const to = clamp(_to, 0, n - 1);
	const item = arr[from];
	arr.splice(from, 1);
	arr.splice(to, 0, item);
	return arr;
}

type ItemFinder<T> = (item: T) => boolean;

/**
 * Replaces item in array with another one.
 * @param arr
 * @param itemFinder - predicate to find item
 * @param replace - item to replace
 */
export function replaceInArray<T>(arr: Array<T>, itemFinder: ItemFinder<T>, replace: T) {
	const result = arr.slice();
	const idx = result.findIndex(itemFinder);
	if (idx !== -1) {
		result.splice(idx, 1);
		result.splice(idx, 0, replace);
	}
	return result;
}

export const uniqueArray = <T extends string | number>(arr: T[]): T[] => {
	const hashTable: Record<any, boolean> = {};

	return arr.filter(item => (hashTable[item] ? false : (hashTable[item] = true)));
};

export const groupBy = <T, KT extends T[keyof T] extends string | number ? T[keyof T] : never>(
	array: Array<T>,
	key: keyof T,
): Record<KT, Array<T>> => {
	return array.reduce((result, currentValue) => {
		// If an array already present for key, push it to the array. Else create an array and push the object
		(result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
		// Return the current iteration `result` value, this will be taken as next iteration `result` value and accumulate
		return result;
		// eslint-disable-next-line no-restricted-syntax
	}, {} as any); // empty object is the initial value for result object
};

/**
 * Inserts *something* between every two elements in the source array
 * Example: interleave(['first', 'second', 'third'], 'bar') => ['first', 'bar', 'second', 'bar', 'third']
 * @param arr
 * @param something
 */
export const interleave = <T>(arr: Array<T>, something: T) =>
	// eslint-disable-next-line no-restricted-syntax
	([] as Array<T>).concat(...arr.map(n => [n, something])).slice(0, -1);
export const isTwoDimArray = <T>(arr: Array<T> | Array<T[]>) => Array.isArray(arr[0]);

// @ts-ignore
export const create2DArray = <T>(arr: Array<T> | Array<T[]>): Array<T[]> => (Array.isArray(arr[0]) ? arr : [arr]);

export const slice2DArray = <T>(arr: Array<T[]>, startIdx: number, endIdx: number): T[][] => {
	const result: T[][] = [];
	let pointsCurrentIdx = 0;
	for (const arr1D of arr) {
		const localIdxStart = Math.max(startIdx - pointsCurrentIdx, 0);
		const localEndIdx = Math.max(endIdx - pointsCurrentIdx, -1);
		const newPoints = arr1D.slice(localIdxStart, localEndIdx + 1);
		newPoints.length > 0 && result.push(newPoints);
		pointsCurrentIdx += arr1D.length;
	}
	return result;
};

// Array.at() polyfill (as of December 2022 method is not supported on iOS <= v15)
export const at = <T>(idx: number, arr: T[]) => (idx >= 0 ? arr[idx] : arr[arr.length + idx]);

// Array.flat() polyfill (support for chrome 66)
export const flat = <T>(arr: T[][]) => {
	// @ts-ignore
	if (Array.prototype.flat) {
		return arr.flat();
	}
	return flatMap(arr, identity);
};

// Array.flatMap() polyfill (support for chrome 66)
export const flatMap = <T, U>(arr: T[], callback: (value: T, index: number, array: T[]) => U[]) => {
	// @ts-ignore
	if (Array.prototype.flatMap) {
		return arr.flatMap(callback);
	}
	const result: U[] = [];
	for (let i = 0; i < arr.length; i++) {
		const item = arr[i];
		result.push(...callback(item, i, arr));
	}
	return result;
};

export interface BinarySearchResult {
	// index or -1 if not found
	index: number;
	// if match was exact, or the index is the closest
	exact: boolean;
}

/**
 * Performs binary search over numbers array.
 * Works very fast - tested.
 * @param array
 * @param what
 * @doc-tags tricky,math,utility
 */
export function binarySearch(array: Array<number>, what: number): BinarySearchResult;
// eslint-disable-next-line no-redeclare
export function binarySearch<Item>(
	array: Array<Item>,
	what: number,
	transform: (item: Item) => number,
): BinarySearchResult;
// eslint-disable-next-line no-redeclare
export function binarySearch<Item>(
	array: Array<Item>,
	what: number,
	transform?: (item: Item) => number,
): BinarySearchResult {
	// @ts-ignore
	const applyTransform: (item: Item) => number = transform ?? identity;
	if (!array.length || what !== what) {
		return {
			index: -1,
			exact: true,
		};
	}
	return binarySearchFn(array, what, 0, array.length, applyTransform);
}

function binarySearchFn<Item>(
	array: Array<Item>,
	what: number,
	from: number,
	to: number,
	transform: (item: Item) => number,
): BinarySearchResult {
	const center = shiftRight(from + to, 1);
	const centerValue = transform(array[center]);
	if (what === centerValue) {
		return {
			index: center,
			exact: true,
		};
	} else {
		if (from === center) {
			return {
				index: from,
				exact: false,
			};
		} else {
			if (what < centerValue) {
				return binarySearchFn(array, what, from, center, transform);
			} else {
				return binarySearchFn(array, what, center, to, transform);
			}
		}
	}
}

export function lastOf<T>(arr?: ArrayLike<T>): T | undefined {
	if (arr && arr.length) {
		return arr[arr.length - 1];
	}
}

export function arrayRemove<T>(this: Array<T>, element: T): T[] {
	const idx = this.indexOf(element);
	if (idx !== -1) {
		this.splice(idx, 1);
	}
	return this;
}

// ... and this is how a normal person would write "arrayRemove" function
export function arrayRemove2<A>(array: Array<A>, element: A): void {
	if (!array) {
		return;
	}
	const idx = array.indexOf(element);
	if (idx !== -1) {
		array.splice(idx, 1);
	}
}

export function firstOf<T>(arr?: ArrayLike<T>): T | undefined {
	if (arr) {
		return arr[0];
	}
}

/**
 @param {Function} gather - get the comparing value from the array
 */
export function maxMin<B>(gather: (b: B) => number | null | undefined): (arr: B[]) => [number, number] {
	function reducer(a: [number, number], b: B): [number, number] {
		const v = gather(b);
		if (v === null || v === undefined || !isFinite(v)) {
			return a;
		} else {
			return [Math.max(a[0], v), Math.min(a[1], v)];
		}
	}

	return function (arr?: B[]) {
		const defaultResult: [number, number] = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
		if (arr) {
			return arr.reduce(reducer, defaultResult);
		}
		return defaultResult;
	};
}

/**
 * Finds and returns elements from the array in the given range
 * Uses modified version of binary search under the hood, so the complexity is log(N)
 *
 * @param {Item[]} array of the elements in a ASC ORDER
 * @param {number} leftBound left bound of the range
 * @param {number} rightBound right bounds of the range
 * @param {function(Item):number} transform function to transform the elements of the array if the array is not of a number type
 *
 * @returns {Item[]} array of items which fall within the range
 */
export function getElementsInRange(array: number[], leftBound: number, rightBound: number): number[];

export function getElementsInRange<Item>(
	array: Item[],
	leftBound: number,
	rightBound: number,
	transform: (item: Item) => number,
): Item[];

export function getElementsInRange<Item>(
	array: Item[],
	leftBound: number,
	rightBound: number,
	transform: (item: Item) => number = () => 0,
): Item[] {
	const upperIndex = (arr: Item[], bound: number) => {
		let l = 0;
		let h = arr.length - 1;
		while (h >= l) {
			const midIndex = Math.ceil((l + h) / 2);
			const mid = transform(arr[midIndex]);
			if (mid <= bound) {
				l = midIndex + 1;
			} else {
				h = midIndex - 1;
			}
		}
		return h;
	};
	const lowerIndex = (arr: Item[], bound: number) => {
		let l = 0;
		let h = arr.length - 1;
		while (h >= l) {
			const midIndex = Math.ceil((l + h) / 2);
			const mid = transform(arr[midIndex]);
			if (mid >= bound) {
				h = midIndex - 1;
			} else {
				l = midIndex + 1;
			}
		}
		return l;
	};
	return array.slice(lowerIndex(array, leftBound), upperIndex(array, rightBound) + 1);
}
