/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ceil, floor, round } from '../math.utils';

export let dpr = window.devicePixelRatio;

// A media matcher which watches for changes in the device pixel ratio.
let mediaMatcher = window.matchMedia(`screen and (resolution: ${window.devicePixelRatio}dppx)`);

const updateDevicePixelRatio = () => {
	mediaMatcher.removeEventListener('change', updateDevicePixelRatio);
	dpr = window.devicePixelRatio;
	mediaMatcher = window.matchMedia(`screen and (resolution: ${window.devicePixelRatio}dppx)`);
	mediaMatcher.addEventListener('change', updateDevicePixelRatio);
};
mediaMatcher.addEventListener('change', updateDevicePixelRatio);

export const getDPR = () => dpr;

/**
 * Rounds a given number according to the inverse of current DPR.
 * For example, DPR = 2, num = 2, res => 2; DPR = 2, num = 2.5, res => 2.5; DPR = 2, num = 2.333, res => 2.5
 * @param num
 * @doc-tags chart-core,math,dpr
 */
export const roundToDPR = (num: number) => round(dpr * num) / dpr;
export const floorToDPR = (num: number) => floor(dpr * num) / dpr;
export const ceilToDPR = (num: number) => ceil(dpr * num) / dpr;
