/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
const HEX_COLOR_REGEXP = /^(#)([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB_COLOR_REGEXP = /^\s*(rgba?)\s*[(]\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?[)]\s*$/i;

function parseColor(color: string) {
	const match = HEX_COLOR_REGEXP.exec(color) || RGB_COLOR_REGEXP.exec(color);
	let colors: string[] = [];
	if (match) {
		colors = match.slice(2, 5);
		if (match[1] === '#') {
			return colors.map(function (s) {
				return parseInt(s, 16);
			});
		}
	}
	return colors;
}
/**
 *
 * @param {String} color
 * @param {Number} alpha
 * @returns {String}
 */
const rgbaCache: Record<string, string> = {};
export function toRGBA(color: string, alpha: number): string {
	let result = rgbaCache[color + alpha];
	if (!result) {
		const colors = parseColor(color);
		result = colors && 'rgba(' + colors.join(',') + ',' + alpha + ')';
		rgbaCache[color + alpha] = result;
	}
	return result;
}
