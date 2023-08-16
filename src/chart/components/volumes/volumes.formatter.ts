/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NumberFormatLabels } from '../../utils/math.utils';

const DEFAULT_PRECISION = 5;
const MIN_VALUE = 0.0000000001;
const TRAILLING_ZEROES_REGEXP = /\.?0+$/;
const TRAILLING_FRACTION_WITH_ZEROES_REGEXP = /(\.[1-9]*)0+$/;

export const volumeFormatter = (value: number): string => {
	const formatValue = (value: number, amountToCut?: NumberFormatLabels): string => {
		const rounder = Math.pow(10, DEFAULT_PRECISION);
		const roundedValue = Math.round(value * rounder) / rounder;

		if (roundedValue < 1 && roundedValue >= MIN_VALUE) {
			return roundedValue
				.toFixed(DEFAULT_PRECISION)
				.replace(TRAILLING_ZEROES_REGEXP, '')
				.replace(TRAILLING_FRACTION_WITH_ZEROES_REGEXP, '');
		} else {
			return (roundedValue + '').replace(TRAILLING_FRACTION_WITH_ZEROES_REGEXP, '') + (amountToCut || '');
		}
	};

	if (Math.abs(value) > 999_999_999) {
		value = Math.round(value / 1_000_000) * 1_000_000;
		return formatValue(value / 1_000_000_000, 'B');
	}

	if (Math.abs(value) > 999_999) {
		value = 1000 * Math.round(value / 1000);
		return formatValue(value / 1_000_000, 'M');
	}

	if (Math.abs(value) > 9_999) {
		return formatValue(value / 1000, 'K');
	}

	return formatValue(value);
};
