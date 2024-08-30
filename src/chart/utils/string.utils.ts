/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export function hashCode(str: string): number {
	let hash = 0;
	if (str.length === 0) {
		return hash;
	}
	for (let i = 0; i < str.length; i++) {
		const chr = str.charCodeAt(i);
		// eslint-disable-next-line no-bitwise
		hash = (hash << 5) - hash + chr;
		// eslint-disable-next-line no-bitwise
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}
