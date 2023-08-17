/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { YAxisWidthContributor } from '../../canvas/y-axis-bounds.container';
import { FullChartConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import { NumericYAxisLabelsGenerator } from './numeric-y-axis-labels.generator';
import { YAxisBaseLabelsModel } from './y-axis-base-labels.model';

export class YAxisModel extends ChartBaseElement {
	labelsGenerator: NumericYAxisLabelsGenerator;
	baseLabelsModel: YAxisBaseLabelsModel;
	// yAxisLabelsModel: YAxisLabelsModel;

	constructor(
		private paneUUID: string,
		eventBus: EventBus,
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		canvasModel: CanvasModel,
		scaleModel: ScaleModel,
		valueFormatterProvider: () => (value: number) => string,
	) {
		super();
		this.labelsGenerator = new NumericYAxisLabelsGenerator(
			null,
			undefined,
			scaleModel,
			valueFormatterProvider,
			() => this.config.components.yAxis.type,
			() => 1,
			config.components.yAxis.labelHeight,
		);
		this.baseLabelsModel = new YAxisBaseLabelsModel(
			scaleModel,
			this.labelsGenerator,
			this.canvasBoundsContainer,
		);
		this.addChildEntity(this.baseLabelsModel);
		// this.yAxisLabelsModel = new YAxisLabelsModel(
		// 	eventBus,
		// 	this.chartModel,
		// 	this.canvasBoundsContainer,
		// 	this.config,
		// 	canvasModel,
		// 	() => this.canvasBoundsContainer.updateYAxisWidths(),
		// );
		// this.addChildEntity(this.yAxisLabelsModel);
	}

	protected doActivate(): void {
		const contributor: YAxisWidthContributor = {
			getLargestLabel: () =>
				(this.labelsGenerator.labelsCache.getLastCachedValue() ?? [])
					.map(label => label.text)
					// .concat(this.yAxisLabelsModel.orderedLabels.flatMap(l => l.labels).map(l => l.labelText))
					.reduce(
						(maxLengthText, label) => (label.length > maxLengthText.length ? label : maxLengthText),
						'',
					),
			getYAxisIndex: () => 0,
			getYAxisAlign: () => this.config.components.yAxis.align,
			getPaneUUID: () => this.paneUUID,
		};
		this.canvasBoundsContainer.yAxisBoundsContainer.registerYAxisWidthContributor(contributor);
		this.addSubscription(() =>
			this.canvasBoundsContainer.yAxisBoundsContainer.removeYAxisWidthContributor(contributor),
		);
	}
}
