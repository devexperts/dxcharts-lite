/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel } from '../../model/data-series.model';
import { Unit, unitToPercent } from '../../model/scaling/viewport.model';
import { PriceIncrementsUtils } from '../../utils/price-increments.utils';
import { YExtentComponent } from '../pane/extent/y-extent-component';
import { YExtentFormatters } from '../pane/pane.component';

export const createRegularPriceFormatter =
	(extent: YExtentComponent) =>
	(value: unknown): string => {
		let checkedValue: number;
		if (typeof value === 'number') {
			checkedValue = value;
		} else if (typeof value === 'string') {
			checkedValue = Number(value);
		} else {
			return '—';
		}

		const [mainDataSeries] = extent.dataSeries;
		if (mainDataSeries !== undefined) {
			const precision = PriceIncrementsUtils.getPricePrecision(checkedValue, mainDataSeries.pricePrecisions);
			return checkedValue.toFixed(precision);
		}
		return `${checkedValue}`;
	};

export const createPercentFormatter =
	(extent: YExtentComponent) =>
	(value: Unit, dataSeries?: DataSeriesModel): string => {
		const [mainDataSeries] = extent.dataSeries;
		let valueUnit = value;
		const series = dataSeries ?? mainDataSeries;
		if (series !== undefined) {
			valueUnit = unitToPercent(value, series.getBaseLine());
		}
		// always apply default precesion for percent
		const formatted = valueUnit.toFixed(PriceIncrementsUtils.DEFAULT_PRECISION).replace('-', '−') + ' %';
		return formatted === '−0.00 %' ? '0.00 %' : formatted;
	};

export const createYExtentFormatters = (extent: YExtentComponent): YExtentFormatters => ({
	percent: createPercentFormatter(extent),
	regular: createRegularPriceFormatter(extent),
});
