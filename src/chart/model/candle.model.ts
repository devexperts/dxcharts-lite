import { Unit } from './scaling/viewport.model';
import { PriceMovement } from './candle-series.model';

/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Has no specific rule, just any number to use in units calculation.
// 1 - because why not? Easy to debug.
export const BASIC_CANDLE_WIDTH: Unit = 1;

/**
 * @doc-tags model
 * @doc-tags-name Candle
 */
export interface Candle {
	readonly hi: number;
	readonly lo: number;
	readonly open: number;
	readonly close: number;
	readonly timestamp: number;
	volume: number;
	readonly expansion?: boolean;
	idx?: number;
	readonly impVolatility?: number;
	readonly vwap?: number;
}

/**
 * Provides the name of candle difference
 * @param {Number} open
 * @param {Number} close
 * @returns {String}
 */
export function nameDirection(open: number, close: number): PriceMovement {
	if (close === open) {
		return 'none';
	} else if (close > open) {
		return 'up';
	} else {
		return 'down';
	}
}

/**
 * Provides the name of candle difference for hollow chart type
 * @param {Number} open
 * @param {Number} close
 * @returns {String}
 */
export function hollowDirection(open: number, close: number): PriceMovement {
	if (close > open) {
		return 'up';
	} else {
		return 'down';
	}
}

/**
 * Creates a new Candle object based on the provided base object, with the option to modify the prices.
 * @param {Candle} base - The base object to copy.
 * @param {number} idx - The index of the new Candle object.
 * @param {boolean} pricesAsClose - If true, the high, low, and open prices will be set to the close price.
 * @returns {Candle} A new Candle object with the same properties as the base object, with the option to modify the prices.
 */
export function copyCandle(base: Candle, idx: number, pricesAsClose: boolean = false): Candle {
	const { expansion, impVolatility, vwap, volume, timestamp } = base;
	let hi = base.hi;
	let lo = base.lo;
	let open = base.open;
	const close = base.close;
	if (pricesAsClose) {
		hi = close;
		lo = close;
		open = close;
	}
	let _idx = base.idx;
	if (idx !== undefined) {
		_idx = idx;
	}
	return {
		hi,
		lo,
		open,
		close,
		timestamp,
		volume,
		expansion,
		idx: _idx,
		impVolatility,
		vwap,
	};
}
