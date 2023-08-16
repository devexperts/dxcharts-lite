/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { PriceMovement } from '../../model/candle-series.model';
import { FullChartColors, YAxisLabelsColors } from '../../chart.config';

export const DEFAULT_LABEL_COLOR = '#FF00FF';

export const getPrimaryLabelTextColor = (lastPriceMovement: PriceMovement, colors: YAxisLabelsColors): string => {
	if (lastPriceMovement === 'down') {
		return colors.lastPrice.textNegative;
	} else if (lastPriceMovement === 'up') {
		return colors.lastPrice.textPositive;
	} else if (lastPriceMovement === 'none') {
		return colors.lastPrice.textSelected;
	} else {
		return colors.lastPrice.textSelected;
	}
};

export const resolveColorForBar = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor = colors.barTheme[`${priceMovement}Color`];
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveColorForLine = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor = colors.lineTheme[`${priceMovement}Color`];
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveColorForCandle = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor = colors.candleTheme[`${priceMovement}Color`];
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveColorForArea = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor = colors.areaTheme.lineColor;
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveColorForScatterPlot = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor = colors.scatterPlot.mainColor;
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveColorForHistogram = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor = colors.histogram[`${priceMovement}Cap`];
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveColorForBaseLine = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor =
		priceMovement === 'up'
			? colors.baseLineTheme.upperSectionStrokeColor
			: colors.baseLineTheme.lowerSectionStrokeColor;
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveColorForTrendAndHollow = (priceMovement: PriceMovement, colors: FullChartColors): string => {
	const resolvedColor = colors.candleTheme[`${priceMovement}WickColor`];
	return resolvedColor ?? DEFAULT_LABEL_COLOR;
};

export const resolveDefaultColorForLabel = (): string => {
	console.warn('Fallback for label default color');
	return DEFAULT_LABEL_COLOR;
};
