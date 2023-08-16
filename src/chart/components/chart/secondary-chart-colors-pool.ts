/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartColors, FullChartConfig, SecondaryChartTheme } from '../../chart.config';
import { CandleSeriesColors } from '../../model/candle-series.model';
import { cloneUnsafe } from '../../utils/object.utils';

export class SecondaryChartColorsPool {
	private secondaryChartColorsPool: { [key: string]: FullChartColors };
	private usedChartColors: { [key: string]: number } = {};
	private symbolsToColorKeys: { [key: string]: string } = {};

	constructor(private config: FullChartConfig) {
		this.secondaryChartColorsPool = this.createColorPool(this.config.colors.secondaryChartTheme);
		this.usedChartColors = Object.keys(this.secondaryChartColorsPool).reduce(
			(acc, key) => ({ ...acc, [key]: 0 }),
			{},
		);
	}

	/**
	 * Creates a color pool object based on the provided color array
	 * @param {SecondaryChartTheme[]} colorArray - An array of SecondaryChartTheme objects
	 * @returns {Object} - An object containing a key-value pair for each color in the colorArray
	 * The key is a string in the format "colorX" where X is the index of the color in the array
	 * The value is an object containing the FullChartColors for the color, with lineTheme and areaTheme properties
	 */
	private createColorPool(colorArray: SecondaryChartTheme[]): {
		[key: string]: FullChartColors;
	} {
		return colorArray.reduce<Record<string, FullChartColors>>((acc, item, index) => {
			acc[`color${index}`] = {
				...cloneUnsafe(this.config.colors),
				lineTheme: { ...item.lineTheme },
				areaTheme: { ...item.areaTheme },
			};
			return acc;
		}, {});
	}

	/**
	 * Takes a color from the secondaryChartColorsPool and assigns it to a symbol.
	 * @param {string} symbol - The symbol to assign the color to.
	 * @returns {string} The color assigned to the symbol.
	 */
	public takeColorFromPool(symbol: string) {
		let minColors = Number.MAX_SAFE_INTEGER;
		let minColorKey = '';
		for (const [key, value] of Object.entries(this.usedChartColors)) {
			if (value < minColors) {
				minColors = value;
				minColorKey = key;
			}
		}
		this.usedChartColors[minColorKey] = this.usedChartColors[minColorKey] + 1;
		this.symbolsToColorKeys[symbol] = minColorKey;

		return this.secondaryChartColorsPool[minColorKey];
	}

	/**
	 * Adds a color to the chart color pool.
	 *
	 * @param {string} symbol - The symbol of the color to be added.
	 *
	 * @returns {void}
	 */
	public addColorToPool(symbol: string) {
		const key = this.symbolsToColorKeys[symbol];
		if (this.usedChartColors[key]) {
			this.usedChartColors[key] = this.usedChartColors[key] - 1;
		}
	}

	/**
	 * Updates the color configuration for a given symbol in the chart.
	 * @param {string} symbol - The symbol for which the color configuration needs to be updated.
	 * @param {CandleSeriesColors} config - The new color configuration for the symbol.
	 * @returns {void}
	 */
	public updateColorConfig(symbol: string, config: CandleSeriesColors) {
		const existColorConfig = this.secondaryChartColorsPool[this.usedChartColors[symbol]];
		if (existColorConfig) {
			const colors = config;
			this.secondaryChartColorsPool[this.usedChartColors[symbol]] = {
				...config,
				lineTheme: Object.assign(existColorConfig.lineTheme, colors.lineTheme ?? {}),
				areaTheme: Object.assign(existColorConfig.areaTheme, colors.areaTheme ?? {}),
			};
		}
	}
}
