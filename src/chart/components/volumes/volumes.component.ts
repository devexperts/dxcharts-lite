/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { ChartBaseElement } from '../../model/chart-base-element';
import { BarType, FullChartColors, FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { DrawingManager } from '../../drawers/drawing-manager';
import { PriceMovement } from '../../model/candle-series.model';
import { ScaleModel } from '../../model/scale.model';
import { ChartComponent } from '../chart/chart.component';
import { PaneManager } from '../pane/pane-manager.component';
import { SeparateVolumesComponent } from './separate-volumes.component';
import { resolveColorForBar, resolveColorForCandle, resolveColorForLine } from './volume-color-resolvers.functions';
import { VolumesDrawer } from './volumes.drawer';
import { VolumesModel } from './volumes.model';
import { YAxisComponent } from '../y_axis/y-axis.component';
import { BehaviorSubject } from 'rxjs';

export type VolumeColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => string;

export class VolumesComponent extends ChartBaseElement {
	separateVolumes: SeparateVolumesComponent;
	private volumesColorByChartTypeMap: Partial<Record<BarType, VolumeColorResolver>> = {};
	volumesModel: VolumesModel;
	yAxisComponent: YAxisComponent;
	public volumeSettingChangedSubject = new BehaviorSubject<boolean>(false);

	constructor(
		private canvasModel: CanvasModel,
		chartComponent: ChartComponent,
		scaleModel: ScaleModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		drawingManager: DrawingManager,
		private config: FullChartConfig,
		paneManager: PaneManager,
		yAxisComponent: YAxisComponent,
	) {
		super();
		const volumesModel = new VolumesModel(chartComponent, scaleModel);
		this.volumesModel = volumesModel;
		this.yAxisComponent = yAxisComponent;
		this.addChildEntity(volumesModel);
		this.separateVolumes = new SeparateVolumesComponent(
			canvasModel,
			chartComponent,
			drawingManager,
			config,
			volumesModel,
			this.volumesColorByChartTypeMap,
			paneManager,
		);
		this.addChildEntity(this.separateVolumes);
		const volumesDrawer = new VolumesDrawer(
			canvasModel,
			config,
			volumesModel,
			chartComponent.chartModel,
			scaleModel,
			this.volumesColorByChartTypeMap,
			() => !config.components.volumes.showSeparately,
		);
		drawingManager.addDrawer(volumesDrawer, 'VOLUMES');
		this.registerDefaultVolumeColorResolvers();
		this.volumeSettingChangedSubject.next(config.components.volumes.visible);
	}

	/**
	 * Registers default volume color resolvers for candle, line and bar charts
	 * @private
	 */
	private registerDefaultVolumeColorResolvers() {
		this.registerVolumeColorResolver('candle', resolveColorForCandle);
		this.registerVolumeColorResolver('trend', resolveColorForCandle);
		this.registerVolumeColorResolver('hollow', resolveColorForCandle);
		this.registerVolumeColorResolver('line', resolveColorForLine);
		this.registerVolumeColorResolver('bar', resolveColorForBar);
	}

	/**
	 * Sets whether the volumes should be shown separately or not.
	 *
	 * @param {boolean} separate - A boolean value indicating whether the volumes should be shown separately or not.
	 * @returns {void}
	 */
	public setShowVolumesSeparatly(separate: boolean) {
		if (this.config.components.volumes.showSeparately !== separate) {
			this.config.components.volumes.showSeparately = separate;
			if (separate) {
				this.separateVolumes.activateSeparateVolumes();
			} else {
				this.separateVolumes.deactiveSeparateVolumes();
			}
		}
	}

	/**
	 * This method deactivates the current component by calling the superclass doDeactivate method and setting the visibility of the component to false.
	 * @returns {void}
	 */
	protected doDeactivate(): void {
		super.doDeactivate();
		this.setVisible(false);
	}
	/**
	 * You can use this method to determine volumes' color for specified chart type.
	 * @param chartType
	 * @param resolver
	 */
	public registerVolumeColorResolver(chartType: BarType, resolver: VolumeColorResolver) {
		this.volumesColorByChartTypeMap[chartType] = resolver;
	}

	/**
	 * Sets the visibility of the volumes component and updates the canvas accordingly.
	 * @param {boolean} visible - Whether the volumes component should be visible or not. Default is true.
	 * @returns {void}
	 */
	public setVisible(visible = true) {
		this.config.components.volumes.visible = visible;
		this.volumeSettingChangedSubject.next(visible);
		if (this.config.components.volumes.showSeparately === true) {
			if (visible) {
				this.separateVolumes.activateSeparateVolumes();
			} else {
				this.separateVolumes.deactiveSeparateVolumes();
			}
		}
		this.canvasBoundsContainer.recalculatePanesHeightRatios();
		this.canvasModel.fireDraw();
	}
}
