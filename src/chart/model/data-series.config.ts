/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BarTypes, YAxisLabelAppearanceType, YAxisLabelMode } from '../chart.config';

export type DataSeriesType =
	| 'POINTS'
	| 'LINEAR'
	| 'HISTOGRAM'
	| 'TREND_HISTOGRAM'
	| 'DIFFERENCE'
	| 'TEXT'
	| 'ABOVE_CANDLE_TEXT'
	| 'BELOW_CANDLE_TEXT'
	| 'ABOVE_CANDLE_TRIANGLE'
	| 'TRIANGLE'
	| 'COLOR_CANDLE'
	| 'RECTANGULAR'
	| keyof BarTypes
	| string;

export interface DataSeriesConfig {
	paintConfig: Array<DataSeriesPaintConfig>;
	visible: boolean;
	highLowActive: boolean;
	type: DataSeriesType;
	/**
	 * 'viewport' data-series label will show last visible on the screen series value.
	 * 'series'  data-series label will show last overall series value (even if not visible).
	 */
	labelLastValue: 'series' | 'viewport';
	labelMode: YAxisLabelMode;
	labelAppearanceType: YAxisLabelAppearanceType;
	labelPaddingBottom?: number;
	labelPaddingTop?: number;
	labelPaddingEnd?: number;
}

export interface DataSeriesPaintConfig {
	color: string;
	lineWidth: number;
	hoveredLineWidth: number;
	//add this for TREND_HISTOGRAM study type
	// this way not add breaking change
	aditionalColor?: string;
}

export const DEFAULT_DATA_SERIES_PAINT_CONFIG: DataSeriesPaintConfig = {
	color: '#FF00FF',
	lineWidth: 1,
	hoveredLineWidth: 2,
};

export const DEFAULT_DATA_SERIES_CONFIG: DataSeriesConfig = {
	paintConfig: [DEFAULT_DATA_SERIES_PAINT_CONFIG],
	type: 'LINEAR',
	highLowActive: true,
	visible: true,
	labelLastValue: 'viewport',
	labelMode: 'label',
	labelAppearanceType: 'badge',
};
