/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../chart.config';
import { DateTimeFormatterFactory } from '../../model/date-time.formatter';
import { CanvasTextProperties, getTextBounds, getTextLines } from '../../utils/canvas/canvas-text-functions.utils';

/**
 * Calculates the bounds of a time label based on the provided timestamp, formatterFactory, and config.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} timestamp - The timestamp to be formatted.
 * @param {DateTimeFormatterFactory} formatterFactory - The factory used to create the formatter for the timestamp.
 * @param {FullChartConfig} config - The configuration object for the chart.
 * @returns {[number, number]} - An array containing the width and height of the time label, including padding.
 */
export function calcTimeLabelBounds(
	ctx: CanvasRenderingContext2D,
	timestamp: number,
	formatterFactory: DateTimeFormatterFactory,
	config: FullChartConfig,
): [number, number] {
	const timeLabelsConfig = config.components.navigationMap.timeLabels;
	const paddings = timeLabelsConfig.padding;
	const textWithCR = getFormattedTimeLabel(timestamp, timeLabelsConfig.dateFormat, formatterFactory);
	const textLines = getTextLines(textWithCR);
	const textProperties: CanvasTextProperties = {
		textFontFamily: timeLabelsConfig.fontFamily,
		textSize: `${timeLabelsConfig.fontSize}px`,
	};
	const [textWidth, textHeight] = getTextBounds(ctx, textLines, textProperties);
	return [textWidth + paddings.x * 2, textHeight + paddings.y * 2];
}

/**
 * Returns a formatted time label.
 *
 * @param {number} timestamp - The timestamp to format.
 * @param {string} format - The format to use for the timestamp.
 * @param {DateTimeFormatterFactory} formatterFactory - The factory function to create a formatter for the given format.
 * @returns {string} The formatted time label with line breaks instead of spaces.
 */
export function getFormattedTimeLabel(
	timestamp: number,
	format: string,
	formatterFactory: DateTimeFormatterFactory,
): string {
	const text = formatterFactory(format)(timestamp);
	return text.split(' ').join('\n');
}
