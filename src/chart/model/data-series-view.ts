/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { PriceAxisType } from '../components/labels_generator/numeric-axis-labels.generator';
import { binarySearch } from '../utils/array.utils';
import { DataSeriesModel } from './data-series.model';
import { ScaleModel } from './scale.model';
import {
	Index,
	Pixel,
	Price,
	Unit,
	Viewable,
	calcLogValue,
	logValueToUnit,
	percentToUnit,
	unitToPercent,
} from './scaling/viewport.model';

class PercentScaleAnimationHandler {
	private initialBaseline?: number;
	private targetBaseline?: number;
	private prevAnimationId = '';

	constructor(private scaleModel: ScaleModel, private dataSeries: DataSeriesModel) {}

	/**
	 * This logic calculates correct baseline helping avoid shaking during zoom animation
	 * @param getBaseLine
	 * @returns
	 */
	public getBaselineForPercent(getBaseLine: (idx?: Index) => Unit) {
		const animation = this.scaleModel.currentAnimation;
		let baseline: number;
		if (animation?.animationInProgress) {
			if (animation.id !== this.prevAnimationId) {
				this.initialBaseline = undefined;
				this.targetBaseline = undefined;
				this.prevAnimationId = animation.id;
			}
			const easedProgress = animation.easingFn(animation.getProgress());
			if (this.initialBaseline === undefined) {
				this.initialBaseline = getBaseLine(
					binarySearch(this.dataSeries.visualPoints, animation.xStart, i => i.centerUnit).index,
				);
			}
			if (this.targetBaseline === undefined) {
				this.targetBaseline = getBaseLine(
					binarySearch(
						this.dataSeries.visualPoints,
						animation.animationConfig.targetXStart,
						i => i.centerUnit,
					).index,
				);
			}
			baseline = this.initialBaseline + (this.targetBaseline - this.initialBaseline) * easedProgress;
		} else {
			baseline = getBaseLine();
		}
		return baseline;
	}
}

/**
 * A class representing a view for a data series chart.
 * It contains methods to convert between price values and pixel coordinates using the selected scale model,
 * as well as between price values and units based on the selected price type and axis type.
 */
export class DataSeriesView implements Viewable {
	private percentAnimationHandler: PercentScaleAnimationHandler;

	constructor(
		private dataSeries: DataSeriesModel,
		private scaleModel: ScaleModel,
		private getAxisType: () => PriceAxisType,
		private getBaseLine: (idx?: Index) => Unit,
	) {
		this.percentAnimationHandler = new PercentScaleAnimationHandler(this.scaleModel, this.dataSeries);
	}

	/**
	 * Convert the input value to its corresponding y-pixel coordinate based on the selected price type and scale model.
	 * @param value - The value to be converted to y-pixel coordinate.
	 * @returns - The converted value in y-pixel coordinate.
	 */
	toY = (value: Price): Pixel => {
		return this.scaleModel.toY(this.toAxisUnits(value));
	};

	/**
	 * Convert the input value to the corresponding unit based on the current axis type.
	 * @param value - The value to be converted to unit.
	 * @param getBaseLine - A function that returns the baseline for percent.
	 * @returns - The converted value in the corresponding unit.
	 */
	toAxisUnits(value: Price, getBaseLine = this.getBaseLine): Unit {
		switch (this.getAxisType()) {
			case 'percent':
				const baseline = this.percentAnimationHandler.getBaselineForPercent(getBaseLine);
				return unitToPercent(value, baseline);
			case 'logarithmic':
				return calcLogValue(value);
			case 'regular':
				return value;
		}
	}

	/**
	 * Convert the input unit to its corresponding x-pixel coordinate based on the scale model.
	 * @param unit - The unit to be converted to x-pixel coordinate.
	 * @returns - The converted value in x-pixel coordinate.
	 */
	toX = (unit: Unit): Pixel => this.scaleModel.toX(unit);

	xPixels = (unit: Unit): Pixel => this.scaleModel.xPixels(unit);
	/**
	 * Pay attention! This method doesn't convert price to pixels, it converts only current axis UNITs!
	 * @param unit
	 */
	yPixels = (unit: Unit): Pixel => this.scaleModel.yPixels(unit);

	/**
	 * Converts "y" in pixels to price
	 * @param y - source value in pixels
	 */
	priceFromY(y: Pixel): Price {
		const unit = this.scaleModel.fromY(y);
		return this.fromAxisUnits(unit);
	}

	/**
	 * Convert the input unit to its corresponding price value based on the selected axis type.
	 * @param {number} unit - The unit to be converted to price value.
	 * @returns {number} - The converted value in price.
	 */
	fromAxisUnits(unit: Unit): Price {
		switch (this.getAxisType()) {
			case 'percent':
				return percentToUnit(unit, this.getBaseLine());
			case 'logarithmic':
				return logValueToUnit(unit);
			case 'regular':
				return unit;
		}
	}
}
