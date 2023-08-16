/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { floor, MathUtils } from './math.utils';

export class PriceIncrementsUtils {
	public static DEFAULT_INCREMENT = 0.01;
	public static DEFAULT_PRECISION = 2;
	public static RELATIVE_EPS = 1e-8;
	public static MAXIMUM_PRECISION = 10;

	/**
	 * Automatically detects increment of provided value range.
	 * Naive algorithm takes 1st mantissa number's :
	 * range=124.14 	=> increment=1
	 * range=6300.02931	=> increment=10
	 * range=0.0018		=> increment=0.00001
	 *
	 * @param valueRange
	 * @doc-tags tricky,y-axis
	 */
	public static autoDetectIncrementOfValueRange(valueRange: number) {
		const extent = this.getDigitsInNumber(valueRange);
		if (valueRange === 0) {
			return 0.01;
		} else {
			return Math.pow(10, extent - 3);
		}
	}

	/**
	 * Gets number of digits in number.
	 * 20 => 2
	 * 100 => 3
	 * 7 => 1
	 * 1.123 => 1
	 * -200 => 3
	 * -1234567.00031 => 7
	 * 0.0001 = > -4
	 * @param x - any number
	 */
	private static getDigitsInNumber(x: number) {
		// eslint-disable-next-line no-bitwise
		const getDigits = (val: number) => floor(Math.log10((val ^ (val >> 31)) - (val >> 31))) + 1;
		let numberDigitsIntegerPart = getDigits(x);
		if (numberDigitsIntegerPart === 1 && x < 1) {
			numberDigitsIntegerPart = getDigits(x * 10e8) - 9;
		}
		return numberDigitsIntegerPart;
	}

	// Price increment represent array of increment-price couples and trailing increment
	// e.g. [(priceIncrement, price,)*  incrementForOtherPrices]
	// [0.01, 1, 0.1, 10, 1] means
	// there are three  increments (0.01 for price < 1 ), (0.1 for price < 10), (1 for any other price)
	public static getPriceIncrement(price: number, increments: number[] = []): number {
		if (!this.validatePriceIncrementsOrPrecisions(increments)) {
			return this.DEFAULT_INCREMENT;
		}
		if (isNaN(price)) {
			return Math.round(increments[0]);
		}
		price = Math.abs(price);
		let i = 1;

		const RELATIVE_EPS = 1e-6;
		while (
			i < increments.length &&
			price > increments[i] + Math.min(increments[i - 1], increments[i + 1]) * RELATIVE_EPS
		) {
			i += 2;
		}
		if (
			i >= increments.length ||
			price < increments[i] - Math.min(increments[i - 1], increments[i + 1]) * RELATIVE_EPS
		) {
			return increments[i - 1];
		}

		return Math.min(increments[i - 1], increments[i + 1]);
	}

	public static getPricePrecision(price: number, precisions: number[]): number {
		if (!this.validatePriceIncrementsOrPrecisions(precisions)) {
			return 0;
		}
		if (isNaN(price)) {
			return Math.round(precisions[0]);
		}
		price = Math.abs(price);
		let i = 1;
		while (i < precisions.length && price > precisions[i]) {
			i += 2;
		}
		return Math.round(precisions[i - 1]);
	}

	public static roundPriceToIncrement(price: number, increments: number[], incrementReferencePrice: number): number {
		const increment = PriceIncrementsUtils.getPriceIncrement(
			incrementReferencePrice ? incrementReferencePrice : price,
			increments,
		);
		return MathUtils.roundToNearest(price, increment);
	}

	public static computePrecisions(increments: number[]): number[] {
		const precisions = [...increments];
		for (let i = 0; i < increments.length; i += 2) {
			precisions[i] = PriceIncrementsUtils.calculatePrecision(increments[i]);
		}
		for (let i = 1; i < increments.length; i += 2) {
			precisions[i] =
				increments[i] + Math.min(increments[i - 1], increments[i + 1]) * PriceIncrementsUtils.RELATIVE_EPS;
		}
		return precisions;
	}

	public static calculatePrecision(value: number) {
		// in case value is a huge number we need to perform normalization so that relative epsilon still works
		let val = value > 1 ? Math.abs(Math.floor(value) - value) : value;
		for (let i = 0; i < PriceIncrementsUtils.MAXIMUM_PRECISION; i++) {
			const round = Math.floor(val + 0.5);
			const eps = Math.abs(val * PriceIncrementsUtils.RELATIVE_EPS);
			if (round >= val - eps && round <= val + eps) {
				return i;
			}
			val *= 10;
		}
		return PriceIncrementsUtils.MAXIMUM_PRECISION;
	}
	/**
	 * checks if the received from feed increments/precisions data is valid to display
	 * examples of wrong data: [], [0], not an array
	 */
	public static validatePriceIncrementsOrPrecisions(data: number[]) {
		return !(data.length === 0 || !Array.isArray(data) || data.findIndex((i: number) => i !== 0) === -1);
	}
}
