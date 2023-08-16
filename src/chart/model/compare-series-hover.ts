/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartModel } from '../components/chart/chart.model';
import { BaseHover, HoverProducerPart } from '../inputhandlers/hover-producer.component';

export interface CompareSeriesHover {
	instrument: string;
	price: string;
	id: number;
}

export class CompareSeriesHoverProducerPart implements HoverProducerPart<CompareSeriesHover[]> {
	constructor(private chartModel: ChartModel) {}

	/**
	 * Returns an array of objects containing information about the series of candles at a specific x-coordinate.
	 * @param {BaseHover} hover - The hover object containing the x-coordinate.
	 * @returns {CompareSeriesHover[]} An array of objects containing the instrument symbol, price and id of each series of candles.
	 */
	getData(hover: BaseHover): CompareSeriesHover[] {
		const { x } = hover;

		const candle = this.chartModel.candleFromX(x);
		const idx = candle.idx || 0;
		const compareSeriesHover = this.chartModel.candleSeries.map(series => {
			const candleSecondary = series.dataPoints[idx];
			const priceToShow = this.chartModel.pane.regularFormatter(candleSecondary?.close);
			return {
				instrument: series.instrument.symbol,
				price: priceToShow,
				id: series.id,
			};
		});

		return compareSeriesHover;
	}
}
