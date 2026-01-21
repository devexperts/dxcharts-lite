/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig, YAxisConfig } from '../../../chart.config';
import { CandleSeriesModel } from '../../../model/candle-series.model';
import { DataSeriesType } from '../../../model/data-series.config';
import { ChartModel, LastCandleLabelHandler } from '../../chart/chart.model';
import { getPrimaryLabelTextColor } from '../label-color.functions';
import { YAxisLabelDrawConfig } from '../y-axis-labels.drawer';
import { LabelGroup, VisualYAxisLabel, YAxisLabelsProvider } from './y-axis-labels.model';
import { lastOf } from '../../../utils/array.utils';
import { getLabelTextColorByBackgroundColor } from '../../../utils/canvas/canvas-text-functions.utils';
import { LabelColorResolver } from '../y-axis.component';

export class LastCandleLabelsProvider implements YAxisLabelsProvider {
	constructor(
		private chartModel: ChartModel,
		private chartConfig: FullChartConfig,
		private yAxisConfig: YAxisConfig,
		private lastCandleLabelsByChartType: Partial<Record<DataSeriesType, LastCandleLabelHandler>>,
		private resolveLabelColorFn: (chartType: DataSeriesType) => LabelColorResolver,
	) {}

	/**
	 * Returns an array of LabelGroup objects that contain the labels for the yAxis of the chart.
	 * @returns {LabelGroup[]} An array of LabelGroup objects that contain the labels for the yAxis of the chart.
	 */
	public getUnorderedLabels(): LabelGroup[] {
		const collectedLabels: LabelGroup[] = [];
		const visible = this.yAxisConfig.labels.settings.lastPrice.mode !== 'none' && this.yAxisConfig.visible;

		if (!visible) {
			return collectedLabels;
		}

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

			const handler = this.lastCandleLabelsByChartType[this.chartConfig.components.chart.type];
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
				const mode = this.yAxisConfig.labels.settings.lastPrice.mode;
				const appearanceType = this.yAxisConfig.labels.settings.lastPrice.type;

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
	 * @param {boolean} primary - A boolean value indicating whether the label is for the main series or not.
	 * @returns {YAxisLabelDrawConfig} - The configuration object for drawing the label of the Y-axis.
	 */
	private getLabelDrawConfig(series: CandleSeriesModel, primary: boolean): YAxisLabelDrawConfig {
		const appearanceType = this.yAxisConfig.labels.settings.lastPrice.type;

		const colors = series.colors.labels;
		const { rectLabelTextColor = 'white', rectLabelInvertedTextColor = 'black' } = this.chartConfig.colors.yAxis;

		const getLabelColorBySeries = this.resolveLabelColorFn(series.config.type);

		if (!colors) {
			return {
				bgColor: '#FFFFFF',
				textColor: getLabelTextColorByBackgroundColor('#FFFFFF', '#000000', rectLabelInvertedTextColor),
				rounded: true,
			};
		}

		const boxColor = getLabelColorBySeries(series.lastPriceMovement, series.colors);

		// if the label is for the main candle series
		if (primary) {
			const isScatterPlot = series.config.type === 'scatterPlot';
			const textColor = isScatterPlot
				? rectLabelTextColor
				: getPrimaryLabelTextColor(series.lastPriceMovement, colors);
			return {
				bgColor: boxColor,
				textColor:
					appearanceType === 'plain'
						? getLabelColorBySeries(series.lastPriceMovement, series.colors)
						: getLabelTextColorByBackgroundColor(boxColor, textColor, rectLabelInvertedTextColor),
				rounded: true,
			};
		}

		// if the label is for the secondary candle series
		return {
			bgColor: boxColor,
			textColor:
				appearanceType === 'plain'
					? getLabelColorBySeries(series.lastPriceMovement, series.colors)
					: getLabelTextColorByBackgroundColor(boxColor, rectLabelTextColor, rectLabelInvertedTextColor),
			rounded: true,
		};
	}
}
