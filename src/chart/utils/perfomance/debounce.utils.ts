/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const debounce = <T extends (...args: any[]) => any>(callback: T, waitFor: number) => {
	let timeout = 0;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = +setTimeout(() => callback(...args), waitFor);
	};
};
