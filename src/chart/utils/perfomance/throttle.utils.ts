/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { uuid } from '../uuid.utils';
import { animationFrameThrottled } from './request-animation-frame-throttle.utils';

/**
 @param shouldPreventDefault
 @param {Function} listener
 wraps the listener, that it would be fired not as frequent as event itself, but not more than every 30 ms
 @param {Function} [isSuppressed] optional callback to check if the event is suppressed for some reason before adding
 the handler in requestAnimationFrame, which would execute it asynchronously
 @returns {Function}
 */
export function throttle<L extends EventListener>(
	shouldPreventDefault: boolean,
	listener: L,
	isSuppressed?: () => boolean,
): L;

export function throttle(
	shouldPreventDefault: boolean,
	listener: EventListener,
	isSuppressed?: () => boolean,
): () => void;

export function throttle(
	shouldPreventDefault: boolean,
	listener: EventListener,
	isSuppressed?: () => boolean,
): (event: Event) => void {
	let last: Event | undefined;
	const animFrameId = uuid();

	function fireLastEvent() {
		const event = last;
		last = void 0;
		if (event) {
			listener(event);
		}
	}

	return function (event: Event) {
		const hasEvent = last;
		last = event;
		shouldPreventDefault && event.preventDefault();

		if (!hasEvent && !(typeof isSuppressed === 'function' && isSuppressed())) {
			animationFrameThrottled(animFrameId, fireLastEvent);
		}
	};
}
