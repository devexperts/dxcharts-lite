/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { CanvasBoundsContainer, CanvasElement, CHART_UUID } from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import {
	BarType,
	ChartConfigComponentsYAxis,
	FullChartColors,
	FullChartConfig,
	YAxisAlign,
	YAxisLabelAppearanceType,
	YAxisLabelMode,
	YAxisLabelType,
} from '../../chart.config';
import { ClearCanvasDrawer } from '../../drawers/clear-canvas.drawer';
import { CompositeDrawer } from '../../drawers/composite.drawer';
import { DrawingManager } from '../../drawers/drawing-manager';
import EventBus from '../../events/event-bus';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { PriceMovement } from '../../model/candle-series.model';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { DataSeriesType } from '../../model/data-series.config';
import { ScaleModel } from '../../model/scale.model';
import { uuid } from '../../utils/uuid.utils';
import { ChartModel } from '../chart/chart.model';
import { PriceAxisType } from '../labels_generator/numeric-axis-labels.generator';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { PaneManager } from '../pane/pane-manager.component';
import {
	resolveColorForArea,
	resolveColorForBar,
	resolveColorForBaseLine,
	resolveColorForCandle,
	resolveColorForHistogram,
	resolveColorForLine,
	resolveColorForScatterPlot,
	resolveColorForTrendAndHollow,
	resolveDefaultColorForLabel,
} from './label-color.functions';
import { LastCandleLabelsProvider } from './price_labels/last-candle-labels.provider';
import { LabelsGroups, VisualYAxisLabel, YAxisLabelsProvider } from './price_labels/y-axis-labels.model';
import { YAxisPriceLabelsDrawer } from './price_labels/y-axis-price-labels.drawer';
import { YAxisScaleHandler } from './y-axis-scale.handler';
import { YAxisDrawer } from './y-axis.drawer';
import { YAxisModel } from './y-axis.model';
import { YAxisWidthContributor } from '../../canvas/y-axis-bounds.container';

export type LabelColorResolver = (priceMovement: PriceMovement, colors: FullChartColors) => string;

/**
 * Y axis component. Contains all Y axis related logic.
 */
export class YAxisComponent extends ChartBaseElement {
	public yAxisScaleHandler: YAxisScaleHandler;
	yAxisModel: YAxisModel;
	public axisTypeSetSubject: Subject<PriceAxisType> = new Subject<PriceAxisType>();
	public readonly state: ChartConfigComponentsYAxis;
	private labelsColorByChartTypeMap: Partial<Record<DataSeriesType, LabelColorResolver>> = {};
	public drawer: CompositeDrawer;

	constructor(
		private eventBus: EventBus,
		private config: FullChartConfig,
		private canvasModel: CanvasModel,
		private yAxisLabelsCanvasModel: CanvasModel,
		private backgroundCanvasModel: CanvasModel,
		private chartModel: ChartModel,
		private scaleModel: ScaleModel,
		canvasInputListeners: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		drawingManager: DrawingManager,
		chartPanComponent: ChartPanComponent,
		paneManager: PaneManager,
		private cursorHandler: CursorHandler,
	) {
		super();
		this.state = config.components.yAxis;
		const yAxisCompositeDrawer = new CompositeDrawer();
		this.drawer = yAxisCompositeDrawer;
		const clearYAxis = new ClearCanvasDrawer(this.yAxisLabelsCanvasModel);
		yAxisCompositeDrawer.addDrawer(clearYAxis, 'YAXIS_CLEAR');
		this.registerDefaultLabelColorResolver();

		drawingManager.addDrawer(yAxisCompositeDrawer, 'Y_AXIS');

		//#region init yAxisScaleHandler
		this.yAxisScaleHandler = new YAxisScaleHandler(
			eventBus,
			this.state,
			chartPanComponent,
			scaleModel,
			canvasInputListeners,
			canvasBoundsContainer,
			canvasBoundsContainer.getBoundsHitTest(CanvasElement.PANE_UUID_Y_AXIS(CHART_UUID)),
			auto => scaleModel.autoScale(auto),
		);
		this.addChildEntity(this.yAxisScaleHandler);
		//#endregion

		this.yAxisModel = new YAxisModel(
			paneManager.paneComponents[CHART_UUID],
			eventBus,
			this.config,
			canvasBoundsContainer,
			canvasModel,
			chartModel,
			scaleModel,
		);
		this.addChildEntity(this.yAxisModel);

		// TODO hack, remove in future
		// @ts-ignore
		paneManager.paneComponents[CHART_UUID].yAxisLabelsGenerator = this.yAxisModel.yAxisLabelsGenerator;

		//#region init YAxisDrawer
		const yAxisDrawer = new YAxisDrawer(
			config,
			this.state,
			canvasModel,
			() => this.yAxisModel.yAxisBaseLabelsModel.labels,
			() => canvasBoundsContainer.getBounds(CanvasElement.Y_AXIS),
			() => this.state.visible,
			chartModel.pane.scaleModel.toY.bind(chartModel.pane.scaleModel),
		);
		yAxisCompositeDrawer.addDrawer(yAxisDrawer);
		//#endregion

		const yAxisLabelsDrawer = new YAxisPriceLabelsDrawer(
			() => this.yAxisModel.yAxisLabelsModel.orderedLabels,
			this.yAxisLabelsCanvasModel,
			this.backgroundCanvasModel,
			this.state,
			this.canvasBoundsContainer,
			this.config.colors.yAxis,
			this.yAxisModel.yAxisLabelsModel.customLabels,
		);
		yAxisCompositeDrawer.addDrawer(yAxisLabelsDrawer);

		//#region init YAxisLabels related stuff
		// default labels provider
		const lastCandleLabelsProvider = new LastCandleLabelsProvider(
			this.chartModel,
			this.config,
			this.chartModel.lastCandleLabelsByChartType,
			this.getLabelsColorResolver.bind(this),
		);

		this.registerYAxisLabelsProvider(lastCandleLabelsProvider, LabelsGroups.MAIN);
		//#endregion

		// TODO hack, remove when each pane will have separate y-axis component
		paneManager.paneComponents[CHART_UUID].mainYExtentComponent.getAxisType = () => this.state.type;
		this.updateCursor();
	}

	private updateCursor() {
		if (this.state.type === 'percent') {
			this.cursorHandler.setCursorForCanvasEl(
				CanvasElement.PANE_UUID_Y_AXIS(CHART_UUID),
				this.config.components.yAxis.resizeDisabledCursor,
			);
		} else {
			this.cursorHandler.setCursorForCanvasEl(
				CanvasElement.PANE_UUID_Y_AXIS(CHART_UUID),
				this.config.components.yAxis.cursor,
			);
		}
	}

	/**
	 * Updates labels visual appearance on canvas
	 */
	public updateOrderedLabels(adjustYAxisWidth = false) {
		this.yAxisModel.yAxisLabelsModel.updateLabels(adjustYAxisWidth);
	}

	/**
	 * Calls the parent class's doActivate method
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();
	}

	/**
	 * Registers default label color resolvers for different chart types.
	 * @private
	 * @function
	 * @name registerDefaultLabelColorResolver
	 * @returns {void}
	 */
	private registerDefaultLabelColorResolver() {
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
		this.yAxisModel.yAxisLabelsModel.registerYAxisLabelsProvider(groupName, provider, id);
		return id;
	}

	/**
	 * An easier way to manage custom y-axis labels, than y-axis labels providers.
	 * However, overlapping avoidance is not supported
	 * @param name
	 * @param label
	 */
	public addSimpleYAxisLabel(name: string, label: VisualYAxisLabel) {
		this.yAxisModel.yAxisLabelsModel.customLabels[name] = label;
		this.canvasModel.fireDraw();
	}
	/**
	 * @param name
	 */
	public deleteSimpleYAxisLabel(name: string) {
		delete this.yAxisModel.yAxisLabelsModel.customLabels[name];
		this.canvasModel.fireDraw();
	}

	/**
	 * Unregister a Y axis labels provider from the specified group.
	 * @param {string} groupName - The name of the group from which to unregister the provider. Defaults to LabelsGroups.MAIN.
	 * @param {string} id - The ID of the provider to unregister.
	 * @returns {string} - The ID of the unregistered provider.
	 */
	public unregisterYAxisLabelsProvider(groupName: string = LabelsGroups.MAIN, id: string): string {
		this.yAxisModel.yAxisLabelsModel.unregisterYAxisLabelsProvider(groupName, id);
		return id;
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
			this.yAxisModel.yAxisLabelsModel.updateLabels(true);
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
		this.yAxisModel.yAxisLabelsModel.updateLabels();
	}

	/**
	 * Changes the visual type of particular label.
	 * @param type - label type
	 * @param mode - visual mode
	 */
	public changeLabelAppearance(type: YAxisLabelType, mode: YAxisLabelAppearanceType): void {
		this.state.labels.settings[type].type = mode;
		this.yAxisModel.yAxisLabelsModel.updateLabels();
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
	//#endregion
}
