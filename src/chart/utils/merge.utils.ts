/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * Merges 2 js objects recursively with all properties.
 * - does not modify base object
 * - can override or only add missing ones
 *
 * @param base - base object to merge data into
 * @param override - object with new data which should be merged
 * @param options - merge options
 * @doc-tags tricky,utility
 */
export function merge(
	base: Record<string, any>,
	override: Record<string, any>,
	options: MergeOptions = DEFAULT_MERGE_OPTIONS,
): any {
	function doMerge(base: Record<string, any>, override: Record<string, any>) {
		for (const k in override) {
			if (k in base) {
				if (typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) {
					doMerge(base[k], override[k]);
				} else {
					// do not merge arrays or functions
					if (options?.overrideExisting) {
						base[k] = override[k];
					}
				}
			} else {
				if (options?.addIfMissing) {
					base[k] = override[k];
				}
			}
		}
		return base;
	}
	return doMerge(base, override);
}

export function mergeArray<A extends Record<string, any>>(
	base: Array<A>,
	override: Array<A>,
	hashFn: (a: A) => string,
	mergeObjects = false,
) {
	if (!base || !override || override.length === 0) {
		return;
	}
	override.forEach(o => {
		const hash = hashFn(o);
		const existingIndex = base.findIndex(b => hashFn(b) === hash);
		if (existingIndex === -1) {
			base.push(o);
		} else {
			if (mergeObjects) {
				// try merging objects in array
				merge(base[existingIndex], o, { overrideExisting: true, addIfMissing: true });
			} else {
				base.splice(existingIndex, 1, o);
			}
		}
	});
}

export const DEFAULT_MERGE_OPTIONS = { overrideExisting: false, addIfMissing: true };

export interface MergeOptions {
	/** whether we need to override value if it's already presented in config. Note for arrays: if this flag is true, arrays replaced entirely */
	overrideExisting: boolean;
	/** whether we need to add a property to config, if this property was absent */
	addIfMissing: boolean;
}
