/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { YAxisConfig } from '../../../chart.config';
import { DataSeriesModel } from '../../../model/data-series.model';
import { Unit, unitToPercent } from '../../../model/scaling/viewport.model';
import { replaceMinusSign } from '../../../utils/math.utils';
import { PriceIncrementsUtils } from '../../../utils/price-increments.utils';
import { MINUS_SIGN } from '../../../utils/symbol-constants';
import { YExtentComponent } from '../../pane/extent/y-extent-component';
import { YExtentFormatters } from '../../pane/pane.component';
import { treasuryPriceFormatter } from './treasury-price.formatter';

export const createRegularPriceFormatter =
	(extent: YExtentComponent, config: YAxisConfig) =>
	(value: unknown): string => {
		let checkedValue: number;
		if (typeof value === 'number') {
			checkedValue = value;
		} else if (typeof value === 'string') {
			checkedValue = Number(value);
		} else {
			return '—';
		}

		const treasuryFormatConfig = config.treasuryFormat;
		if (treasuryFormatConfig && treasuryFormatConfig.enabled) {
			return treasuryPriceFormatter(checkedValue);
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
			valueUnit = unitToPercent(value, series.getBaseline());
		}
		// always apply default precision for percent
		const formatted = replaceMinusSign(valueUnit.toFixed(PriceIncrementsUtils.DEFAULT_PRECISION)) + ' %';
		return formatted === `${MINUS_SIGN}0.00 %` ? '0.00 %' : formatted;
	};

export const createYExtentFormatters = (extent: YExtentComponent, config: YAxisConfig): YExtentFormatters => ({
	percent: createPercentFormatter(extent),
	regular: createRegularPriceFormatter(extent, config),
});
