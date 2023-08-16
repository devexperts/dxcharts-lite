/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable, Subject } from 'rxjs';
import { Percent, Pixel, Unit, logValueToUnit, percentToUnit, calcLogValue } from '../../model/scaling/viewport.model';
import { AnimationFrameCache } from '../../utils/perfomance/animation-frame-cache.utils';
import { identity } from '../../utils/function.utils';
import { MathUtils } from '../../utils/math.utils';
import { PriceIncrementsUtils } from '../../utils/price-increments.utils';

export type PriceAxisType = 'regular' | 'percent' | 'logarithmic';

const PIXEL_OFFSET = 0;
const DEFAULT_REGULAR_INCREMENT = 0.01;

export interface LabelsGenerator {
	readonly observeLabelsChanged: () => Observable<NumericAxisLabel[]>;
}

/**
 * Generator of axes labels.
 */
export class NumericAxisLabelsGenerator implements LabelsGenerator {
	/**
	 *    Multipliers which are using for price increments to
	 *    calculate horizontal grid and price lines step.
	 */
	private gridDistanceMultipliers = [2, 4, 5, 10];

	labelsCache: AnimationFrameCache<Array<NumericAxisLabel>>;

	lastSingleLabelHeightValue: number = 0;
	distanceBetweenLabelsChangeSubject = new Subject<Array<Array<NumericAxisLabel>>>();
	newGeneratedLabelsSubject = new Subject<NumericAxisLabel[]>();

	// optimization to not recalculate labels on same viewport
	// TODO rework, generate 1-2 screens outside viewport as well
	private lastStart: number = 0;
	private lastEnd: number = 0;

	constructor(
		private increment: number | null,
		private startEndProvider: () => [Unit, Unit],
		private lengthProvider: () => Unit,
		public valueFormatter: (value: number) => string,
		private withZero: boolean = false,
		protected axisTypeProvider: () => PriceAxisType,
		private baseLineProvider: () => number,
		private labelFilter: (labels: NumericAxisLabel[]) => NumericAxisLabel[] = identity,
		private singleLabelHeightPixels: number = 23,
	) {
		this.labelsCache = new AnimationFrameCache(() => this.labelFilter(this.doGenerateLabels()));
	}

	private generateRegularLabels(min: Unit, max: Unit, singleLabelHeightValue: number): NumericAxisLabel[] {
		const newLabels: NumericAxisLabel[] = [];
		this.withZero && newLabels.push({ value: 0, text: '0' });
		let value = MathUtils.roundToNearest(min, singleLabelHeightValue);
		while (value < max) {
			// Adjust value to increment
			const adjustedValue = MathUtils.roundToNearest(value, singleLabelHeightValue);
			const labelText = this.valueFormatter(adjustedValue);
			newLabels.push({
				value: adjustedValue,
				text: labelText,
			});
			value = MathUtils.roundDecimal(value + singleLabelHeightValue);
		}
		return newLabels;
	}

	private generatePercentLabels(min: Unit, max: Unit, singleLabelHeightValue: number): NumericAxisLabel[] {
		const newLabels: NumericAxisLabel[] = [];
		const baseLine = this.baseLineProvider();
		let value: Percent = MathUtils.roundToNearest(min, singleLabelHeightValue);
		while (value < max) {
			// Adjust value to increment
			const adjustedValue = MathUtils.roundToNearest(value, singleLabelHeightValue);
			const valueUnit = percentToUnit(adjustedValue, baseLine);
			const labelText = this.valueFormatter(valueUnit);
			newLabels.push({
				value: adjustedValue,
				text: labelText,
			});
			value = MathUtils.roundDecimal(value + singleLabelHeightValue);
		}
		return newLabels;
	}

	private generateLogarithmLabels(min: Unit, max: Unit, singleLabelHeightValue: number): NumericAxisLabel[] {
		const newLabels: NumericAxisLabel[] = [];
		let value = MathUtils.roundToNearest(min, singleLabelHeightValue);
		while (value < max) {
			const realValue = logValueToUnit(value);
			const labelText = this.valueFormatter(realValue);
			newLabels.push({
				value,
				text: labelText,
			});
			value = MathUtils.roundDecimal(value + singleLabelHeightValue);
		}
		return newLabels;
	}

	public doGenerateLabels(): NumericAxisLabel[] {
		const lengthPixels = this.lengthProvider();
		if (lengthPixels <= 0) {
			return [];
		}

		const [min, max] = this.calculateMinMax();
		const axisStep = this.getAxisStep(min, max, lengthPixels);

		if (!this.lastSingleLabelHeightValue) {
			this.lastSingleLabelHeightValue = axisStep;
		}

		let newLabels: NumericAxisLabel[];
		const axisType = this.axisTypeProvider();
		if (axisType === 'logarithmic') {
			newLabels = this.generateLogarithmLabels(min, max, axisStep);
		} else if (axisType === 'percent') {
			newLabels = this.generatePercentLabels(min, max, axisStep);
		} else {
			newLabels = this.generateRegularLabels(min, max, axisStep);
		}

		if (this.lastSingleLabelHeightValue !== axisStep && this.labelsCache.cache) {
			const currentLabels = this.labelsCache.getLastCachedValue() ?? [];
			this.distanceBetweenLabelsChangeSubject.next([currentLabels, newLabels]);
			this.lastSingleLabelHeightValue = axisStep;
		}

		this.newGeneratedLabelsSubject.next(newLabels);

		return newLabels;
	}

	private calculateMinMax(): [number, number] {
		const [min, max] = this.startEndProvider();
		const lengthPixels = this.lengthProvider();
		const labelBounds = NumericAxisLabelsGenerator.getLabelBounds(min, max, lengthPixels);
		return [labelBounds[0], labelBounds[1]];
	}

	private getAxisStep(min: Unit, max: Unit, lengthPixels: Pixel): Unit {
		const valueRange = max - min;

		const labelsCount = lengthPixels / this.singleLabelHeightPixels;

		const increment = this.calculateIncrement(valueRange);
		const singleLabelHeightValue: Unit = valueRange / labelsCount;
		return this.calculateAxisStep(singleLabelHeightValue, increment);
	}

	observeDistanceBetweenLabelsChanged() {
		return this.distanceBetweenLabelsChangeSubject.asObservable();
	}

	public observeLabelsChanged() {
		return this.newGeneratedLabelsSubject.asObservable();
	}

	protected calculateIncrement(valueLength: number): Unit {
		// provided increment
		if (this.increment) {
			return this.increment;
		}
		// auto-generated increment
		if (!isNaN(valueLength)) {
			const calculatedIncrement = PriceIncrementsUtils.autoDetectIncrementOfValueRange(valueLength);
			return this.adjustIncrementOnAxisType(calculatedIncrement);
		}
		return this.adjustIncrementOnAxisType(DEFAULT_REGULAR_INCREMENT);
	}

	protected adjustIncrementOnAxisType(increment: number) {
		switch (this.axisTypeProvider()) {
			case 'percent':
				return increment;
			case 'logarithmic':
				const [logMin] = this.calculateMinMax();
				const regularMin = logValueToUnit(logMin);
				const regularIncrementedValue = regularMin + increment;
				const incrementedLogValue = calcLogValue(regularIncrementedValue);
				return incrementedLogValue - logMin;
			case 'regular':
				return increment;
		}
	}

	// TODO rework, generator should act as model and update itself on scaleChanged
	// TODO this should be called 1-2 times and very rarely, there should be 1-3 viewport of labels
	public generateNumericLabels(): Array<NumericAxisLabel> {
		const [start, end] = this.startEndProvider();
		if (start !== this.lastStart || end !== this.lastEnd) {
			this.labelsCache.invalidate();
		}

		this.lastStart = start;
		this.lastEnd = end;
		return this.labelsCache.calculateOrGet();
	}
	private static getLabelBounds(start: number, end: number, lengthPixels: number): number[] {
		const offset = Math.abs((end - start) * (PIXEL_OFFSET / lengthPixels));
		return [start - offset, end + offset];
	}

	/**
	 * Calculates the distance between two axis labels as:
	 *  - Take increment (0.01 for price or 1 for natural number);
	 *  - Take step which was calculated as (chart height / max lines count provided by config (or default 10));
	 *  - Multiplying increment with gridDistanceMultipliers until it will greater then step
	 * @param step
	 * @param increment
	 */
	private calculateAxisStep(step: Unit, increment: Unit): number {
		if (increment === 0) {
			console.error('NumericAxisLabelsGenerator failed at calculateAxisStep: increment = 0');
			return 0;
		}
		let distance = increment;
		let currentNumberOrder = increment;
		let multipliersPointer = 0;

		while (distance < step && distance > 0) {
			if (multipliersPointer >= this.gridDistanceMultipliers.length) {
				multipliersPointer = 0;
				currentNumberOrder *= 10;
			}

			distance = currentNumberOrder * this.gridDistanceMultipliers[multipliersPointer++];
		}

		return distance;
	}
}

export interface NumericAxisLabel {
	// textual label: 124.00 or 84.5
	text: string;
	// actual value: 124.00321 or 84.53221
	value: Unit;
}
