/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { YAxisConfig } from '../../../chart.config';
import { DataSeriesModel } from '../../../model/data-series.model';
import { Unit, unitToPercent } from '../../../model/scaling/viewport.model';
import { MathUtils, replaceMinusSign } from '../../../utils/math.utils';
import { PriceIncrementsUtils } from '../../../utils/price-increments.utils';
import { MINUS_SIGN } from '../../../utils/symbol-constants';
import { YExtentComponent } from '../../pane/extent/y-extent-component';
import { YExtentFormatters } from '../../pane/pane.component';
import { treasuryPriceFormatter } from './treasury-price.formatter';

export const createRegularPriceFormatter =
	(extent: YExtentComponent, config: YAxisConfig) =>
	(value: unknown, shouldAddSeparators: boolean = false): string => {
		let checkedValue: number;
		if (typeof value === 'number') {
			checkedValue = value;
		} else if (typeof value === 'string') {
			checkedValue = Number(value);
		} else {
			return '—';
		}
		const separators = extent.paneComponent.intlFormatter;

		const formatWithIntlSeparators = (precision: number): string => {
			return MathUtils.makeDecimal(
				checkedValue,
				precision,
				separators.decimalSeparator,
				separators.thousandsSeparator,
			);
		};

		const treasuryFormatConfig = config.treasuryFormat;
		if (treasuryFormatConfig && treasuryFormatConfig.enabled) {
			return treasuryPriceFormatter(
				checkedValue,
				shouldAddSeparators ? separators.thousandsSeparator : undefined,
			);
		}

		const [mainDataSeries] = extent.dataSeries;
		if (mainDataSeries !== undefined) {
			const precision = PriceIncrementsUtils.getPricePrecision(checkedValue, mainDataSeries.pricePrecisions);
			if (shouldAddSeparators && Math.abs(checkedValue) >= 1000) {
				return formatWithIntlSeparators(precision);
			}
			return checkedValue.toFixed(precision);
		}
		return `${checkedValue}`;
	};

export const createPercentFormatter =
	(extent: YExtentComponent) =>
	(value: Unit, dataSeries?: DataSeriesModel): string => {
		if (value === 0) {
			return '0.00 %';
		}
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
