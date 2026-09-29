/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
let fired = false;
export let animationFrameId = 0;

// map is faster than record
const actions: Map<string, () => void> = new Map<string, () => void>();
const priorActions: Map<string, () => void> = new Map<string, () => void>();

const flush = (queue: Map<string, () => void>) => {
	const pending = Array.from(queue.values());
	queue.clear();
	pending.forEach(action => action());
};

const animFrame = () => {
	if (!fired) {
		fired = true;
		animationFrameId = requestAnimationFrame(() => {
			fired = false;
			flush(priorActions);
			flush(actions);
		});
	}
};

export const animationFrameThrottled = (name: string, action: () => void) => {
	actions.set(name, action);
	animFrame();
};

export const cancelThrottledAnimationFrame = (name: string) => {
	actions.delete(name);
};

export const cancelThrottledAnimationFramePrior = (name: string) => {
	priorActions.delete(name);
};

/**
 * Prior actions will be called before regular actions
 * An example of regular action - draw event
 * @param name
 * @param action
 */
export const animationFrameThrottledPrior = (name: string, action: () => void) => {
	priorActions.set(name, action);
	animFrame();
};
