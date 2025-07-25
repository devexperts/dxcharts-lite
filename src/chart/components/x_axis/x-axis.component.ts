/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { merge, animationFrameScheduler } from 'rxjs';
import { distinctUntilChanged, map, throttleTime, filter } from 'rxjs/operators';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { ChartBaseElement } from '../../model/chart-base-element';
import { FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { CompositeDrawer } from '../../drawers/composite.drawer';
import { DrawingManager } from '../../drawers/drawing-manager';
import EventBus from '../../events/event-bus';
import { ChartResizeHandler } from '../../inputhandlers/chart-resize.handler';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../../model/scale.model';
import { TimeZoneModel } from '../../model/time-zone.model';
import { ChartComponent } from '../chart/chart.component';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { TimeFormatWithDuration } from './time/parser/time-formats.model';
import { XAxisLabelsDrawer } from './x-axis-labels.drawer';
import { XAxisLabelsGenerator, XAxisTimeLabelsGenerator } from './x-axis-labels.generator';
import { XAxisLabelsModel, XAxisLabelsProvider } from './x-axis-labels.model';
import { XAxisScaleHandler } from './x-axis-scale.handler';
import { XAxisTimeLabelsDrawer } from './x-axis-time-labels.drawer';
import { lastOf } from '../../utils/array.utils';
import { notEmpty } from '../../utils/function.utils';
import { availableBarTypes } from '../../chart.config';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';
/**
 * X-axis component, contains all x-axis calculation and rendering logic.
 */
export class XAxisComponent extends ChartBaseElement {
	public xAxisDrawer: XAxisTimeLabelsDrawer;
	public xAxisLabelsDrawer: XAxisLabelsDrawer;
	public xAxisLabelsGenerator: XAxisLabelsGenerator;
	readonly xAxisLabelsModel: XAxisLabelsModel;
	public xAxisScaleHandler: XAxisScaleHandler;

	constructor(
		private eventBus: EventBus,
		private config: FullChartConfig,
		public canvasModel: CanvasModel,
		public chartComponent: ChartComponent,
		private scale: ScaleModel,
		canvasBoundsContainer: CanvasBoundsContainer,
		canvasInputListener: CanvasInputListenerComponent,
		private chartResizeHandler: ChartResizeHandler,
		drawingManager: DrawingManager,
		private timeZoneModel: TimeZoneModel,
		chartPanComponent: ChartPanComponent,
		cursorHandler: CursorHandler,
		hitTestCanvasModel: HitTestCanvasModel,
	) {
		super();
		const xAxisLabelsGenerator = new XAxisTimeLabelsGenerator(
			eventBus,
			config,
			chartComponent.chartModel,
			scale,
			timeZoneModel,
			this.canvasModel,
			canvasBoundsContainer,
		);
		this.xAxisLabelsGenerator = xAxisLabelsGenerator;

		this.xAxisLabelsModel = new XAxisLabelsModel(eventBus, []);
		const xAxisCompositeDrawer = new CompositeDrawer();
		drawingManager.addDrawer(xAxisCompositeDrawer, 'X_AXIS');

		this.xAxisDrawer = new XAxisTimeLabelsDrawer(
			config,
			canvasModel,
			scale,
			canvasBoundsContainer,
			() => this.xAxisLabelsGenerator.labels,
			() => config.components.xAxis.visible,
		);
		xAxisCompositeDrawer.addDrawer(this.xAxisDrawer);
		this.xAxisLabelsDrawer = new XAxisLabelsDrawer(
			config,
			canvasModel,
			canvasBoundsContainer,
			this.xAxisLabelsModel,
		);
		xAxisCompositeDrawer.addDrawer(this.xAxisLabelsDrawer);

		this.xAxisScaleHandler = new XAxisScaleHandler(
			scale,
			canvasInputListener,
			canvasBoundsContainer,
			chartPanComponent,
			this.chartComponent.chartModel,
			canvasBoundsContainer.getBoundsHitTest(CanvasElement.X_AXIS),
			hitTestCanvasModel,
		);
		this.addChildEntity(this.xAxisScaleHandler);
		cursorHandler.setCursorForCanvasEl(CanvasElement.X_AXIS, config.components.xAxis.cursor);
	}

	/**
	 * This method is used to activate the chart and update the labels if there is a new data set or equivolume type.
	 * It subscribes to the chart type change, candles set subject, candles updated subject, and time zone change to generate new labels.
	 * It also subscribes to the x-axis scale change and canvas resize to recalculate the labels.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();

		// do update labels if new data set
		this.addRxSubscription(
			merge(
				this.chartComponent.chartModel.candlesSetSubject,
				this.timeZoneModel.observeTimeZoneChanged(),
			).subscribe(() => {
				this.xAxisLabelsGenerator.generateLabels();
			}),
		);

		this.addRxSubscription(
			this.chartComponent.chartModel.candlesPrependSubject
				.pipe(
					filter(({ prependedCandles }) => prependedCandles.length !== 0),
					map(({ prependedCandles }) =>
						this.chartComponent.chartModel.mainCandleSeries.visualPoints.slice(0, prependedCandles.length),
					),
				)
				.subscribe(newCandles => {
					//@ts-ignore
					if (availableBarTypes.includes(this.config.components.chart.type)) {
						this.xAxisLabelsGenerator.updateHistoryLabels?.(newCandles);
					}
				}),
		);

		// recalculate existing ones, the number of labels is static
		if (this.config.components.chart.minCandlesOffset) {
			this.addRxSubscription(
				merge(this.scale.xChanged, this.chartResizeHandler.canvasResized)
					.pipe(throttleTime(50, animationFrameScheduler, { trailing: true, leading: true }))
					.subscribe(() => this.xAxisLabelsGenerator.recalculateLabels()),
			);
			// generate visible viewport range labels (real and fake candles), the number of labels is dynamic
		} else {
			this.addRxSubscription(
				merge(this.scale.xChanged, this.chartResizeHandler.canvasResized)
					.pipe(throttleTime(150, animationFrameScheduler, { trailing: true, leading: true }))
					.subscribe(() => this.xAxisLabelsGenerator.generateLabels(undefined, true)),
			);
		}

		this.addRxSubscription(
			this.chartComponent.chartModel.candlesUpdatedSubject
				.pipe(
					map(() => lastOf(this.chartComponent.chartModel.mainCandleSeries.visualPoints)),
					distinctUntilChanged((a, b) => a?.candle?.id === b?.candle?.id),
					filter(notEmpty),
				)
				.subscribe(x => this.xAxisLabelsGenerator?.updateLastLabel?.(x)),
		);
	}

	/**
	 * Returns the xAxisDrawer object.
	 *
	 * @returns {Object} The xAxisDrawer object.
	 */
	public getDrawer() {
		return this.xAxisDrawer;
	}

	//#region public methods
	/**
	 * You can add a custom labels provider for additional labels on XAxis (like for drawings)
	 * @param provider
	 */
	public registerXAxisLabelsProvider(provider: XAxisLabelsProvider) {
		this.xAxisLabelsModel.labelProviders.push(provider);
	}

	/**
	 * Controls visibility of the x-axis
	 */
	public setVisible(isVisible: boolean) {
		if (this.config.components?.xAxis) {
			this.config.components.xAxis.visible = isVisible;
			this.eventBus.fireDraw();
		}
	}

	/**
	 * Set new config for x labels formatting
	 */
	public setFormatsForLabelsConfig(newFormatsByWeightMap: Record<TimeFormatWithDuration, string>) {
		if (this.xAxisLabelsGenerator instanceof XAxisTimeLabelsGenerator) {
			this.xAxisLabelsGenerator.setFormatsForLabelsConfig(newFormatsByWeightMap);
		} else {
			console.error('Format config for x-axis is not available');
		}
	}

	/**
	 * If visible, when you can see the x-axis on the chart
	 */
	public isVisible(): boolean {
		return this.config.components?.xAxis.visible ?? false;
	}

	/* This function assigns a callback to be executed when a double-click event is detected.
	 * It accepts one parameter `cb`, which is a callback function.
	 * When a double-click event occurs, the specified callback function `cb` will be invoked.
	 * By default it calls basic scale on XAxis
	 */
	public setDblClickCallback = (cb: () => void) => this.xAxisScaleHandler.setDblClickCallback(cb);

	/* This function assigns a callback to be executed when a double-tap event is detected.
	 * Similar to the dblclick function, it takes one parameter `cb`, which is a callback function.
	 * This function ensures that the callback `cb` is called whenever a double-tap event is triggered.
	 * By default it calls basic scale on XAxis
	 */
	public setDblTapCallback = (cb: () => void) => this.xAxisScaleHandler.setDblTapCallback(cb);
	//#endregion
}
