/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import { ChartModel } from '../chart/chart.model';
import { PaneComponent } from '../pane/pane.component';
import { NumericYAxisLabelsGenerator } from './numeric-y-axis-labels.generator';
import { YAxisLabelsModel } from './price_labels/y-axis-labels.model';
import { YAxisBaseLabelsModel } from './y-axis-base-labels.model';

export class YAxisModel extends ChartBaseElement {
	yAxisLabelsGenerator: NumericYAxisLabelsGenerator;
	yAxisBaseLabelsModel: YAxisBaseLabelsModel;
	yAxisLabelsModel: YAxisLabelsModel;

	constructor(
		paneComponent: PaneComponent,
		eventBus: EventBus,
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		canvasModel: CanvasModel,
		private chartModel: ChartModel,
		scaleModel: ScaleModel,
	) {
		super();
		const formatter = paneComponent.valueFormatter;
		this.yAxisLabelsGenerator = new NumericYAxisLabelsGenerator(
			null,
			undefined,
			scaleModel,
			formatter,
			() => this.config.components.yAxis.type,
			() => 1,
			config.components.yAxis.labelHeight,
		);
		this.yAxisBaseLabelsModel = new YAxisBaseLabelsModel(
			scaleModel,
			this.yAxisLabelsGenerator,
			this.canvasBoundsContainer,
		);
		this.addChildEntity(this.yAxisBaseLabelsModel);
		this.yAxisLabelsModel = new YAxisLabelsModel(
			eventBus,
			this.chartModel,
			this.canvasBoundsContainer,
			this.config,
			canvasModel,
			() => this.canvasBoundsContainer.updateYAxisWidths(),
		);
		this.addChildEntity(this.yAxisLabelsModel);
		this.canvasBoundsContainer.yAxisBoundsContainer.registerYAxisWidthContributor({
			getLargestLabel: () =>
				(this.yAxisLabelsGenerator.labelsCache.getLastCachedValue() ?? [])
					.map(label => label.text)
					.concat(this.yAxisLabelsModel.orderedLabels.flatMap(l => l.labels).map(l => l.labelText))
					.reduce(
						(maxLengthText, label) => (label.length > maxLengthText.length ? label : maxLengthText),
						'',
					),
			getYAxisIndex: () => 0,
			getYAxisAlign: () => this.config.components.yAxis.align,
			getPaneUUID: () => paneComponent.uuid,
		});
	}
}
