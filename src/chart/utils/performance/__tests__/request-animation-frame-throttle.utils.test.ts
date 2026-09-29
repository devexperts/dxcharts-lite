/*
 * Copyright (C) 2019 - 2026 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { animationFrameThrottled, animationFrameThrottledPrior } from '../request-animation-frame-throttle.utils';

describe('request-animation-frame-throttle.utils', () => {
	const callbacks: FrameRequestCallback[] = [];

	beforeEach(() => {
		callbacks.length = 0;
		jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
			callbacks.push(callback);
			return callbacks.length;
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('runs an action rescheduled from itself on the next frame', () => {
		let shouldReschedule = true;
		const action = jest.fn(() => {
			if (shouldReschedule) {
				shouldReschedule = false;
				animationFrameThrottledPrior('self', action);
			}
		});

		animationFrameThrottledPrior('self', action);
		expect(callbacks).toHaveLength(1);

		callbacks.shift()?.(0);
		expect(action).toHaveBeenCalledTimes(1);
		expect(callbacks).toHaveLength(1);

		callbacks.shift()?.(1);
		expect(action).toHaveBeenCalledTimes(2);
	});

	it('runs regular actions once and keeps prior actions first', () => {
		const calls: string[] = [];

		animationFrameThrottled('regular', () => calls.push('regular'));
		animationFrameThrottledPrior('prior', () => calls.push('prior'));
		callbacks.shift()?.(0);

		expect(calls).toEqual(['prior', 'regular']);
		expect(callbacks).toHaveLength(0);
	});
});
