/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../chart.config';
import { DrawingManager } from '../../drawers/drawing-manager';
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
		private drawingManager: DrawingManager,
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
				() => !this.pane?.scaleModel.isViewportValid() && this.pane?.scaleModel.doAutoScale(true),
			),
		);
		this.addRxSubscription(this.volumesModel.volumeMax.subscribe(() => this.pane?.scaleModel.doAutoScale()));
	}

	/**
	 * Activates the separate volumes feature.
	 * If the pane component for separate volumes does not exist, it creates a new pane with the specified UUID and options.
	 * It then sets the high-low provider for the volumes scale model and does an auto scale.
	 * A new VolumesDrawer is created and added to the drawing manager with the specified parameters.
	 */
	activateSeparateVolumes() {
		if (this.paneManager.panes[SeparateVolumesComponent.UUID] === undefined) {
			const volumePane = this.paneManager.createPane(SeparateVolumesComponent.UUID, {
				paneFormatters: {
					regular: volumeFormatter,
				},
				useDefaultHighLow: false,
				increment: 1,
			});
			this.pane = volumePane;
			volumePane.mainYExtentComponent.yAxis.setAxisType('regular');
			const { scaleModel } = volumePane;
			const volumesHighLowProvider = createCandlesOffsetProvider(
				() => ({ top: 10, bottom: 0, left: 0, right: 0, visible: true }),
				this.volumesModel.highLowProvider,
			);
			scaleModel.autoScaleModel.setHighLowProvider('volumes', volumesHighLowProvider);
			scaleModel.doAutoScale(true);
		}
	}

	/**
	 * Deactivates the separate volumes feature by removing the separate volumes pane, deleting the scale model, and removing the underlay volumes area drawer.
	 */
	deactiveSeparateVolumes() {
		this.paneManager.removePane(SeparateVolumesComponent.UUID);
		delete this.pane;
		this.drawingManager.removeDrawerByName('UNDERLAY_VOLUMES_AREA');
	}

	/**
	 * Converts a pixel value from the Y-axis of the scale model to the corresponding data value.
	 * @param {Pixel} y - The pixel value to convert.
	 * @returns {Unit} - The corresponding data value.
	 */
	public fromY(y: Pixel): Unit {
		return this.pane?.scaleModel.fromY(y) ?? 0;
	}
}
