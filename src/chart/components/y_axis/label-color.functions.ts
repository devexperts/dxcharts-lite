/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { PriceMovement } from '../../model/candle-series.model';
import { FullChartColors, YAxisConfig, YAxisLabelsColors } from '../../chart.config';
import { getLabelTextColorByBackgroundColor } from '../../utils/canvas/canvas-text-functions.utils';

export const DEFAULT_LABEL_COLOR = '#FF00FF';

export function getPlainLabelTextColor(
	colorsConfig: FullChartColors,
	textColor: string,
	invertedTextColor: string,
	yAxisState: YAxisConfig,
) {
	// `plain` label is transparent, so to calculate text color
	// we need to go down to draw hierarchy
	// the next is YAxis bg color
	const yAxisBGColor = colorsConfig.yAxis.backgroundColor;

	// if yAxis bg color is transparent, then we need to check chart area background color
	const plainChartBGColor = colorsConfig.chartAreaTheme.backgroundColor;
	// when chart area bg color is gradient, then we need to check which side yAxis is drawn
	// because color on the right side and left side is different
	const leftChartBGColor = colorsConfig.chartAreaTheme.backgroundGradientTopColor;
	const rightChartBGColor = colorsConfig.chartAreaTheme.backgroundGradientBottomColor;
	const gradientChartBGColor = yAxisState.align === 'left' ? leftChartBGColor : rightChartBGColor;
	const chartBGColor =
		colorsConfig.chartAreaTheme.backgroundMode === 'gradient' ? gradientChartBGColor : plainChartBGColor;

	const bgColor = yAxisBGColor === 'transparent' ? chartBGColor : yAxisBGColor;

	return getLabelTextColorByBackgroundColor(bgColor, textColor, invertedTextColor);
}

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
