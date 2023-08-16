/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../chart.config';

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
//@ts-ignore
const isChrome = !!window.chrome;
//@ts-ignore
export const isFirefox = typeof InstallTrigger !== 'undefined';

const isWindows = navigator.platform.indexOf('Win') > -1;

/**
 * this function determines whether the event was triggered with the mouse or the touchpad
 *
 * This works because wheelDeltaY measures the physical distance that the actual hardware mouse wheel has travelled,
 * while deltaY measures the amount of scrolling produced on screen.
 * A conventional mouse typically has a much lower "scroll resolution" than a trackpad.
 * The wheelDeltaY is exactly 3x the deltaY value(in most browsers)
 * This function consist a lot of empiric if statements for some cases in different browsers and systems
 * @param {WheelEvent} e
 * @returns {boolean}
 *
 * @doc-tags chart-core, utility,
 */
export const touchpadDetector = (e: WheelEvent): boolean => {
	let isTouchpad = false;
	// this is essential prop to separate touchpad from mouse wheel
	//@ts-ignore
	const { wheelDeltaY, wheelDeltaX } = e;
	if (wheelDeltaY || wheelDeltaX) {
		let condition;
		if (isSafari) {
			condition =
				wheelDeltaY === e.deltaY * -3 ||
				Math.abs(wheelDeltaY + Math.sign(wheelDeltaY)) === Math.abs(Math.round(e.deltaY) * 3) ||
				Math.abs(wheelDeltaY - Math.sign(wheelDeltaY)) === Math.abs(Math.round(e.deltaY) * 3);
		} else if (isChrome) {
			condition =
				wheelDeltaY + Math.sign(wheelDeltaY) === e.deltaY * -3
					? wheelDeltaY + Math.sign(wheelDeltaY) === e.deltaY * -3
					: wheelDeltaY === e.deltaY * -3;
			// Chrome windows case
			if (isWindows) {
				const diapazoneCondition =
					Math.round(e.deltaY) === wheelDeltaY ||
					Math.abs(Math.round(e.deltaY) + Math.sign(e.deltaY)) === Math.abs(wheelDeltaY) ||
					Math.abs(Math.round(e.deltaY) - Math.sign(e.deltaY)) === Math.abs(wheelDeltaY);
				const equalCondition = Math.abs(wheelDeltaY) === Math.abs(e.deltaY);
				condition = equalCondition || diapazoneCondition;
			}
		} else if (isFirefox) {
			if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
				// disable vertical scroll in Firefox bcs it is unstable
				condition = false;
			} else {
				condition = wheelDeltaX === e.deltaX * -3;
			}
		} else {
			// basic rule
			condition = wheelDeltaY === e.deltaY * -3;
		}

		if (condition) {
			isTouchpad = true;
		}
	} else if (e.deltaMode === 0) {
		isTouchpad = true;
	}

	// Firefox for some reason is not obey to rules above
	// so we just this trigger this as mouse wheel event
	if (isFirefox && e.deltaY >= 16 && Math.abs(e.deltaY) % 16 === 0) {
		isTouchpad = false;
	}
	// it is necessary to correctly recognize pinch on touchpad
	// could be emulated mouse wheel + ctrl key BE AWARE!!
	if (e.ctrlKey) {
		isTouchpad = true;
	}

	return isTouchpad;
};

/**
 * this function returns different ящщь sensitivity for the percent axis and the others
 * @param config
 * @param isTouchpad
 * @returns {number}
 *
 * @doc-tags chart-core, zoom
 */
export const getTouchpadSensitivity = (config: FullChartConfig): number => {
	const isPercentAxisType = config.components.yAxis.type === 'percent';
	const zoomSensitivity = isPercentAxisType ? config.scale.zoomSensitivity / 4 : config.scale.zoomSensitivity;
	return zoomSensitivity;
};
