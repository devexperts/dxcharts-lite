/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartBaseElement } from '../../model/chart-base-element';
import { BarType, FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { DrawingManager } from '../../drawers/drawing-manager';
import { ScaleModel } from '../../model/scale.model';
import { Pixel, Unit } from '../../model/scaling/viewport.model';
import { ChartComponent } from '../chart/chart.component';
import { createCandlesOffsetProvider } from '../chart/data-series.high-low-provider';
import { PaneManager } from '../pane/pane-manager.component';
import { VolumeColorResolver } from './volumes.component';
import { VolumesDrawer } from './volumes.drawer';
import { volumeFormatter } from './volumes.formatter';
import { VolumesModel } from './volumes.model';

export class SeparateVolumesComponent extends ChartBaseElement {
	static UUID = 'volumes';
	public scaleModel: ScaleModel | undefined;
	constructor(
		private canvasModel: CanvasModel,
		private chartComponent: ChartComponent,
		private drawingManager: DrawingManager,
		private config: FullChartConfig,
		private volumesModel: VolumesModel,
		private readonly volumesColorByChartTypeMap: Partial<Record<BarType, VolumeColorResolver>>,
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
				() => !this.scaleModel?.isViewportValid() && this.scaleModel?.doAutoScale(true),
			),
		);
		this.addRxSubscription(this.volumesModel.volumeMax.subscribe(() => this.scaleModel?.doAutoScale()));
	}

	/**
	 * Activates the separate volumes feature.
	 * If the pane component for separate volumes does not exist, it creates a new pane with the specified UUID and options.
	 * It then sets the high-low provider for the volumes scale model and does an auto scale.
	 * A new VolumesDrawer is created and added to the drawing manager with the specified parameters.
	 */
	activateSeparateVolumes() {
		if (this.paneManager.paneComponents[SeparateVolumesComponent.UUID] === undefined) {
			const volumePane = this.paneManager.createPane(SeparateVolumesComponent.UUID, {
				paneFormatters: {
					regular: volumeFormatter,
				},
				useDefaultHighLow: false,
				increment: 1,
			});
			const { scaleModel } = volumePane;
			const volumesHighLowProvider = createCandlesOffsetProvider(
				() => ({ top: 10, bottom: 0, left: 0, right: 0, visible: true }),
				this.volumesModel.highLowProvider,
			);
			scaleModel.autoScaleModel.setHighLowProvider('volumes', volumesHighLowProvider);
			scaleModel.doAutoScale(true);
			this.scaleModel = scaleModel;

			const separateVolumesDrawer = new VolumesDrawer(
				this.canvasModel,
				this.config,
				this.volumesModel,
				this.chartComponent.chartModel,
				scaleModel,
				this.volumesColorByChartTypeMap,
				() => this.config.components.volumes.showSeparately,
			);
			this.drawingManager.addDrawer(separateVolumesDrawer, 'UNDERLAY_VOLUMES_AREA');
		}
	}

	/**
	 * Deactivates the separate volumes feature by removing the separate volumes pane, deleting the scale model, and removing the underlay volumes area drawer.
	 */
	deactiveSeparateVolumes() {
		this.paneManager.removePane(SeparateVolumesComponent.UUID);
		delete this.scaleModel;
		this.drawingManager.removeDrawerByName('UNDERLAY_VOLUMES_AREA');
	}

	/**
	 * Converts a pixel value from the Y-axis of the scale model to the corresponding data value.
	 * @param {Pixel} y - The pixel value to convert.
	 * @returns {Unit} - The corresponding data value.
	 */
	public fromY(y: Pixel): Unit {
		return this.scaleModel?.fromY(y) ?? 0;
	}
}
