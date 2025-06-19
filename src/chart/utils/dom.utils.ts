/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export const MouseButton = {
	left: 0,
	middle: 1,
	right: 2,
};

export type MouseButtonType = typeof MouseButton[keyof typeof MouseButton];

/**
 * @param {Element} element
 * @param {function} listener
 * @param {string} eventType
 * @param {boolean?} useCapture
 * @return {Function}
 */
export function subscribeListener<K extends keyof GlobalEventHandlersEventMap>(
	element: EventTarget,
	listener: (e: GlobalEventHandlersEventMap[K]) => void,
	eventType: K,
	useCapture?: boolean,
) {
	// @ts-ignore
	element.addEventListener(eventType, listener, useCapture);
	return function () {
		// @ts-ignore
		element.removeEventListener(eventType, listener, useCapture);
	};
}

export function leftMouseButtonListener(cb: (e: MouseEvent) => void) {
	return (e: MouseEvent) => {
		if (e.button === MouseButton.left) {
			cb(e);
		}
	};
}
