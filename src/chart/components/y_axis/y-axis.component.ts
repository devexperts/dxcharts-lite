/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { YAxisWidthContributor } from '../../canvas/y-axis-bounds.container';
import {
	FullChartConfig,
	YAxisAlign,
	YAxisConfig,
	YAxisLabelAppearanceType,
	YAxisLabelMode,
	YAxisLabelType,
} from '../../chart.config';
import EventBus from '../../events/event-bus';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import { cloneUnsafe } from '../../utils/object.utils';
import { uuid } from '../../utils/uuid.utils';
import { PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { LabelsGroups, VisualYAxisLabel, YAxisLabelsProvider } from './price_labels/y-axis-labels.model';
import { YAxisScaleHandler } from './y-axis-scale.handler';
import { YAxisModel } from './y-axis.model';

/**
 * Y axis component. Contains all Y axis related logic.
 */
export class YAxisComponent extends ChartBaseElement {
	public yAxisScaleHandler: YAxisScaleHandler;
	model: YAxisModel;
	public axisTypeSetSubject: Subject<PriceAxisType> = new Subject<PriceAxisType>();
	public readonly state: YAxisConfig;

	constructor(
		private eventBus: EventBus,
		config: FullChartConfig,
		private canvasModel: CanvasModel,
		private scaleModel: ScaleModel,
		canvasInputListeners: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		chartPanComponent: ChartPanComponent,
		private cursorHandler: CursorHandler,
		valueFormatterProvider: () => (value: number) => string,
		public paneUUID: string,
		public extentIdx: number,
	) {
		super();
		this.state = cloneUnsafe(config.components.yAxis);

		//#region init yAxisScaleHandler
		this.yAxisScaleHandler = new YAxisScaleHandler(
			eventBus,
			this.state,
			chartPanComponent,
			scaleModel,
			canvasInputListeners,
			canvasBoundsContainer,
			canvasBoundsContainer.getBoundsHitTest(CanvasElement.PANE_UUID_Y_AXIS(paneUUID, extentIdx)),
			auto => scaleModel.autoScale(auto),
		);
		this.addChildEntity(this.yAxisScaleHandler);
		//#endregion

		this.model = new YAxisModel(
			this.paneUUID,
			eventBus,
			this.state,
			canvasBoundsContainer,
			canvasModel,
			scaleModel,
			valueFormatterProvider,
		);
		this.addChildEntity(this.model);
		this.updateCursor();
	}

	private updateCursor() {
		if (this.state.type === 'percent') {
			this.cursorHandler.setCursorForCanvasEl(
				CanvasElement.PANE_UUID_Y_AXIS(this.paneUUID, this.extentIdx),
				this.state.resizeDisabledCursor,
			);
		} else {
			this.cursorHandler.setCursorForCanvasEl(
				CanvasElement.PANE_UUID_Y_AXIS(this.paneUUID, this.extentIdx),
				this.state.cursor,
			);
		}
	}

	/**
	 * Updates labels visual appearance on canvas
	 */
	public updateOrderedLabels(adjustYAxisWidth = false) {
		// this.yAxisModel.yAxisLabelsModel.updateLabels(adjustYAxisWidth);
	}

	//#region public methods
	/**
	 * You can add a custom labels provider for additional labels on YAxis (like for drawings, symbol last price, studies, etc..)
	 * @param groupName - a group in which labels position recalculation algorithm will be applied, usually it's subchart name
	 * @param provider
	 * @param id
	 */
	public registerYAxisLabelsProvider(
		provider: YAxisLabelsProvider,
		groupName: string = LabelsGroups.MAIN,
		id = uuid(),
	) {
		// this.yAxisModel.yAxisLabelsModel.registerYAxisLabelsProvider(groupName, provider, id);
		return id;
	}

	/**
	 * An easier way to manage custom y-axis labels, than y-axis labels providers.
	 * However, overlapping avoidance is not supported
	 * @param name
	 * @param label
	 */
	public addSimpleYAxisLabel(name: string, label: VisualYAxisLabel) {
		// this.yAxisModel.yAxisLabelsModel.customLabels[name] = label;
		this.canvasModel.fireDraw();
	}
	/**
	 * @param name
	 */
	public deleteSimpleYAxisLabel(name: string) {
		// delete this.yAxisModel.yAxisLabelsModel.customLabels[name];
		this.canvasModel.fireDraw();
	}

	/**
	 * Unregister a Y axis labels provider from the specified group.
	 * @param {string} groupName - The name of the group from which to unregister the provider. Defaults to LabelsGroups.MAIN.
	 * @param {string} id - The ID of the provider to unregister.
	 * @returns {string} - The ID of the unregistered provider.
	 */
	public unregisterYAxisLabelsProvider(groupName: string = LabelsGroups.MAIN, id: string): string {
		// this.yAxisModel.yAxisLabelsModel.unregisterYAxisLabelsProvider(groupName, id);
		return id;
	}

	public getBounds() {
		return this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID_Y_AXIS(this.paneUUID, this.extentIdx));
	}

	/**
	 * If custom pane has y-axis it has to register width contributor to correctly calculate overall y-axis width.
	 * @param contributor
	 */
	public registerYAxisWidthContributor(contributor: YAxisWidthContributor) {
		this.canvasBoundsContainer.yAxisBoundsContainer.registerYAxisWidthContributor(contributor);
	}

	/**
	 * Sets the type of axis: percent, regular or logarithmic.
	 * @param type - the type of axis
	 */
	public setAxisType(type: PriceAxisType) {
		if (type !== this.state.type) {
			this.state.type = type;
			this.axisTypeSetSubject.next(type);
			this.scaleModel.autoScale(true);
			// this.yAxisModel.yAxisLabelsModel.updateLabels(true);
			this.updateCursor();
		}
	}

	/**
	 * Change YAxis position to left or to right
	 * @param align
	 */
	public setYAxisAlign(align: YAxisAlign) {
		this.state.align = align;
		this.canvasBoundsContainer.updateYAxisWidths();
		this.eventBus.fireDraw();
	}

	/**
	 * Controls visibility of the y-axis
	 */
	public setVisible(isVisible: boolean) {
		this.state.visible = isVisible;
		this.eventBus.fireDraw();
	}

	/**
	 * If visible, when you can see the y-axis on the chart
	 */
	public isVisible(): boolean {
		return this.state.visible;
	}

	/**
	 * Controls lockPriceToBarRatio of the y-axis
	 */
	public setLockPriceToBarRatio(value: boolean = false) {
		this.scaleModel.setLockPriceToBarRatio(value);
	}

	/**
	 * Changes the visual type of particular label.
	 * @param type - label type
	 * @param mode - visual mode
	 */
	public changeLabelMode(type: YAxisLabelType, mode: YAxisLabelMode): void {
		this.state.labels.settings[type].mode = mode;
		// this.yAxisModel.yAxisLabelsModel.updateLabels();
	}

	/**
	 * Changes the visual type of particular label.
	 * @param type - label type
	 * @param mode - visual mode
	 */
	public changeLabelAppearance(type: YAxisLabelType, mode: YAxisLabelAppearanceType): void {
		this.state.labels.settings[type].type = mode;
		// this.yAxisModel.yAxisLabelsModel.updateLabels();
	}

	/**
	 * Sets the inverse price scale mode. Inverts Y axis vertically.
	 * Inversion also works for candles, drawings and overlay studies.
	 * @param inverse - true or false
	 */
	public togglePriceScaleInverse(inverse: boolean): void {
		this.scaleModel.state.inverse = inverse;
		this.scaleModel.inverseY = inverse;
		this.scaleModel.scaleInversedSubject.next(inverse);
	}

	/**
	 * Changes the visibility of the labels' descriptions.
	 * @param {boolean} descVisibility - A boolean value indicating whether the descriptions should be visible or not.
	 * @returns {void}
	 */
	public changeLabelsDescriptionVisibility(descVisibility: boolean): void {
		this.state.labels.descriptions = descVisibility;
		//  recalculating labels is not needed, so just redraw YAxis
		this.canvasModel.fireDraw();
	}
	//#endregion
}
