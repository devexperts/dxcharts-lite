/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../../chart.config';
import { ScaleModel } from '../../../model/scale.model';
import { calculateTextWidth } from '../../../utils/canvas/canvas-font-measure-tool.utils';
import { NumericAxisLabel } from '../../labels_generator/numeric-axis-labels.generator';
import { XAxisLabelWeighted } from '../x-axis-labels.generator';
import { XAxisTimeLabelsDrawer } from '../x-axis-time-labels.drawer';
import { ParsedTimeFormat, TimeFormat } from './parser/time-formats.model';

const timeFormatToWeightMap: Record<TimeFormat, number> = {
	lessThanSecond: 0,
	second: 100,
	minute: 200,
	hour: 300,
	day: 400,
	'week-weekday': 500,
	month: 600,
	year: 10000,
};

/**
 * Generates `weight` based on the {@link ParsedTimeFormat}
 * @example
 * const timeFormat: ParsedTimeFormat = {
 *  key: 'day',
 *  value: 15,
 *  exact: false
 * }
 * const weight = getWeightFromTimeFormat(timeFormat); // 415
 */
export const getWeightFromTimeFormat = (format: ParsedTimeFormat) => {
	switch (format.key) {
		case 'second':
		case 'minute':
		case 'hour':
		case 'day':
		case 'month':
		case 'year':
			return timeFormatToWeightMap[format.key] + format.value;
		case 'lessThanSecond':
			return timeFormatToWeightMap[format.key];
		case 'week-weekday':
			return timeFormatToWeightMap[format.key] + (format.week === '$' ? 9 : format.week) + format.weekday * 10;
	}
};

/**
 * Group {@link XAxisLabelWeighted} by `weight` in a `Record<number, XAxisLabelWeighted[]>`
 * @example
 * const groupedLabels = {
 *		601: Array(359),
 *		415: Array(1685),
 *		...
 * 	}
 */
export const groupLabelsByWeight = (weightedLabels: XAxisLabelWeighted[]): Record<number, XAxisLabelWeighted[]> => {
	const labelsGroupedByWeight: Record<number, XAxisLabelWeighted[]> = {};

	weightedLabels.forEach(weightedLabel => {
		const labelsByWeight = labelsGroupedByWeight[weightedLabel.weight];
		if (labelsByWeight === undefined) {
			labelsGroupedByWeight[weightedLabel.weight] = [weightedLabel];
		} else {
			labelsByWeight.push(weightedLabel);
		}
	});

	return labelsGroupedByWeight;
};

/**
 * FilterMap grouped {@link XAxisLabelWeighted} labels by `coverUpLevel` value
 *
 * @see
 * `coverUpLevel` - is a ratio, which tells us how much more space the widest label
 * will take relative to the candle width
 * @example
 * const maxLabelWidthPx = 10;
 * const meanCandleWidthPx = 5;
 * const coverUpLevel = Math.round(10 / 5); // 2
 *
 * // `coverUpLebel = 2` means that label for a candle take `2x` more width
 * // than the candle on the screen for that label.
 * // That kind of fact give us a hint, that we can't draw labels for `i - 1` and `i + 1` candles,
 * // because it wouldn't be enough space (`i` candle label will take all the place).
 * // But we can draw labels for `i - 2` and `i + 2` candles.
 * @see
 * That algorightm do exactly that - it filters out labels (taking in mind its weight, weight is a priority) that couldn't be drawn
 * because there's not enough space for them.
 */
export const filterMapGroupedLabelsByCoverUpLevel = (
	labelsGroupedByWeight: Record<number, XAxisLabelWeighted[]>,
	coverUpLevel: number,
): XAxisLabelWeighted[] => {
	const weights = Object.keys(labelsGroupedByWeight)
		.map(item => parseInt(item, 10))
		.sort((a: number, b: number) => b - a);

	let labels: XAxisLabelWeighted[] = [];

	// TODO: ADD COMMENTS, WE NEED COMMENTS
	for (const weight of weights) {
		const currentWeightLabels = labelsGroupedByWeight[weight];

		if (!currentWeightLabels) {
			continue;
		}

		const previousWeightLabels = [...labels];

		labels = [];

		const previousWeightLabelsLength = previousWeightLabels.length;
		const currentWeightLength = currentWeightLabels.length;

		let previousWeightLabelsPointer = 0;

		let rightIndex = Infinity;
		let leftIndex = -Infinity;

		for (let i = 0; i < currentWeightLength; i++) {
			const mark = currentWeightLabels[i];
			const currentIndex = mark.idx;

			while (previousWeightLabelsPointer < previousWeightLabelsLength) {
				const lastMark = previousWeightLabels[previousWeightLabelsPointer];
				const lastIndex = lastMark.idx;
				if (currentIndex > lastIndex) {
					previousWeightLabelsPointer++;
					labels.push(lastMark);
					leftIndex = lastIndex;
					rightIndex = Infinity;
				} else {
					rightIndex = lastIndex;
					break;
				}
			}
			if (rightIndex - currentIndex >= coverUpLevel && currentIndex - leftIndex >= coverUpLevel) {
				labels.push(mark);
				leftIndex = currentIndex;
			}
		}

		while (previousWeightLabelsPointer < previousWeightLabelsLength) {
			labels.push(previousWeightLabels[previousWeightLabelsPointer]);
			previousWeightLabelsPointer++;
		}
	}
	return labels;
};

/**
 * The function compares 2 labels and checks if they overlap each other
 * @param {CanvasRenderingContext2D} ctx - canvas context
 * @param {FullChartConfig} config - chart config
 * @param {NumericAxisLabel} label - first label to compare
 * @param {NumericAxisLabel} nextLabel - second label to compare
 * @param {ScaleModel} scaleModel - chart scale model
 * @returns
 */
export const overlappingPredicate = (
	ctx: CanvasRenderingContext2D,
	config: FullChartConfig,
	label: NumericAxisLabel,
	nextLabel: NumericAxisLabel,
	scaleModel: ScaleModel,
	overlapingDistance: number,
): boolean => {
	const font = XAxisTimeLabelsDrawer.getFontFromConfig(config);
	const currentLabelTextWidth = calculateTextWidth(label.text, ctx, font);
	const nextLabelTextWidth = calculateTextWidth(nextLabel.text, ctx, font);
	const curPx = scaleModel.toX(label.value) + currentLabelTextWidth / 2;
	const nextPx = scaleModel.toX(nextLabel.value) - nextLabelTextWidth / 2;
	return nextPx - curPx < overlapingDistance;
};
