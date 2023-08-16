/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartConfigComponentsYAxis } from '../../../chart.config';
import { BoundsProvider } from '../../../model/bounds.model';
import { DEFAULT_DATA_SERIES_PAINT_CONFIG, DataSeriesConfig } from '../../../model/data-series.config';
import { DataSeriesModel } from '../../../model/data-series.model';
import { getLabelTextColorByBackgroundColor } from '../../../utils/canvas/canvas-text-functions.utils';
import { YAxisLabelDrawConfig } from '../y-axis-labels.drawer';
import { LabelGroup, YAxisLabelsProvider } from './y-axis-labels.model';

export class DataSeriesYAxisLabelsProvider implements YAxisLabelsProvider {
	constructor(
		private series: DataSeriesModel,
		private config: DataSeriesConfig,
		public yAxisBoundsProvider: BoundsProvider,
		public axisState?: ChartConfigComponentsYAxis,
	) {}

	/**
	 * Returns an array of LabelGroup objects that contain VisualYAxisLabel objects.
	 * The labels are unordered and are based on the last data series point or the last visual series point, depending on the configuration.
	 * The labels are formatted using the series value formatter.
	 * The label appearance type and draw configuration are also based on the configuration.
	 * @returns {LabelGroup[]} An array of LabelGroup objects that contain VisualYAxisLabel objects.
	 */
	public getUnorderedLabels(): LabelGroup[] {
		const visible = this.config.visible;
		if (visible) {
			const getLastPointForLabel =
				this.config.labelLastValue === 'series'
					? this.series.getLastDataSeriesPoint
					: this.series.getLastVisualSeriesPoint;
			const bounds = this.yAxisBoundsProvider();
			const mode = this.config.labelMode;
			const appearanceType = this.config.labelAppearanceType;

			const lastPoint = getLastPointForLabel();
			if (lastPoint !== undefined) {
				const lastPointY = this.series.view.toY(lastPoint.close);
				if (isFinite(lastPointY)) {
					const label = this.series.valueFormatter(lastPoint.close);
					const drawConfig = this.getLabelDrawConfig();

					return [
						{
							labels: [
								{
									y: lastPointY,
									description: this.series.name,
									mode,
									labelType: appearanceType,
									labelText: label,
									...drawConfig,
								},
							],
							axisState: this.axisState,
							bounds,
						},
					];
				}
			}
		}
		return [];
	}

	/**
	 * Retrieves the `config` object from the `series` object and then retrieves the `paintConfig` object from the `config` object.
	 * If `paintConfig` is null or undefined, it uses the `DEFAULT_DATA_SERIES_PAINT_CONFIG`. It then retrieves the `bgColor`
	 * from the `paintConfig` object and calculates the `textColor` based on the `bgColor` using the `getLabelTextColorByBackgroundColor` function.
	 * Finally, it returns an object with `textColor`, `bgColor`, `paddingBottom`, `paddingEnd`, and `paddingTop` properties.
	 * @returns {YAxisLabelDrawConfig}
	 */
	private getLabelDrawConfig(): YAxisLabelDrawConfig {
		const config = this.series.config;
		const paintConfig = config.paintConfig[0] ?? DEFAULT_DATA_SERIES_PAINT_CONFIG;
		const bgColor = paintConfig.color;
		const textColor = getLabelTextColorByBackgroundColor(bgColor, 'white', 'black');
		return {
			textColor,
			bgColor,
			paddingBottom: config.labelPaddingBottom,
			paddingEnd: config.labelPaddingEnd,
			paddingTop: config.labelPaddingTop,
		};
	}
}
