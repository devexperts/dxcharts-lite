import { StringTMap } from './object.utils';

/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export const MAX_DECIMAL_DIGITS = 14;
// Array of powers of 10. Used in roundDecimal to walk through mantissa.

const POW10: number[] = [];
for (let i = 0; i < MAX_DECIMAL_DIGITS + 1; i++) {
	POW10.push(10 ** i);
}

const EPS = 0.000_000_000_000_5;

export type NumberFormatLabels = 'K' | 'M' | 'B';

export class MathUtils {
	public static roundToNearest(value: number, precision: number): number {
		if (!isFinite(value)) {
			return value;
		}

		if (MathUtils.isZero(value)) {
			return 0.0;
		}

		if (value > 0) {
			value += EPS;
		} else if (value < 0) {
			value -= EPS;
		}
		return MathUtils.roundDecimal(Math.round(MathUtils.roundDecimal(value / precision)) * precision);
	}

	public static roundUpToNearest(value: number, precision: number): number {
		return MathUtils.roundDecimal(Math.ceil(value / precision)) * precision;
	}

	public static roundDecimal(x: number): number {
		if (isNaN(x) || x === Math.floor(x)) {
			return x;
		} // integer, NaN, or +/- inf
		const signum = Math.sign(x);
		const abs = Math.abs(x);
		const pow = Math.min(MAX_DECIMAL_DIGITS, MAX_DECIMAL_DIGITS - 1 - Math.floor(Math.log10(abs)));
		for (let i = pow; i >= 0; i--) {
			const mantissa = Math.floor(POW10[i] * abs + 0.5);
			if (mantissa < POW10[MAX_DECIMAL_DIGITS]) {
				return (signum * mantissa) / POW10[i];
			}
		}
		// Mantissa >= 10^14 with fractions -- just round
		return Math.round(x);
	}

	public static makeDecimal(value: number, precision: number, decimal?: string): string {
		if (isFinite(value)) {
			const stringValue = value.toFixed(precision);
			return decimal ? stringValue.replace('.', decimal) : stringValue;
		} else {
			return '';
		}
	}

	public static compare(a: number, b: number, eps: number): number {
		if (a > b + eps) {
			return +1;
		} else if (a < b - eps) {
			return -1;
		} else {
			return (isNaN(a) ? 1 : 0) - (isNaN(b) ? 1 : 0);
		}
	}

	public static isZero(a: number): boolean {
		return MathUtils.compare(a, 0, EPS) === 0;
	}

	public static cutNumber(value: number, amountToCut: NumberFormatLabels, zeros: number = 0): string {
		const cutMap: StringTMap<(v: number) => number> = {
			K: v => v / 1000,
			M: v => v / 1000000,
		};
		return cutMap[amountToCut](value).toFixed(zeros) + amountToCut;
	}
}

/**
 * Checks if first and second number are differs by specified times
 * @param first {number}
 * @param second {number}
 * @param times {number}
 * @doc-tags utility,math
 */
export function isDiffersBy(first: number, second: number, times: number) {
	const diff = first / second;
	return diff >= times || diff <= 1 / times;
}

export function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(value, max));
}

export function easeExpOut(value: number) {
	return 1 - (Math.pow(2, -10 * value) - 0.0009765625) * 1.0009775171065494;
}

/**
 * Returns the first finite number in a list of numbers. If no finite number is found,
 * returns NaN.
 * @param {...number} args - A list of numbers to search for a finite value.
 * @returns {number} The first finite number in the list, or NaN if no finite number is found.
 */
export function finite(...args: (number | undefined)[]): number {
	for (const arg of args) {
		if (arg !== undefined && isFinite(arg)) {
			return arg;
		}
	}
	return NaN;
}

/**
 * These functions can be used only for chart coordinates because they all are working in positive coordinates!!!
 */
// eslint-disable-next-line no-bitwise
export const floor = (value: number): number => ~~value;
// eslint-disable-next-line no-bitwise
export const ceil = (value: number): number => ~~(value + 1);
// eslint-disable-next-line no-bitwise
export const round = (value: number): number => ~~(value + 0.5);
// eslint-disable-next-line no-bitwise
export const shiftRight = (value: number, shift: number): number => value >> shift;
