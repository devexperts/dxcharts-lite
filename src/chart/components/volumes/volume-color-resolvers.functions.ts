/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { VolumeColorResolver } from './volumes.component';
import { FullChartColors } from '../../chart.config';
import { PriceMovement } from '../../model/candle-series.model';
import Color from 'color';

export const VOLUMES_COLOR_OPACITY = 0.3;

export const resolveColorForBar: VolumeColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => {
	const color = colors.barTheme[`${priceMovement}Color`];
	return Color(color).alpha(VOLUMES_COLOR_OPACITY).toString();
};

export const resolveColorUsingConfig: VolumeColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => {
	const color = colors.volume[`${priceMovement}BarColor`];
	return Color(color).alpha(VOLUMES_COLOR_OPACITY).toString();
};

export const resolveColorForLine: VolumeColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => {
	const color = colors.lineTheme[`${priceMovement}Color`];
	return Color(color).alpha(VOLUMES_COLOR_OPACITY).toString();
};

export const resolveColorForCandle: VolumeColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => {
	const color = colors.candleTheme[`${priceMovement}Color`];
	return Color(color).alpha(VOLUMES_COLOR_OPACITY).toString();
};
