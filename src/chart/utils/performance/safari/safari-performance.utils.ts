/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SAFARI_CANVAS_LIMITS, SafariThrottleTimeMS, SafariThrottleTimeMSMap } from './safari-performance.model';

/**
 * Safari Performance Optimization Utilities
 *
 * This module contains utilities specifically designed to address Safari performance issues
 * during drag/zoom operations on charts.
 */

/**
 * Calculates optimal throttle time for hit-test wheel events based on canvas size and browser
 * @param canvasArea - Total canvas area in pixels (width * height)
 * @returns Throttle time in milliseconds
 */
export function calculateHitTestThrottleTime(canvasArea: number): SafariThrottleTimeMS {
	if (canvasArea > SAFARI_CANVAS_LIMITS.ZOOM_OPTIMIZED_PIXELS) {
		return SafariThrottleTimeMSMap.MAX;
	} else if (canvasArea > SAFARI_CANVAS_LIMITS.ZOOM_OPTIMIZED_PIXELS * 0.75) {
		return SafariThrottleTimeMSMap.HIGH;
	} else if (canvasArea > SAFARI_CANVAS_LIMITS.ZOOM_OPTIMIZED_PIXELS * 0.5) {
		return SafariThrottleTimeMSMap.MEDIUM;
	} else if (canvasArea > SAFARI_CANVAS_LIMITS.ZOOM_OPTIMIZED_PIXELS * 0.25) {
		return SafariThrottleTimeMSMap.LOW;
	} else {
		return SafariThrottleTimeMSMap.MIN;
	}
}
