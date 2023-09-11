/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { YAxisWidthContributor } from '../../canvas/y-axis-bounds.container';
import { YAxisConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { DataSeriesModel } from '../../model/data-series.model';
import { ScaleModel } from '../../model/scale.model';
import { NumericYAxisLabelsGenerator } from './numeric-y-axis-labels.generator';
import { FancyYAxisLabelsModel } from './price_labels/y-axis-labels.model';
import { YAxisBaseLabelsModel } from './y-axis-base-labels.model';

export class YAxisModel extends ChartBaseElement {
	labelsGenerator: NumericYAxisLabelsGenerator;
	baseLabelsModel: YAxisBaseLabelsModel;
	fancyLabelsModel: FancyYAxisLabelsModel;

	constructor(
		private paneUUID: string,
		eventBus: EventBus,
		private state: YAxisConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		canvasModel: CanvasModel,
		scale: ScaleModel,
		valueFormatter: (value: number) => string,
		dataSeriesProvider: () => DataSeriesModel | undefined,
		private extentIdx: number,
	) {
		super();
		this.labelsGenerator = new NumericYAxisLabelsGenerator(
			null,
			dataSeriesProvider,
			scale,
			valueFormatter,
			() => this.state.type,
			state.labelHeight,
		);
		this.baseLabelsModel = new YAxisBaseLabelsModel(
			scale,
			this.labelsGenerator,
			this.canvasBoundsContainer,
			paneUUID,
			extentIdx,
		);
		this.addChildEntity(this.baseLabelsModel);
		this.fancyLabelsModel = new FancyYAxisLabelsModel(
			eventBus,
			scale,
			canvasBoundsContainer,
			state,
			canvasModel,
			paneUUID,
			() => this.canvasBoundsContainer.updateYAxisWidths(),
		);
		this.addChildEntity(this.fancyLabelsModel);
	}

	protected doActivate(): void {
		const contributor: YAxisWidthContributor = {
			getLargestLabel: () =>
				(this.labelsGenerator.labelsCache.getLastCachedValue() ?? [])
					.map(label => label.text)
					.concat(this.fancyLabelsModel.orderedLabels.flatMap(l => l.labels).map(l => l.labelText))
					.reduce(
						(maxLengthText, label) => (label.length > maxLengthText.length ? label : maxLengthText),
						'',
					),
			getYAxisIndex: () => this.extentIdx,
			getYAxisState: () => this.state,
			getPaneUUID: () => this.paneUUID,
		};
		this.canvasBoundsContainer.yAxisBoundsContainer.registerYAxisWidthContributor(contributor);
		this.addSubscription(() =>
			this.canvasBoundsContainer.yAxisBoundsContainer.removeYAxisWidthContributor(contributor),
		);
	}
}
