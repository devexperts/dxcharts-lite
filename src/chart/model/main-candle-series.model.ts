/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartBaseModel } from '../components/chart/chart-base.model';
import { ChartInstrument } from '../components/chart/chart.component';
import { CandleWidthCalculator, VisualCandleCalculator } from '../components/chart/chart.model';
import { YExtentComponent } from '../components/pane/extent/y-extent-component';
import EventBus from '../events/event-bus';
import { CandleSeriesColors, CandleSeriesModel } from './candle-series.model';
import { Candle } from './candle.model';
import { DataSeriesType } from './data-series.config';
import { ScaleModel } from './scale.model';
import VisualCandle from './visual-candle';

/**
 * This model represents main chart data series and is highly tied to chartBaseModel, @see ChartBaseModel
 */
export class MainCandleSeriesModel extends CandleSeriesModel {
	constructor(
		private readonly baseModel: ChartBaseModel<'candle'>,
		extentComponent: YExtentComponent,
		id: number,
		eventBus: EventBus,
		scaleModel: ScaleModel,
		instrument: ChartInstrument,
		candlesTransformersByChartType: Partial<Record<DataSeriesType, VisualCandleCalculator>>,
		candleWidthByChartType: Partial<Record<DataSeriesType, CandleWidthCalculator>>,
		colors: CandleSeriesColors,
	) {
		super(
			extentComponent,
			id,
			eventBus,
			scaleModel,
			instrument,
			candlesTransformersByChartType,
			candleWidthByChartType,
			colors,
		);
	}

	set visualPoints(candles: VisualCandle[] | VisualCandle[][]) {
		super.visualPoints = candles;
		// super.visualPoints will transform 2D array if necessary to 1D array
		this.baseModel.mainVisualPoints = super.visualPoints;
	}

	get visualPoints(): VisualCandle[] {
		return super.visualPoints;
	}

	set dataPoints(candles: Candle[] | Candle[][]) {
		super.dataPoints = candles;
		this.baseModel.mainDataPoints = super.dataPoints;
	}

	get dataPoints(): Candle[] {
		return super.dataPoints;
	}

	public recalculateMeanCandleWidth(visualCandles: VisualCandle[]) {
		super.recalculateMeanCandleWidth(visualCandles);
		this.baseModel.meanDataWidth = this.meanCandleWidth;
	}
}
