/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel } from '../../model/data-series.model';
import { ViewportModel } from '../../model/scaling/viewport.model';
import { lastOf } from '../../utils/array.utils';
import { precisionsToIncrement } from '../../utils/price-increments.utils';
import { NumericAxisLabelsGenerator, PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';

/**
 * Y axis labels generator for prices. Respects price increment from instrument.
 */
export class NumericYAxisLabelsGenerator extends NumericAxisLabelsGenerator {
	constructor(
		increment: number | null,
		private dataSeriesProvider: () => DataSeriesModel | undefined,
		viewportModel: ViewportModel,
		valueFormatter: (value: number) => string,
		axisTypeProvider: () => PriceAxisType = () => 'regular',
		singleLabelHeightPixels: number = 23,
	) {
		super(
			increment,
			() => [viewportModel.yStart, viewportModel.yEnd],
			() => viewportModel.getBounds().height,
			valueFormatter,
			false,
			axisTypeProvider,
			() => dataSeriesProvider()?.getBaseline() ?? 1,
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
		const dataSeries = this.dataSeriesProvider();
		if (dataSeries) {
			const lastCandle = lastOf(dataSeries.dataPoints);
			const priceIncrementBasis = lastCandle?.close ?? 0;
			const increment = precisionsToIncrement(priceIncrementBasis, dataSeries.pricePrecisions);
			return this.adjustIncrementOnAxisType(increment);
		}
		// auto-generated increment
		return super.calculateIncrement(valueLength);
	}
}
