/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject } from 'rxjs';
import { CHART_UUID, CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { BarType, FullChartColors, FullChartConfig } from '../../chart.config';
import { DrawingManager } from '../../drawers/drawing-manager';
import { PriceMovement } from '../../model/candle-series.model';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import { ChartComponent } from '../chart/chart.component';
import { DynamicObjectsComponent } from '../dynamic-objects/dynamic-objects.component';
import { PaneManager } from '../pane/pane-manager.component';
import { SeparateVolumesComponent } from './separate-volumes.component';
import { resolveColorForBar, resolveColorForCandle, resolveColorForLine } from './volume-color-resolvers.functions';
import { VolumesDrawer } from './volumes.drawer';
import { VOLUMES_UUID, VolumesModel } from './volumes.model';

export type VolumeColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => string;

export class VolumesComponent extends ChartBaseElement {
	separateVolumes: SeparateVolumesComponent;
	public volumesColorByChartTypeMap: Partial<Record<BarType, VolumeColorResolver>> = {};
	volumesModel: VolumesModel;
	private readonly volumesDrawer: VolumesDrawer;
	public volumeVisibilityChangedSubject = new BehaviorSubject<boolean>(false);
	public volumeIsSeparateModeChangedSubject = new BehaviorSubject<boolean>(false);

	constructor(
		private canvasModel: CanvasModel,
		chartComponent: ChartComponent,
		scale: ScaleModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		drawingManager: DrawingManager,
		private config: FullChartConfig,
		paneManager: PaneManager,
		private dynamicObjectsComponent: DynamicObjectsComponent,
	) {
		super();
		const volumesModel = new VolumesModel(chartComponent, scale);
		this.volumesModel = volumesModel;
		this.addChildEntity(volumesModel);
		this.separateVolumes = new SeparateVolumesComponent(chartComponent, config, volumesModel, paneManager);
		this.volumesDrawer = new VolumesDrawer(
			config,
			this.volumesModel,
			chartComponent.chartModel,
			() => (this.config.components.volumes.showSeparately ? this.separateVolumes.pane?.scale ?? scale : scale),
			this.volumesColorByChartTypeMap,
			() => true,
		);
		config.components.volumes.visible && this.syncVolumesDynamicObject();
		this.addChildEntity(this.separateVolumes);
		this.registerDefaultVolumeColorResolvers();
		this.volumeVisibilityChangedSubject.next(config.components.volumes.visible);
		this.volumeIsSeparateModeChangedSubject.next(config.components.volumes.showSeparately);
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
			this.volumeIsSeparateModeChangedSubject.next(separate);
			this.syncVolumesDynamicObject();
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
		this.volumeVisibilityChangedSubject.next(visible);
		if (this.config.components.volumes.showSeparately) {
			if (visible) {
				this.separateVolumes.activateSeparateVolumes();
				this.volumeIsSeparateModeChangedSubject.next(true);
			} else {
				this.separateVolumes.deactiveSeparateVolumes();
				this.volumeIsSeparateModeChangedSubject.next(false);
			}
		}
		this.canvasBoundsContainer.recalculatePanesHeightRatios();
		this.syncVolumesDynamicObject();
		this.canvasModel.fireDraw();
	}

	private syncVolumesDynamicObject() {
		const visible = this.config.components.volumes.visible;

		if (!visible) {
			this.dynamicObjectsComponent.model.removeObject(this.volumesModel.id);
			return;
		}

		const paneId = this.config.components.volumes.showSeparately ? VOLUMES_UUID : CHART_UUID;
		const volumesDynamicObject = {
			id: this.volumesModel.id,
			paneId,
			drawer: this.volumesDrawer,
			model: this.volumesModel,
		};

		// check if the volumes dynamic object is already added
		const position = this.dynamicObjectsComponent.model.getObjectPosition(this.volumesModel.id);
		if (position === -1) {
			this.dynamicObjectsComponent.model.addObject(volumesDynamicObject);
			return;
		}

		this.dynamicObjectsComponent.model.updateObject(volumesDynamicObject);
	}
}
