/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { merge as mergeRx } from 'rxjs';
import { CanvasAnimation } from './animation/canvas-animation';
import { CHART_UUID, CanvasBoundsContainer, CanvasElement } from './canvas/canvas-bounds-container';
import { ValidatedChartElements } from './canvas/chart-elements';
import { CursorHandler } from './canvas/cursor.handler';
import { createDefaultLayoutTemplate, extractElements } from './canvas/layout-creator';
import ChartContainer from './chart-container';
import {
	BarType,
	ChartColors,
	ChartConfigComponentsOffsets,
	FullChartConfig,
	GridComponentConfig,
	PartialChartConfig,
	mergeWithDefaultConfig,
} from './chart.config';
import { ChartBaseModel } from './components/chart/chart-base.model';
import { ChartComponent } from './components/chart/chart.component';
import { ChartModel } from './components/chart/chart.model';
import { CrossToolComponent } from './components/cross_tool/cross-tool.component';
import { CrossToolType } from './components/cross_tool/cross-tool.model';
import { EventsComponent } from './components/events/events.component';
import { GridComponent } from './components/grid/grid.component';
import { HighLowComponent } from './components/high_low/high-low.component';
import { HighlightsComponent } from './components/highlights/highlights.component';
import { Highlight } from './components/highlights/highlights.model';
import { NavigationMapComponent } from './components/navigation_map/navigation-map.component';
import { ChartPanComponent } from './components/pan/chart-pan.component';
import { PaneManager } from './components/pane/pane-manager.component';
import { YExtentFormatters } from './components/pane/pane.component';
import { SnapshotComponent } from './components/snapshot/snapshot.component';
import { VolumesComponent } from './components/volumes/volumes.component';
import { WaterMarkComponent } from './components/watermark/water-mark.component';
import { XAxisComponent } from './components/x_axis/x-axis.component';
import { YAxisComponent } from './components/y_axis/y-axis.component';
import { ClearCanvasDrawer } from './drawers/clear-canvas.drawer';
import { DrawingManager } from './drawers/drawing-manager';
import EventBus from './events/event-bus';
import { EVENT_DRAW } from './events/events';
import { CandleTapHandler } from './inputhandlers/candle-tap.handler';
import { ChartResizeHandler } from './inputhandlers/chart-resize.handler';
import { CrossEventProducerComponent } from './inputhandlers/cross-event-producer.component';
import { HoverProducerComponent } from './inputhandlers/hover-producer.component';
import { CanvasInputListenerComponent, Point } from './inputlisteners/canvas-input-listener.component';
import { CanvasModel, createCanvasModel, createMainCanvasModel } from './model/canvas.model';
import { ChartEntity } from './model/chart-base-element';
import { HitTestCanvasModel } from './model/hit-test-canvas.model';
import { ScaleModel } from './model/scale.model';
import { TimeZoneModel } from './model/time-zone.model';
import { clearerSafe } from './utils/function.utils';
import { merge } from './utils/merge.utils';
import { DeepPartial } from './utils/object.utils';

export type FitType = 'studies' | 'orders' | 'positions';

export default class ChartBootstrap implements ChartContainer {
	// can be used for convenient ID storing
	// is NOT used inside anyhow
	public id: string;
	public bus: EventBus;
	config: FullChartConfig;
	parentElement: HTMLElement;
	public elements: ValidatedChartElements;
	components: Array<any> = [];
	public chartComponents: Array<ChartEntity> = [];
	public xAxisComponent: XAxisComponent;
	public yAxisComponent: YAxisComponent;
	public watermarkComponent: WaterMarkComponent;
	public snapshotComponent: SnapshotComponent;
	public navigationMapComponent: NavigationMapComponent;
	// components list which listen for mouse and keyboard
	userInputListenerComponents: Array<ChartEntity> = [];
	public drawingManager: DrawingManager;
	public crossEventProducer: CrossEventProducerComponent;
	public cursorHandler: CursorHandler;
	clearer: () => void;
	public scaleModel: ScaleModel;
	public timeZoneModel: TimeZoneModel;
	chartModel: ChartModel;
	public backgroundCanvasModel: CanvasModel;
	public mainCanvasModel: CanvasModel;
	public dataSeriesCanvasModel: CanvasModel;
	public overSeriesCanvasModel: CanvasModel;
	public hitTestCanvasModel: HitTestCanvasModel;
	public canvasBoundsContainer: CanvasBoundsContainer;
	public canvasInputListener: CanvasInputListenerComponent;
	public volumesComponent: VolumesComponent;
	public highlightsComponent: HighlightsComponent;
	public chartComponent: ChartComponent;
	public eventsComponent: EventsComponent;
	public crossToolComponent: CrossToolComponent;
	public chartPanComponent: ChartPanComponent;
	public paneManager: PaneManager;
	public hoverProducer: HoverProducerComponent;
	public canvasModels: CanvasModel[] = [];
	public chartResizeHandler: ChartResizeHandler;

	public canvasAnimation: CanvasAnimation;
	constructor(element: HTMLElement, userConfig: PartialChartConfig = {}) {
		this.parentElement = element;

		// @ts-ignore
		// eslint-disable-next-line no-restricted-syntax
		const config = userConfig as FullChartConfig;
		mergeWithDefaultConfig(config);
		this.config = config;

		const chartLayoutTemplate = createDefaultLayoutTemplate(config);
		element.innerHTML = '';
		element.appendChild(chartLayoutTemplate.content);

		this.id = element.getAttribute('data-id') ?? '';

		if (config.fixedSize) {
			element.style.width = config.fixedSize.width + 'px';
			element.style.height = config.fixedSize.height + 'px';
		}
		const timeZoneModel = new TimeZoneModel(config);
		this.timeZoneModel = timeZoneModel;
		const formatterFactory = this.timeZoneModel.getFormatterFactory();

		const elements = extractElements(element);
		this.elements = elements;

		const eventBus = new EventBus();
		this.bus = eventBus;

		const chartResizeHandler = new ChartResizeHandler(
			element,
			elements.chartResizer ?? element,
			eventBus,
			this.canvasModels,
			config,
		);
		this.chartResizeHandler = chartResizeHandler;
		chartResizeHandler.subscribeResize();
		this.components.push(chartResizeHandler.unsubscribeAnimationUpdate.bind(chartResizeHandler));
		const drawingManager = new DrawingManager(eventBus, chartResizeHandler);
		this.drawingManager = drawingManager;
		const mainCanvasModel = createMainCanvasModel(
			eventBus,
			elements.mainCanvas,
			elements.chartResizer,
			this.config.components.chart.type,
			this.config,
			drawingManager,
			this.canvasModels,
		);
		this.mainCanvasModel = mainCanvasModel;
		const overSeriesCanvasModel = createCanvasModel(
			eventBus,
			elements.overDataSeriesCanvas,
			config,
			drawingManager,
			this.canvasModels,
			elements.chartResizer,
		);
		this.overSeriesCanvasModel = overSeriesCanvasModel;
		const overSeriesCanvasClearDrawer = new ClearCanvasDrawer(overSeriesCanvasModel);
		drawingManager.addDrawer(overSeriesCanvasClearDrawer, 'OVER_SERIES_CLEAR');
		this.dataSeriesCanvasModel = createCanvasModel(
			eventBus,
			elements.dataSeriesCanvas,
			config,
			drawingManager,
			this.canvasModels,
			elements.chartResizer,
		);
		const dataSeriesCanvasClearDrawer = new ClearCanvasDrawer(this.dataSeriesCanvasModel);
		drawingManager.addDrawer(dataSeriesCanvasClearDrawer, 'SERIES_CLEAR');
		const yAxisLabelsCanvasModel = createCanvasModel(
			eventBus,
			elements.yAxisLabelsCanvas,
			config,
			drawingManager,
			this.canvasModels,
			elements.chartResizer,
		);
		const canvasBoundsContainer = new CanvasBoundsContainer(
			config,
			eventBus,
			mainCanvasModel,
			formatterFactory,
			chartResizeHandler,
		);
		this.canvasBoundsContainer = canvasBoundsContainer;
		//#region  main canvas user input listeners
		const mainCanvasParent = elements.mainCanvas.parentElement;
		if (mainCanvasParent === null) {
			throw new Error(`Couldn't get main canvas parent`);
		}
		const canvasInputListener = new CanvasInputListenerComponent(eventBus, mainCanvasParent);
		this.canvasInputListener = canvasInputListener;
		this.chartComponents.push(this.canvasInputListener);
		//#endregion
		const hitTestCanvasModel = new HitTestCanvasModel(
			eventBus,
			elements.hitTestCanvas,
			canvasInputListener,
			canvasBoundsContainer,
			drawingManager,
			config,
			this.canvasModels,
			elements.chartResizer,
		);
		this.hitTestCanvasModel = hitTestCanvasModel;
		const hitTestClearCanvas = new ClearCanvasDrawer(hitTestCanvasModel);
		drawingManager.addDrawer(hitTestClearCanvas, 'HIT_TEST_CLEAR');
		//#endregion

		// canvas animation container
		const canvasAnimation = new CanvasAnimation(eventBus);
		this.canvasAnimation = canvasAnimation;

		//#region ScaleModel init
		const scaleModel = new ScaleModel(
			config,
			() => canvasBoundsContainer.getBounds(CanvasElement.CHART),
			canvasAnimation,
		);
		this.scaleModel = scaleModel;
		//#endregion

		const backgroundCanvasModel = createCanvasModel(
			eventBus,
			elements.backgroundCanvas,
			config,
			drawingManager,
			this.canvasModels,
			elements.chartResizer,
			{
				// can be read frequently, see {redrawBackgroundArea} function
				willReadFrequently: true,
			},
		);
		this.backgroundCanvasModel = backgroundCanvasModel;

		this.cursorHandler = new CursorHandler(
			elements.canvasArea,
			canvasInputListener,
			canvasBoundsContainer,
			hitTestCanvasModel,
		);
		this.chartComponents.push(this.cursorHandler);

		this.crossEventProducer = new CrossEventProducerComponent(canvasInputListener, canvasBoundsContainer);
		this.chartComponents.push(this.crossEventProducer);
		const chartBaseModel = new ChartBaseModel('candle');
		const chartPanComponent = new ChartPanComponent(
			eventBus,
			scaleModel,
			canvasBoundsContainer,
			config,
			canvasAnimation,
			canvasInputListener,
			mainCanvasParent,
			chartBaseModel,
		);
		this.chartPanComponent = chartPanComponent;
		this.chartComponents.push(chartPanComponent);
		this.userInputListenerComponents.push(chartPanComponent.chartAreaPanHandler);

		const paneManager = new PaneManager(
			chartBaseModel,
			this.userInputListenerComponents,
			eventBus,
			scaleModel,
			canvasBoundsContainer,
			config,
			canvasAnimation,
			canvasInputListener,
			drawingManager,
			this.dataSeriesCanvasModel,
			this.cursorHandler,
			this.crossEventProducer,
			chartPanComponent,
			mainCanvasModel,
		);
		this.paneManager = paneManager;
		this.chartComponents.push(paneManager);
		this.chartModel = new ChartModel(
			chartBaseModel,
			paneManager,
			eventBus,
			this.dataSeriesCanvasModel,
			config,
			scaleModel,
			formatterFactory,
			mainCanvasParent,
			canvasBoundsContainer,
			chartResizeHandler,
		);
		//#region main chart component init
		const chartComponent = new ChartComponent(
			this.chartModel,
			this.dataSeriesCanvasModel,
			config,
			scaleModel,
			canvasBoundsContainer,
			drawingManager,
			hitTestCanvasModel,
			canvasInputListener,
			backgroundCanvasModel,
			chartPanComponent,
			paneManager,
			this.cursorHandler,
		);
		this.chartComponents.push(chartComponent);
		this.chartComponent = chartComponent;
		const chartModel = this.chartComponent.chartModel;
		this.chartModel = chartModel;
		this.canvasBoundsContainer.setMainCandleSeries(this.chartModel.mainCandleSeries);
		hitTestCanvasModel.addSubscriber(paneManager.hitTestController);
		// X-axis component
		this.xAxisComponent = new XAxisComponent(
			eventBus,
			config,
			mainCanvasModel,
			chartComponent,
			scaleModel,
			canvasBoundsContainer,
			canvasInputListener,
			chartResizeHandler,
			this.drawingManager,
			timeZoneModel,
			chartPanComponent,
			this.cursorHandler,
			backgroundCanvasModel,
		);
		this.chartComponents.push(this.xAxisComponent);
		this.userInputListenerComponents.push(this.xAxisComponent.xAxisScaleHandler);
		const mainCanvasClearDrawer = new ClearCanvasDrawer(mainCanvasModel);
		drawingManager.addDrawer(mainCanvasClearDrawer, 'MAIN_CLEAR');
		const candleTap = new CandleTapHandler(mainCanvasParent, chartModel, canvasInputListener, config);
		this.chartComponents.push(candleTap);
		// watermark component
		this.watermarkComponent = new WaterMarkComponent(
			paneManager,
			chartModel,
			eventBus,
			config,
			canvasBoundsContainer,
			overSeriesCanvasModel,
			drawingManager,
		);
		this.chartComponents.push(this.watermarkComponent);
		const crossToolCanvasModel = createCanvasModel(
			eventBus,
			elements.crossToolCanvas,
			config,
			drawingManager,
			this.canvasModels,
			elements.chartResizer,
		);
		this.highlightsComponent = new HighlightsComponent(
			eventBus,
			config,
			chartModel,
			mainCanvasModel,
			canvasBoundsContainer,
			drawingManager,
		);
		this.chartComponents.push(this.highlightsComponent);
		// setup default rules for UTC datetime override
		if (config.useUTCTimeOverride && config.dateFormatter && !config.dateFormatter.utcTimeOverride) {
			config.dateFormatter.utcTimeOverride = this.createUTCTimeOverrideConfig(chartModel);
		}
		// X navigation area component
		this.navigationMapComponent = new NavigationMapComponent(
			eventBus,
			chartModel,
			mainCanvasModel,
			config,
			canvasInputListener,
			canvasBoundsContainer,
			drawingManager,
			formatterFactory,
			chartPanComponent,
			this.cursorHandler,
		);
		this.chartComponents.push(this.navigationMapComponent);
		this.userInputListenerComponents.push(this.navigationMapComponent.navigationMapMoveHandler);
		// high low component
		const highLowComponent = new HighLowComponent(
			config,
			this.dataSeriesCanvasModel,
			chartModel,
			canvasBoundsContainer,
			drawingManager,
		);
		this.chartComponents.push(highLowComponent);
		// Y-axis component
		this.yAxisComponent = new YAxisComponent(
			eventBus,
			config,
			mainCanvasModel,
			yAxisLabelsCanvasModel,
			backgroundCanvasModel,
			chartModel,
			scaleModel,
			this.canvasInputListener,
			canvasBoundsContainer,
			this.drawingManager,
			chartPanComponent,
			paneManager,
			this.cursorHandler,
		);
		this.chartComponents.push(this.yAxisComponent);
		this.userInputListenerComponents.push(this.yAxisComponent.yAxisScaleHandler);
		this.volumesComponent = new VolumesComponent(
			this.dataSeriesCanvasModel,
			chartComponent,
			scaleModel,
			canvasBoundsContainer,
			drawingManager,
			config,
			paneManager,
			this.yAxisComponent,
		);
		this.chartComponents.push(this.volumesComponent);
		// grid component
		const mainChartGridComponent = new GridComponent(
			mainCanvasModel,
			scaleModel,
			config,
			'GRID',
			drawingManager,
			() => this.canvasBoundsContainer.getBounds(CanvasElement.ALL_PANES),
			() => this.canvasBoundsContainer.getBounds(CanvasElement.PANE_UUID(CHART_UUID)),
			() => this.xAxisComponent.xAxisLabelsGenerator.labels,
			() => this.yAxisComponent.yAxisModel.yAxisBaseLabelsModel.labels,
			() => this.chartModel.toY(this.chartModel.getBaseLine()),
			() => config.components.grid.visible,
		);
		this.chartComponents.push(mainChartGridComponent);
		this.hoverProducer = new HoverProducerComponent(
			this.crossEventProducer,
			scaleModel,
			config,
			chartModel,
			canvasInputListener,
			this.canvasBoundsContainer,
			this.paneManager,
			timeZoneModel,
			formatterFactory,
		);
		this.chartComponents.push(this.hoverProducer);

		this.crossToolComponent = new CrossToolComponent(
			config,
			crossToolCanvasModel,
			canvasBoundsContainer,
			drawingManager,
			paneManager,
			this.crossEventProducer,
			this.hoverProducer,
		);

		this.chartComponents.push(this.crossToolComponent);
		// Snapshot component
		const snapshotCanvasModel = createCanvasModel(
			eventBus,
			elements.snapshotCanvas,
			config,
			drawingManager,
			this.canvasModels,
			elements.chartResizer,
		);
		const snapshotComponent = new SnapshotComponent(this.elements, snapshotCanvasModel);
		this.snapshotComponent = snapshotComponent;
		this.chartComponents.push(snapshotComponent);
		// events
		const eventsComponent = new EventsComponent(
			config,
			overSeriesCanvasModel,
			hitTestCanvasModel,
			chartModel,
			canvasBoundsContainer,
			drawingManager,
			formatterFactory,
			this.cursorHandler,
			backgroundCanvasModel,
		);
		this.eventsComponent = eventsComponent;
		this.chartComponents.push(eventsComponent);

		// Temporary solution - all in one place
		this.chartComponents.forEach(c => c.activate());
		this.enableUserControls();

		drawingManager.reorderDrawers(config.drawingOrder);

		this.clearer = clearerSafe(this.components);
	}

	// TODO remove chartModel dependency, put period to global config somewhere
	/**
	 * Creates a configuration object for overriding UTC time in a chart.
	 * @param {ChartModel} chartModel - The chart model object.
	 * @returns {Object} - The configuration object containing a pattern and a test function.
	 * The pattern is a string representing the date format to be used for the override.
	 * The test function checks if the pattern contains hours/minutes/seconds and if the current chart period is more than 1 day.
	 * If both conditions are met, the function returns true, indicating that the override should be applied.
	 * Note: The chartModel dependency should be removed and the period should be put in a global config somewhere.
	 */
	createUTCTimeOverrideConfig(chartModel: ChartModel) {
		// default rules for UTC datetime override - if datetime pattern contains hours/minutes/seconds and current
		// chart period is more than 1d we override it with simple UTC date without any specific timezones applied
		const re = new RegExp('HH|H|mm|m|s|ss|sss|SSS');
		return {
			pattern: 'MM/dd/YY',
			test: (pattern: string) => re.test(pattern) && (chartModel.getPeriod() || 0) >= 86400,
		};
	}

	/**
	 * Merges a local configuration object with a global configuration object recursively.
	 * @template L - Type of the local configuration object.
	 * @param {L} local - The local configuration object to be merged.
	 * @param {Record<string, any>} global - The global configuration object to be merged.
	 * @returns {L} - The merged local configuration object.
	 */
	static mergeConfig<L extends Record<string, any>>(local: L, global: Record<string, any>): L {
		for (const k in global) {
			if (k in local) {
				if (typeof local[k] === 'object') {
					ChartBootstrap.mergeConfig(local[k], global[k]);
				}
			} else {
				// @ts-ignore
				local[k] = global[k];
			}
		}
		return local;
	}

	/**
	 * Returns the FullChartConfig object.
	 *
	 * @returns {FullChartConfig} The FullChartConfig object.
	 */
	getConfig(): FullChartConfig {
		// eslint-disable-next-line no-restricted-syntax
		return this.config as FullChartConfig;
	}

	/**
	 * Sets the right-to-left (RTL) configuration of the component.
	 *
	 * @param {boolean} rtl - A boolean value indicating whether the component should be displayed in RTL mode.
	 * @returns {void}
	 */
	setRtl(rtl: boolean) {
		this.config.rtl = rtl;
		this.bus.fire(EVENT_DRAW);
	}

	setChartType(type: BarType): void {
		this.chartComponent.setChartType(type);
	}

	/**
	 * Disables user controls by deactivating all userInputListenerComponents and disabling hitTestCanvasModel.
	 * @returns {void}
	 */
	disableUserControls(): void {
		this.userInputListenerComponents.forEach(component => component.deactivate());
		this.hitTestCanvasModel.disableUserControls();
	}

	/**
	 * Enables user controls for the hit test canvas model and all the user input listener components.
	 * @returns {void}
	 */
	enableUserControls(): void {
		this.userInputListenerComponents.forEach(component => component.activate());
		this.hitTestCanvasModel.enableUserControls();
	}

	/**
	 * Sets the configuration for the grid component of the chart.
	 * @param {GridComponentConfig} config - The configuration object for the grid component.
	 * @returns {void}
	 */
	setGridConfig(config: GridComponentConfig): void {
		const gridComponent = this.config.components.grid;
		gridComponent.visible = config.visible ?? false;
		gridComponent.dash = config.dash ?? [0, 0];
		gridComponent.width = config.width ?? 1;
		gridComponent.color = config.color ?? '#FFFFFF';
		this.config.colors.chartAreaTheme.gridColor = config.color ?? '#FFFFFF';
		this.redraw();
	}

	/**
	 * Sets the visibility of the grid component.
	 * @param {boolean} visible - A boolean value indicating whether the grid should be visible or not.
	 * @returns {void}
	 */
	setGridVisible(visible: boolean) {
		if (this.config.components && this.config.components.grid) {
			this.config.components.grid.visible = visible;
			this.redraw();
		}
	}

	/**
	 * Sets the visibility of the vertical grid lines in the grid component.
	 * @param {boolean} showVertical - A boolean value indicating whether to show or hide the vertical grid lines.
	 * @returns {void}
	 */
	setGridVertical(showVertical: boolean) {
		this.config.components.grid.vertical = showVertical;
		this.redraw();
	}
	/**
	 * Sets the visibility of the horizontal grid lines in the chart.
	 * @param {boolean} showHorizontal - A boolean value indicating whether to show or hide the horizontal grid lines.
	 * @returns {void}
	 */
	setGridHorizontal(showHorizontal: boolean) {
		this.config.components.grid.horizontal = showHorizontal;
		this.redraw();
	}

	/**
	 * Deactivates the chart by clearing the canvas listeners and disabling user controls.
	 * This method is a hack and should not be used unless an activation/deactivation cycle is implemented.
	 * It is implemented to prevent memory leaks in the chart when components are deactivated.
	 * @returns {void}
	 * @todo This method should be revised soon.
	 */
	deactivate(): void {
		// Hack method
		// Try no to use this or clear until activation/deactivating cycle will be implemented
		// Had to implement this to support components deactivation (remove canvas listeners) just
		// for prevention of memory leaks in chart.
		// TODO: SHOULD BE REVISED SOON.
		this.clearer();
		this.disableUserControls();
		this.chartComponents.forEach(component => component.deactivate());
	}

	/**
	 * This method triggers the 'draw' event on the 'bus' object.
	 * @returns {void}
	 */
	redraw(): void {
		this.bus.fireDraw();
	}
	/**
	 * Returns the offsets of the chart components from the chart configuration object.
	 *
	 * @returns {ChartConfigComponentsOffsets} The offsets of the chart components.
	 */
	getOffsets(): ChartConfigComponentsOffsets {
		return this.config.components && this.config.components.offsets;
	}

	/**
	 * Sets the visibility of the volumes separately and updates the yAxis width.
	 * @param {boolean} separate - A boolean value indicating whether to show the volumes separately or not. Default value is false.
	 */
	showSeparateVolumes(separate: boolean = false) {
		if (this.volumesComponent) {
			this.volumesComponent.setShowVolumesSeparatly(separate);
			this.canvasBoundsContainer.updateYAxisWidths();
		}
	}

	/**
	 * Sets the auto scale property of the scale model.
	 * @param {boolean} auto - A boolean value indicating whether the auto scale is enabled or not. Default value is true.
	 */
	setAutoScale(auto: boolean = true) {
		this.scaleModel.autoScale(auto);
	}

	/**
	 * Sets the visibility of the borders of the candles in the chart.
	 * @param {boolean} show - A boolean value indicating whether to show or hide the borders of the candles. Default value is true.
	 * @returns {void}
	 */
	setShowCandleBorders(show: boolean = true): void {
		if (this.config.components && this.config.components.chart) {
			this.config.components.chart.showCandlesBorder = show;
			this.redraw();
		}
	}

	/**
	 * Returns related Y-axis coordinate by provided value
	 * @param price
	 */
	valueToY(price: number): number {
		return this.chartModel.toY(price);
	}

	/**
	 * Sets the visibility of the high-low component.
	 * @param {boolean} visible - Whether the high-low component should be visible or not. Default is true.
	 * @returns {void}
	 */
	setHighLowVisible(visible: boolean = true) {
		if (this.config.components && this.config.components.highLow) {
			this.config.components.highLow.visible = visible;
			this.redraw();
		}
	}

	/**
	 * Sets the visibility of the cross tool component.
	 * @param {string} type - The type of cross tool to be displayed. Default value is 'cross-and-labels'.
	 * @returns {void}
	 */
	setCrossToolVisible(type: CrossToolType = 'cross-and-labels') {
		if (this.config.components && this.config.components.crossTool) {
			this.config.components.crossTool.type = type;
			this.redraw();
		}
	}

	/**
	 * @deprecated use {@link highlightsComponent.setHighlightsVisible} instead
	 */
	setHighlightsVisible(visible: boolean = true): void {
		if (this.config.components?.highlights) {
			this.config.components.highlights.visible = visible;
			this.redraw();
		}
	}

	/**
	 * @deprecated use {@link highlightsComponent.setHighlights} instead
	 */
	setHighlightsData(data: Highlight[]): void {
		this.highlightsComponent.setHighlights(data);
	}

	/**
	 * Sets the colors of the chart.
	 *
	 * @param {DeepPartial<ChartColors>} colors - An object containing the colors to be set.
	 * @returns {void}
	 */
	setColors(colors: DeepPartial<ChartColors>) {
		merge(this.config.colors, colors, {
			addIfMissing: true,
			overrideExisting: true,
		});
		this.redraw();
	}

	/**
	 * Adds a mouse move event listener to a canvas element.
	 * @param {string} canvasElement - The ID of the canvas element to add the listener to.
	 * @param {function} handler - The function to be called when the mouse moves over the canvas element.
	 * @returns {function} - A function that removes the event listener when called.
	 */
	addMouseMoveOnChartElementHandler(canvasElement: string, handler: (point: Point) => void) {
		const elementBoundsHitTest = this.canvasBoundsContainer.getBoundsHitTest(canvasElement);
		const subscription = this.canvasInputListener.observeMouseMove(elementBoundsHitTest).subscribe(handler);
		return () => subscription.unsubscribe();
	}

	/**
	 * Adds a mouse enter event handler to a chart element.
	 *
	 * @param {string} canvasElement - The ID of the canvas element to attach the event handler to.
	 * @param {(mouseEnter: boolean) => void} handler - The function to be called when the mouse enters or leaves the element.
	 * @param {boolean} [skipWhileDragging=false] - Whether to skip the event while the user is dragging the chart.
	 * @returns {Function} - A function that can be called to unsubscribe from the event.
	 */
	addMouseEnterOnChartElementHandler(
		canvasElement: string,
		handler: (mouseEnter: boolean) => void,
		skipWhileDragging: boolean = false,
	) {
		const elementBoundsHitTest = this.canvasBoundsContainer.getBoundsHitTest(canvasElement);
		const subscription = this.canvasInputListener
			.observeMouseEnter(elementBoundsHitTest, skipWhileDragging)
			.subscribe(handler);
		return () => subscription.unsubscribe();
	}

	/**
	 * Adds a click event listener to a chart element on the canvas.
	 * @param {string} canvasElement - The element on the canvas to add the click event listener to.
	 * @param {function} handler - The function to be called when the element is clicked. It takes a Point object as a parameter.
	 * @returns {function} - A function that can be called to unsubscribe the click event listener.
	 */
	addClickOnChartElementHandler(canvasElement: string, handler: (point: Point) => void) {
		const elementBoundsHitTest = this.canvasBoundsContainer.getBoundsHitTest(canvasElement);
		const subscription = this.canvasInputListener.observeClick(elementBoundsHitTest).subscribe(handler);
		return () => subscription.unsubscribe();
	}

	/**
	 * Adds a drag event listener to the specified canvas element.
	 * @param {string} canvasElement - The ID of the canvas element to add the listener to.
	 * @param {(xPosition: number) => void} handler - The function to be called when a drag event occurs. It takes the x position of the drag event as a parameter.
	 * @returns {() => void} - A function that can be called to unsubscribe from the drag event listener.
	 */
	addDragEventsListener(canvasElement: string, handler: (xPosition: number) => void) {
		const elementBoundsHitTest = this.canvasBoundsContainer.getBoundsHitTest(canvasElement);
		const subscription = mergeRx(
			this.canvasInputListener.observeYDrag(elementBoundsHitTest),
			this.canvasInputListener.observeXDrag(elementBoundsHitTest),
		).subscribe(handler);
		return () => subscription.unsubscribe();
	}

	/**
	 * Contains tear-down logic for chart
	 * Use when you want to unmount the chart from the host app
	 */
	public destroy() {
		this.bus.setMuted(true);
		this.chartComponents.forEach(c => c.disable());
		this.parentElement.childNodes.forEach(n => n.remove());
		this.parentElement.style.width = '';
		this.parentElement.style.height = '';
	}

	/**
	 * Registers a chart component and includes it in the the chart lifecycle
	 * @param initComponent - a function for component init
	 * @param onComponentInit - will be called after component init
	 */
	public registerComponent<C extends ChartEntity>(
		initComponent: (chartInstance: ChartBootstrap) => C,
		onComponentInit?: (component: C) => void,
	): void {
		const component = initComponent(this);
		this.components.push(component);
		onComponentInit && onComponentInit(component);
		component.activate();
	}

	/**
	 * Registers number formatters for pane
	 * @param uuid - pane's id
	 * @param formatters - object, that contains 3 fileds: 'regular', 'percent', 'logarithmic'.
	 * Each filed must have it's own formatter.
	 * If 'percent' and 'logarithmic' formatters did not provided, 'regular' will be applied.
	 */
	public registerPaneFormatters(uuid: string, formatters: YExtentFormatters) {
		this.paneManager.paneComponents[uuid]?.setPaneValueFormatters(formatters);
	}
}
