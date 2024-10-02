/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export const volumeFormatter = (value: number, precision = 1) => {
	function formatNumber(value: number): string {
		let formattedResult: string;
		const priceScale = Math.pow(10, precision);
		value = Math.round(value * priceScale) / priceScale;
		if (value >= 1e-15 && value < 1) {
			formattedResult = value.toFixed(precision).replace(/\.?0+$/, ''); // regex removes trailing zeroes
		} else {
			formattedResult = String(value);
		}
		return formattedResult.replace(/(\.[1-9]*)0+$/, (e: string, p1: string): string => p1);
	}

	function format(value: number): string {
		let sign = '';
		if (value < 0) {
			sign = '-';
			value = -value;
		}
		if (value < 995) {
			return sign + formatNumber(value);
		}
		if (value < 999995) {
			return sign + formatNumber(value / 1000) + 'K';
		}
		if (value < 999999995) {
			value = 1000 * Math.round(value / 1000);
			return sign + formatNumber(value / 1000000) + 'M';
		}
		value = 1000000 * Math.round(value / 1000000);
		return sign + formatNumber(value / 1000000000) + 'B';
	}

	return format(value);
};
