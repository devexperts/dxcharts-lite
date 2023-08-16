/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { notEmpty } from '../../../utils/function.utils';

export interface FormattedYCoordinate {
	bottom: number;
	top: number;
	labelWeight: number;
	actualIndex: number;
}

export interface PositionAndWeight {
	y: number;
	weight: number;
}

export interface BoundsForLabelsCalculator {
	top: number;
	bottom: number;
}

/**
 * Calculates the Y coordinates for the labels of a chart based on the provided points and label height.
 * @param {PositionAndWeight[]} points - An array of objects containing the position and weight of each point.
 * @param {number} labelHeight - The height of the label.
 * @returns {number[]} An array of Y coordinates for the labels.
 * @doc-tags tricky
 */
export function calcLabelsYCoordinates(points: PositionAndWeight[], labelHeight: number): number[] {
	if (points.filter(it => it !== null).length <= 1) {
		return points.map(p => p.y);
	}

	const adjustedLabelHeight = labelHeight - 2; // -2 to remove paddings between labels

	const formattedCoordinates = points
		.map((point, index) => toLabel(point, index, adjustedLabelHeight))
		.filter(notEmpty)
		.sort(sortLabels); // sort labels in ascending order, top -> down
	const newCoordinates: number[] = new Array(formattedCoordinates.length);
	formattedCoordinates.forEach((current, idx) => {
		if (current === null) {
			return;
		}
		const next = formattedCoordinates[idx + 1];
		if (next && next.top < current.bottom) {
			/**
			 * adjust padding if weight diff is 1, used for countdown label padding
			 * @doc-tags tricky
			 */
			const paddingAdjust = next.labelWeight - current.labelWeight === 1 ? 2 : 0;
			const delta = current.bottom - next.top + paddingAdjust;
			next.top += delta;
			next.bottom += delta;
		}
		newCoordinates[current.actualIndex] = (current.top + current.bottom) / 2;
	});
	return newCoordinates;
}

const toLabel = (point: PositionAndWeight, index: number, labelHeight: number): FormattedYCoordinate | null =>
	point
		? {
				top: point.y - labelHeight / 2,
				bottom: point.y + labelHeight / 2,
				labelWeight: point.weight,
				actualIndex: index,
		  }
		: null;

const sortLabels = (a: FormattedYCoordinate, b: FormattedYCoordinate) => {
	const aVal = a.top;
	const bVal = b.top;
	if (aVal > bVal) {
		return 1;
	}
	if (aVal < bVal || (aVal === bVal && a.labelWeight < b.labelWeight)) {
		return -1;
	}
	return 0;
};
