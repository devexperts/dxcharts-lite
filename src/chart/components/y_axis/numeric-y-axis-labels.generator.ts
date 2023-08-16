/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartModel } from '../chart/chart.model';
import { PriceIncrementsUtils } from '../../utils/price-increments.utils';
import { NumericAxisLabelsGenerator, PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';
import { ViewportModel } from '../../model/scaling/viewport.model';
import { lastOf } from '../../utils/array.utils';

/**
 * Y axis labels generator for prices. Respects price increment from instrument.
 */
export class NumericYAxisLabelsGenerator extends NumericAxisLabelsGenerator {
	constructor(
		increment: number | null,
		private chartModel: ChartModel | undefined,
		viewportModel: ViewportModel,
		valueFormatter: (value: number) => string,
		axisTypeProvider: () => PriceAxisType = () => 'regular',
		baseLineProvider = () => 1,
		singleLabelHeightPixels: number = 23,
	) {
		super(
			increment,
			() => [viewportModel.yStart, viewportModel.yEnd],
			() => viewportModel.getBounds().height,
			valueFormatter,
			false,
			axisTypeProvider,
			baseLineProvider,
			undefined,
			singleLabelHeightPixels,
		);
	}

	public getLargestLabel(): string {
		return (this.labelsCache.getLastCachedValue() ?? []).reduce(
			(maxLengthText, label) => (label.text.length > maxLengthText.length ? label.text : maxLengthText),
			'',
		);
	}

	/**
	 * Calculates the increment to be used on the chart axis based on the length of the value and the instrument's price increments.
	 * @param {number} valueLength - The length of the value.
	 * @returns {number} - The calculated increment.
	 */
	protected calculateIncrement(valueLength: number): number {
		const instrument = this.chartModel?.mainCandleSeries.instrument;
		// increment from instrument
		if (this.chartModel && instrument && Array.isArray(instrument.priceIncrements)) {
			const lastCandle = lastOf(this.chartModel.getCandles());
			const priceIncrementBasis = lastCandle && lastCandle.close ? lastCandle.close : 0;
			const increment = PriceIncrementsUtils.getPriceIncrement(priceIncrementBasis, instrument.priceIncrements);
			return this.adjustIncrementOnAxisType(increment);
		}
		// auto-generated increment
		return super.calculateIncrement(valueLength);
	}
}
