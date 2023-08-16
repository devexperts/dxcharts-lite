/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../../chart.config';
import { CandleSeriesModel } from '../../../model/candle-series.model';
import { DataSeriesType } from '../../../model/data-series.config';
import { ChartModel, LastCandleLabelHandler } from '../../chart/chart.model';
import { getPrimaryLabelTextColor } from '../label-color.functions';
import { YAxisLabelDrawConfig } from '../y-axis-labels.drawer';
import { LabelGroup, VisualYAxisLabel, YAxisLabelsProvider } from './y-axis-labels.model';
import { LabelColorResolver } from '../y-axis.component';
import { lastOf } from '../../../utils/array.utils';
import { getLabelTextColorByBackgroundColor } from '../../../utils/canvas/canvas-text-functions.utils';

export class LastCandleLabelsProvider implements YAxisLabelsProvider {
	constructor(
		private chartModel: ChartModel,
		private config: FullChartConfig,
		private lastCandleLabelsByChartType: Partial<Record<DataSeriesType, LastCandleLabelHandler>>,
		private resolveLabelColorFn: (chartType: DataSeriesType) => LabelColorResolver,
	) {}

	/**
	 * Returns an array of LabelGroup objects that contain the labels for the yAxis of the chart.
	 * @returns {LabelGroup[]} An array of LabelGroup objects that contain the labels for the yAxis of the chart.
	 */
	public getUnorderedLabels(): LabelGroup[] {
		const collectedLabels: LabelGroup[] = [];
		const visible = this.config.components.yAxis.labels.settings.lastPrice.mode !== 'none';
		if (visible) {
			// main candle series
			const yAxisVisualLabel = this.getYAxisVisualLabel(this.chartModel.mainCandleSeries);
			const mainCandleSeriesVisualLabel: VisualYAxisLabel | null = yAxisVisualLabel
				? {
						...yAxisVisualLabel,
						...this.getLabelDrawConfig(this.chartModel.mainCandleSeries, true),
				  }
				: yAxisVisualLabel;
			if (mainCandleSeriesVisualLabel) {
				const mainCandleSeriesLabels: LabelGroup = { labels: [mainCandleSeriesVisualLabel] };

				const handler = this.lastCandleLabelsByChartType[this.config.components.chart.type];
				handler?.(mainCandleSeriesLabels, this.chartModel.mainCandleSeries);
				collectedLabels.push(mainCandleSeriesLabels);
			}

			// compare candle series
			this.chartModel.candleSeries.forEach((series, index) => {
				if (index === 0) {
					return;
				}
				const yAxisVisualLabel = this.getYAxisVisualLabel(series);
				const secondarySeriesVisualLabel: VisualYAxisLabel | null = yAxisVisualLabel
					? {
							...yAxisVisualLabel,
							...this.getLabelDrawConfig(series, false),
					  }
					: yAxisVisualLabel;
				if (secondarySeriesVisualLabel) {
					const secondarySeriesLabel: LabelGroup = {
						labels: [secondarySeriesVisualLabel],
					};
					const handler = this.lastCandleLabelsByChartType[series.config.type];
					handler?.(secondarySeriesLabel, this.chartModel.mainCandleSeries);
					collectedLabels.push(secondarySeriesLabel);
				}
			});
		}
		return collectedLabels;
	}

	/**
	 * Returns the visual label for the Y axis of a candle series.
	 * @param {CandleSeriesModel} series - The candle series model.
	 * @returns {Omit<VisualYAxisLabel, 'bgColor'> | null} - The visual label for the Y axis or null if there is no data.
	 */
	private getYAxisVisualLabel(series: CandleSeriesModel): Omit<VisualYAxisLabel, 'bgColor'> | null {
		const lastCandle = lastOf(series.dataPoints);
		if (lastCandle) {
			const y = series.view.toY(lastCandle.close);
			if (isFinite(y)) {
				const mode = this.config.components.yAxis.labels.settings.lastPrice.mode;
				const appearanceType = this.config.components.yAxis.labels.settings.lastPrice.type;

				return {
					y,
					labelWeight: 0,
					labelText: this.chartModel.pane.valueFormatter(lastCandle.close, series),
					mode,
					labelType: appearanceType,
					description: series.instrument.symbol,
				};
			}
		}
		return null;
	}
	/**
	 * Returns the configuration object for drawing the label of the Y-axis.
	 * @param {CandleSeriesModel} series - The series model for which the label configuration is to be returned.
	 * @param {boolean} primary - A boolean value indicating whether the label is primary or not.
	 * @returns {YAxisLabelDrawConfig} - The configuration object for drawing the label of the Y-axis.
	 */
	private getLabelDrawConfig(series: CandleSeriesModel, primary: boolean): YAxisLabelDrawConfig {
		const colors = series.colors.labels;
		const getLabelBoxColor = this.resolveLabelColorFn(series.config.type);
		const { rectLabelTextColor, rectLabelInvertedTextColor } = this.chartModel.config.colors.yAxis;
		let boxColor = '#FFFFFF';
		let textColor = '#FFFFFF';
		if (colors) {
			boxColor = getLabelBoxColor(series.lastPriceMovement, series.colors);
			textColor = primary ? getPrimaryLabelTextColor(series.lastPriceMovement, colors) : rectLabelTextColor;
		}
		return {
			bgColor: boxColor,
			textColor: getLabelTextColorByBackgroundColor(boxColor, textColor, rectLabelInvertedTextColor),
			rounded: true,
		};
	}
}
