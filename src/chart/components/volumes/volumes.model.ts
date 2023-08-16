/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject, merge } from 'rxjs';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import VisualCandle from '../../model/visual-candle';
import { HighLowProvider } from '../../model/scaling/auto-scale.model';
import { Unit } from '../../model/scaling/viewport.model';
import { ChartComponent } from '../chart/chart.component';
import { firstOf, maxMin } from '../../utils/array.utils';

const volumeMaxMinFn = maxMin<VisualCandle>(candle => candle.candle.volume);

export class VolumesModel extends ChartBaseElement {
	// max volume in all data series
	volumeMax = new BehaviorSubject<Unit>(0);
	highLowProvider: HighLowProvider = {
		calculateHighLow: () => ({ high: this.volumeMax.getValue(), low: 0 }),
		isHighLowActive: () => true,
	};
	constructor(private chartComponent: ChartComponent, private scaleModel: ScaleModel) {
		super();
	}

	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			merge(this.chartComponent.chartModel.observeCandlesChanged(), this.scaleModel.xChanged).subscribe(() =>
				this.updateVolumeMax(),
			),
		);
		this.addRxSubscription(
			this.chartComponent.chartModel.mainCandleSeries
				.observeLastVisualCandleChanged()
				.subscribe(() => this.recalculateLastVisualVolume()),
		);
	}

	/**
	 * Used for optimization when we have to update only the last candle
	 * Doesn't work for line chart types
	 * @doc-tags tricky
	 */
	private recalculateLastVisualVolume() {
		// TODO rework, move this logic to drawer
	}

	/**
	 * Updates the maximum volume value of the chart.
	 * @function
	 * @name updateVolumeMax
	 * @memberof ChartComponent
	 * @returns {void}
	 */
	updateVolumeMax() {
		this.volumeMax.next(
			firstOf(volumeMaxMinFn(this.chartComponent.chartModel.mainCandleSeries.getSeriesInViewport().flat())) ?? 0,
		);
	}
}
