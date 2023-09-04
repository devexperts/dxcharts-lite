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
	BarType,
	FullChartColors,
	FullChartConfig,
	YAxisAlign,
	YAxisConfig,
	YAxisLabelAppearanceType,
	YAxisLabelMode,
	YAxisLabelType,
} from '../../chart.config';
import EventBus from '../../events/event-bus';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { PriceMovement } from '../../model/candle-series.model';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { DataSeriesType } from '../../model/data-series.config';
import { DataSeriesModel } from '../../model/data-series.model';
import { ScaleModel } from '../../model/scale.model';
import { cloneUnsafe } from '../../utils/object.utils';
import { uuid } from '../../utils/uuid.utils';
import { PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { resolveColorForArea, resolveColorForBar, resolveColorForBaseLine, resolveColorForCandle, resolveColorForHistogram, resolveColorForLine, resolveColorForScatterPlot, resolveColorForTrendAndHollow, resolveDefaultColorForLabel } from './label-color.functions';
import { LabelsGroups, VisualYAxisLabel, YAxisLabelsProvider } from './price_labels/y-axis-labels.model';
import { YAxisScaleHandler } from './y-axis-scale.handler';
import { YAxisModel } from './y-axis.model';

export type LabelColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => string;

/**
 * Y axis component. Contains all Y axis related logic.
 */
export class YAxisComponent extends ChartBaseElement {
	private labelsColorByChartTypeMap: Partial<Record<DataSeriesType, LabelColorResolver>> = {};
	public yAxisScaleHandler: YAxisScaleHandler;
	public model: YAxisModel;
	public axisTypeSetSubject: Subject<PriceAxisType> = new Subject<PriceAxisType>();
	public readonly state: YAxisConfig;

	constructor(
		private eventBus: EventBus,
		config: FullChartConfig,
		private canvasModel: CanvasModel,
		public scale: ScaleModel,
		canvasInputListeners: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		chartPanComponent: ChartPanComponent,
		private cursors: CursorHandler,
		valueFormatter: (value: number) => string,
		dataSeriesProvider: () => DataSeriesModel | undefined,
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
			scale,
			canvasInputListeners,
			canvasBoundsContainer,
			canvasBoundsContainer.getBoundsHitTest(CanvasElement.PANE_UUID_Y_AXIS(paneUUID, extentIdx)),
			auto => scale.autoScale(auto),
		);
		this.addChildEntity(this.yAxisScaleHandler);
		//#endregion

		this.model = new YAxisModel(
			this.paneUUID,
			eventBus,
			this.state,
			canvasBoundsContainer,
			canvasModel,
			scale,
			valueFormatter,
			dataSeriesProvider,
			extentIdx,
		);
		this.addChildEntity(this.model);
		this.updateCursor();
		this.registerDefaultLabelColorResolvers();
	}

	/**
	 * Registers default label color resolvers for different chart types.
	 * @private
	 * @function
	 * @name registerDefaultLabelColorResolver
	 * @returns {void}
	 */
	private registerDefaultLabelColorResolvers() {
		this.registerLabelColorResolver('candle', resolveColorForCandle);
		this.registerLabelColorResolver('bar', resolveColorForBar);
		this.registerLabelColorResolver('line', resolveColorForLine);
		this.registerLabelColorResolver('area', resolveColorForArea);
		this.registerLabelColorResolver('scatterPlot', resolveColorForScatterPlot);
		this.registerLabelColorResolver('histogram', resolveColorForHistogram);
		this.registerLabelColorResolver('baseline', resolveColorForBaseLine);
		this.registerLabelColorResolver('trend', resolveColorForTrendAndHollow);
		this.registerLabelColorResolver('hollow', resolveColorForTrendAndHollow);
	}

	protected doActivate() {
		this.addRxSubscription(
			this.scale.beforeStartAnimationSubject.subscribe(
				() => this.state.type === 'percent' && this.scale.haltAnimation(),
			),
		);
	}

	private updateCursor() {
		if (this.state.type === 'percent') {
			this.cursors.setCursorForCanvasEl(
				CanvasElement.PANE_UUID_Y_AXIS(this.paneUUID, this.extentIdx),
				this.state.resizeDisabledCursor,
			);
		} else {
			this.cursors.setCursorForCanvasEl(
				CanvasElement.PANE_UUID_Y_AXIS(this.paneUUID, this.extentIdx),
				this.state.cursor,
			);
		}
	}

	/**
	 * Updates labels visual appearance on canvas
	 */
	public updateOrderedLabels(adjustYAxisWidth = false) {
		this.model.fancyLabelsModel.updateLabels(adjustYAxisWidth);
	}

	/**
	 * Registers a label color resolver for a specific chart type.
	 *
	 * @param {BarType} chartType - The type of chart for which the label color resolver is being registered.
	 * @param {LabelColorResolver} resolver - The function that will be used to resolve the color of the labels for the specified chart type.
	 * @returns {void}
	 */
	public registerLabelColorResolver(chartType: BarType, resolver: LabelColorResolver) {
		this.labelsColorByChartTypeMap[chartType] = resolver;
	}

	/**
	 * Returns a function that resolves the color for a label based on the type of data series.
	 * @param {DataSeriesType} candlesType - The type of data series.
	 * @returns {Function} - A function that resolves the color for a label.
	 * If there is no color mapping for the given data series type, it returns the default color resolver function.
	 */
	public getLabelsColorResolver(candlesType: DataSeriesType) {
		return this.labelsColorByChartTypeMap[candlesType] ?? resolveDefaultColorForLabel;
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
		this.model.fancyLabelsModel.registerYAxisLabelsProvider(groupName, provider, id);
		return id;
	}

	/**
	 * An easier way to manage custom y-axis labels, than y-axis labels providers.
	 * However, overlapping avoidance is not supported
	 * @param name
	 * @param label
	 */
	public addSimpleYAxisLabel(name: string, label: VisualYAxisLabel) {
		this.model.fancyLabelsModel.customLabels[name] = label;
		this.canvasModel.fireDraw();
	}
	/**
	 * @param name
	 */
	public deleteSimpleYAxisLabel(name: string) {
		delete this.model.fancyLabelsModel.customLabels[name];
		this.canvasModel.fireDraw();
	}

	public getAxisType(): PriceAxisType {
		return this.state.type;
	}

	/**
	 * Unregister a Y axis labels provider from the specified group.
	 * @param {string} groupName - The name of the group from which to unregister the provider. Defaults to LabelsGroups.MAIN.
	 * @param {string} id - The ID of the provider to unregister.
	 * @returns {string} - The ID of the unregistered provider.
	 */
	public unregisterYAxisLabelsProvider(groupName: string = LabelsGroups.MAIN, id: string): string {
		this.model.fancyLabelsModel.unregisterYAxisLabelsProvider(groupName, id);
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
			this.scale.autoScale(true);
			this.model.fancyLabelsModel.updateLabels(true);
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
		this.scale.setLockPriceToBarRatio(value);
	}

	/**
	 * Changes the visual type of particular label.
	 * @param type - label type
	 * @param mode - visual mode
	 */
	public changeLabelMode(type: YAxisLabelType, mode: YAxisLabelMode): void {
		this.state.labels.settings[type].mode = mode;
		this.model.fancyLabelsModel.updateLabels();
	}

	/**
	 * Changes the visual type of particular label.
	 * @param type - label type
	 * @param mode - visual mode
	 */
	public changeLabelAppearance(type: YAxisLabelType, mode: YAxisLabelAppearanceType): void {
		this.state.labels.settings[type].type = mode;
		this.model.fancyLabelsModel.updateLabels();
	}

	/**
	 * Sets the inverse price scale mode. Inverts Y axis vertically.
	 * Inversion also works for candles, drawings and overlay studies.
	 * @param inverse - true or false
	 */
	public togglePriceScaleInverse(inverse: boolean): void {
		this.scale.state.inverse = inverse;
		this.scale.inverseY = inverse;
		this.scale.scaleInversedSubject.next(inverse);
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
