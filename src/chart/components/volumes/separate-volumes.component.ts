/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../chart.config';
import { ChartBaseElement } from '../../model/chart-base-element';
import { Pixel, Unit } from '../../model/scaling/viewport.model';
import { ChartComponent } from '../chart/chart.component';
import { createCandlesOffsetProvider } from '../chart/data-series.high-low-provider';
import { PaneManager } from '../pane/pane-manager.component';
import { PaneComponent } from '../pane/pane.component';
import { volumeFormatter } from './volumes.formatter';
import { VolumesModel } from './volumes.model';

export class SeparateVolumesComponent extends ChartBaseElement {
	static UUID = 'volumes';
	public pane: PaneComponent | undefined;
	constructor(
		private chartComponent: ChartComponent,
		public config: FullChartConfig,
		private volumesModel: VolumesModel,
		private paneManager: PaneManager,
	) {
		super();
		if (config.components.volumes.showSeparately) {
			this.activateSeparateVolumes();
		}
	}

	protected doActivate(): void {
		super.doActivate();
		this.addRxSubscription(
			this.chartComponent.chartModel.candlesUpdatedSubject.subscribe(
				() => !this.pane?.scale.isViewportValid() && this.pane?.scale.doAutoScale(true),
			),
		);
		this.addRxSubscription(this.volumesModel.volumeMax.subscribe(() => this.pane?.scale.doAutoScale()));
	}

	private paneHasStudyDataSeries(pane: PaneComponent): boolean {
		return pane.dataSeries.length > 0;
	}

	/**
	 * Activates the separate volumes feature.
	 * If the pane component for separate volumes does not exist, it creates a new pane with the specified UUID and options.
	 * It then sets the high-low provider for the volumes scale model and does an auto scale.
	 * A new VolumesDrawer is created and added to the drawing manager with the specified parameters.
	 */
	activateSeparateVolumes() {
		const existingPane = this.paneManager.panes[SeparateVolumesComponent.UUID];
		if (existingPane === undefined) {
			const precision = 1;
			const volumePane = this.paneManager.createPane(SeparateVolumesComponent.UUID, {
				paneFormatters: {
					regular: (value: number) => volumeFormatter(value, precision),
				},
				useDefaultHighLow: false,
				increment: 1,
			});
			volumePane.mainExtent.yAxis.setAxisType('regular');
			const { scale: scaleModel } = volumePane;
			const volumesHighLowProvider = createCandlesOffsetProvider(
				() => ({ top: 10, bottom: 0, left: 0, right: 0, visible: true }),
				this.volumesModel.highLowProvider,
			);
			scaleModel.autoScaleModel.setHighLowProvider('volumes', volumesHighLowProvider);
			scaleModel.doAutoScale(true);
			this.pane = volumePane;
			return;
		}
		this.pane = existingPane;
	}

	/**
	 * Deactivates the separate volumes feature by removing the separate volumes pane when it has no study data series,
	 * or by keeping the pane when studies remain on it.
	 */
	deactiveSeparateVolumes() {
		const pane = this.paneManager.panes[SeparateVolumesComponent.UUID];

		if (pane === undefined) {
			delete this.pane;
			return;
		}

		if (this.paneHasStudyDataSeries(pane)) {
			this.pane = undefined;
			return;
		}

		this.paneManager.removePane(SeparateVolumesComponent.UUID);
		delete this.pane;
	}

	/**
	 * Converts a pixel value from the Y-axis of the scale model to the corresponding data value.
	 * @param {Pixel} y - The pixel value to convert.
	 * @returns {Unit} - The corresponding data value.
	 */
	public fromY(y: Pixel): Unit {
		return this.pane?.scale.fromY(y) ?? 0;
	}
}
