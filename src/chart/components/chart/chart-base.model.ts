/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { Candle } from '../../model/candle.model';
import { DataSeriesPoint, VisualSeriesPoint } from '../../model/data-series.model';
import { Index, Timestamp } from '../../model/scaling/viewport.model';
import VisualCandle from '../../model/visual-candle';
import { autoDetectPeriod } from '../../utils/auto-period-detector.utils';
import { searchCandleIndex } from '../../utils/candles.utils';
import { fakeVisualCandle, fakeVisualPoint } from './fake-candles';

export type BaseType = 'candle' | 'point';

type DataPoint<T extends BaseType> = T extends 'candle' ? Candle : DataSeriesPoint;
type VisualPoint<T extends BaseType> = T extends 'candle' ? VisualCandle : VisualSeriesPoint;
export interface PrependedCandlesData {
	prependedCandlesWidth: number;
	preparedCandles: Candle[];
}

/**
 * This model is an abstraction which describes manipulations tied to the main data series.
 * For example, all x-scale is based on the main data series. If we add a new data series, we need to match its coordinates to the main data series.
 */
export class ChartBaseModel<T extends BaseType = 'point'> {
	public mainDataPoints: DataPoint<T>[] = [];
	public mainVisualPoints: VisualPoint<T>[] = [];
	public readonly dataUpdatedSubject: Subject<void> = new Subject<void>();
	public readonly dataSetSubject: Subject<void> = new Subject<void>();
	public readonly dataRemovedSubject: Subject<void> = new Subject<void>();
	public readonly dataPrependSubject: Subject<PrependedCandlesData> = new Subject<PrependedCandlesData>();

	/**
	 * Mean data point width in abstract units.
	 */
	public meanDataWidth = 1;

	/**
	 * Candles aggregation period in ms. Required for future candles calculation.
	 */
	public period = 1;

	constructor(public type: T) {}

	/**
	 * For given timestamp finds the closest candle in dataset.
	 * @param timestamp
	 */
	// TODO think how to make this function like candleFromX
	public dataFromTimestamp(timestamp: Timestamp, shouldExtrapolate: boolean = true): VisualPoint<T> {
		const result = searchCandleIndex(timestamp, shouldExtrapolate, this.mainDataPoints, this.period);
		return this.dataFromIdx(result.index);
	}

	/**
	 * Recalculates the period of the main candle series based on the data points.
	 * If a period is detected, it is set as the new period.
	 */
	recalculatePeriod() {
		const naivePeriod = autoDetectPeriod(this.mainDataPoints);
		if (naivePeriod) {
			this.period = naivePeriod;
		}
	}

	/**
	 * For given index returns the closest visual candle, or fake candle with correct X coordinate.
	 * @param idx - index of candle
	 */
	public dataFromIdx(idx: Index): VisualPoint<T> {
		const vc = this.mainVisualPoints[idx];
		if (vc) {
			return vc;
		}
		// TODO think maybe to create fake candles in advance, maybe this will improve performance
		if (this.type === 'candle') {
			// TODO how to correctly infer type?
			// @ts-ignore
			return fakeVisualCandle(this.mainDataPoints, this.mainVisualPoints, this.meanDataWidth, idx, this.period);
		} else {
			// @ts-ignore
			return fakeVisualPoint(this.mainDataPoints, this.mainVisualPoints, this.meanDataWidth, idx, this.period);
		}
	}
}
