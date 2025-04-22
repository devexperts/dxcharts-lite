/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Unit } from './scaling/viewport.model';
import { PriceMovement } from './candle-series.model';
import { hashCode } from '../utils/string.utils';

// Has no specific rule, just any number to use in units calculation.
// 1 - because why not? Easy to debug.
export const BASIC_CANDLE_WIDTH: Unit = 1;

/**
 * @doc-tags model
 * @doc-tags-name Candle
 */
export interface Candle {
	readonly id: string;
	readonly hi: number;
	readonly lo: number;
	readonly open: number;
	readonly close: number;
	readonly timestamp: number;
	volume: number;
	readonly expansion?: boolean;
	idx?: number;
	readonly impVolatility?: number;
	/**
	 * @deprecated might be removed in next major version
	 */
	readonly vwap?: number;
	readonly typicalPrice?: number;
}

export const defaultSortCandles = (candles: Candle[]): Candle[] =>
	candles.slice().sort((a, b) => (a.timestamp === b.timestamp ? 0 : a.timestamp > b.timestamp ? 1 : -1));

export const generateCandleId = (timestamp: number, hashValue: number | string): string => {
	return `${timestamp}_${hashCode(hashValue.toString())}`;
};

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
	const { id, expansion, impVolatility, vwap, typicalPrice, volume, timestamp } = base;
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
		id,
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
		typicalPrice,
	};
}
