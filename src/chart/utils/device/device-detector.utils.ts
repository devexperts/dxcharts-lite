/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export type Devices = 'apple' | 'mobile' | 'other';

/**
 * Detects the user device. Naive approach.
 * @doc-tags tricky,mobile
 */
export const deviceDetector = (): Devices => {
	const isApple = /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent);

	const mobileMatch = [/Android/i, /webOS/i, /BlackBerry/i, /Windows Phone/i];
	const isMobile = mobileMatch.some(os => {
		return navigator.userAgent.match(os);
	});

	if (isApple) {
		return 'apple';
	}

	if (isMobile) {
		return 'mobile';
	}

	return 'other';
};

export const multiplyZoomByDevice = (device: Devices, defaultValue: number): number => {
	if (device === 'apple' || device === 'mobile') {
		return 3;
	}
	return defaultValue;
};
