/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Price } from './scaling/viewport.model';
import VisualCandle from './visual-candle';
import { BaseHover, HoverProducerPart } from '../inputhandlers/hover-producer.component';
import { ChartModel } from '../components/chart/chart.model';

export interface CandleHover {
	readonly visualCandle: VisualCandle;
	readonly high: number;
	readonly low: number;
	readonly open: number;
	readonly close: number;
	readonly volume: number;
	readonly highY: number;
	readonly lowY: number;
	readonly openY: number;
	readonly closeY: number;
	readonly closestOHLCY: number;
	readonly highFormatted: string;
	readonly lowFormatted: string;
	readonly openFormatted: string;
	readonly closeFormatted: string;
}

class CandleHoverImpl implements CandleHover {
	constructor(
		public visualCandle: VisualCandle,
		private price: number,
		private priceFormatter: (price: Price) => string,
		private toY: (price: Price) => number,
	) {}
	get high(): Price {
		return this.visualCandle.high;
	}
	get low(): Price {
		return this.visualCandle.low;
	}
	get open(): Price {
		return this.visualCandle.open;
	}
	get close(): Price {
		return this.visualCandle.close;
	}
	get volume(): number {
		return this.visualCandle.candle.volume;
	}
	get openY(): number {
		return this.toY(this.open);
	}
	get closeY(): number {
		return this.toY(this.close);
	}
	get highY(): number {
		return this.toY(this.high);
	}
	get lowY(): number {
		return this.toY(this.low);
	}
	get openFormatted(): string {
		return this.priceFormatter(this.open);
	}
	get closeFormatted(): string {
		return this.priceFormatter(this.close);
	}
	get highFormatted(): string {
		return this.priceFormatter(this.high);
	}
	get lowFormatted(): string {
		return this.priceFormatter(this.low);
	}
	get closestOHLCY(): number {
		return this.toY(
			[this.close, this.open, this.high, this.low].sort(
				(a, b) => Math.abs(a - this.price) - Math.abs(b - this.price),
			)[0],
		);
	}
}

export class CandleHoverProducerPart implements HoverProducerPart<CandleHover | undefined> {
	constructor(private chartModel: ChartModel) {}
	/**
	 * Returns a CandleHover object or undefined based on the provided BaseHover object.
	 * @param {BaseHover} hover - The BaseHover object containing the x and y coordinates.
	 * @returns {CandleHover | undefined} - The CandleHover object or undefined if mainSeriesCandle is falsy.
	 */
	getData(hover: BaseHover): CandleHover | undefined {
		const { x, y } = hover;
		const candle = this.chartModel.candleFromX(x);
		const idx = candle.idx || 0;
		const mainSeriesCandle = this.chartModel.getVisualCandle(idx);
		const price = this.chartModel.priceFromY(y);
		const candleHover =
			mainSeriesCandle &&
			new CandleHoverImpl(mainSeriesCandle, price, this.chartModel.pane.regularFormatter, this.chartModel.toY);
		return candleHover;
	}
}
