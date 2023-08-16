/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import EventBus from '../../events/event-bus';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasInputListenerComponent, Point } from '../../inputlisteners/canvas-input-listener.component';
import { ScaleModel } from '../../model/scale.model';
import { ChartModel } from '../chart/chart.model';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { DragNDropXComponent } from '../dran-n-drop_helper/drag-n-drop-x.component';
import { ChartPanComponent } from '../pan/chart-pan.component';

// TODO find out why do we need this correction
const NAV_MAP_KNOT_CORRECTION = 4;

export class NavigationMapMoveHandler extends ChartBaseElement {
	private leftKnotDragStartXRelative: number = 0;
	private rightKnotDragStartXRelative: number = 0;
	private lastMousePosition: number = 0;

	constructor(
		private bus: EventBus,
		private chartModel: ChartModel,
		private scaleModel: ScaleModel,
		private canvasInputListeners: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private chartPanComponent: ChartPanComponent,
	) {
		super();
		//#region knots
		const knotLeftHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.N_MAP_KNOT_L);
		const knotRightHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.N_MAP_KNOT_R);

		const leftKnotDNDComponent = new DragNDropXComponent(
			knotLeftHitTest,
			{
				onDragStart: this.leftKnotDragStart,
				onDragTick: this.leftKnotDragTick,
			},
			this.canvasInputListeners,
			this.chartPanComponent,
		);

		const rightKnotDNDComponent = new DragNDropXComponent(
			knotRightHitTest,
			{
				onDragStart: this.rightKnotDragStart,
				onDragTick: this.rightKnotDragTick,
			},
			this.canvasInputListeners,
			this.chartPanComponent,
		);

		this.addChildEntity(leftKnotDNDComponent);
		this.addChildEntity(rightKnotDNDComponent);
		//#endregion

		//#region slider
		const sliderHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.N_MAP_SLIDER_WINDOW);

		const sliderDNDComponent = new DragNDropXComponent(
			sliderHitTest,
			{
				onDragStart: this.sliderDragStart,
				onDragTick: this.sliderDragTick,
			},
			this.canvasInputListeners,
			this.chartPanComponent,
		);
		this.addChildEntity(sliderDNDComponent);
		//#endregion
	}

	/**
	 * Method that activates the navigation map buttons and subscribes to their click and touch events.
	 * It also subscribes to the xChanged event of the scaleModel and updates the canvasBoundsContainer accordingly.
	 * @returns {void}
	 */
	protected doActivate() {
		super.doActivate();
		//#region btns
		const btnLeftHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.N_MAP_BTN_L);
		this.addRxSubscription(
			this.canvasInputListeners.observeClick(btnLeftHitTest).subscribe(() => {
				this.scaleModel.moveXStart(this.scaleModel.xStart - 1);
			}),
		);
		this.addRxSubscription(
			this.canvasInputListeners.observeTouchStart(btnLeftHitTest).subscribe(() => {
				this.scaleModel.moveXStart(this.scaleModel.xStart - 1);
			}),
		);
		const btnRightHitTest = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.N_MAP_BTN_R);
		this.addRxSubscription(
			this.canvasInputListeners.observeClick(btnRightHitTest).subscribe(() => {
				this.scaleModel.moveXStart(this.scaleModel.xStart + 1);
			}),
		);
		this.addRxSubscription(
			this.canvasInputListeners.observeTouchStart(btnRightHitTest).subscribe(() => {
				this.scaleModel.moveXStart(this.scaleModel.xStart + 1);
			}),
		);
		this.addRxSubscription(
			this.scaleModel.xChanged.subscribe(() => {
				const candleSeries = this.chartModel.mainCandleSeries;
				this.canvasBoundsContainer.leftRatio = candleSeries.dataIdxStart / (candleSeries.dataPoints.length - 1);
				this.canvasBoundsContainer.rightRatio = candleSeries.dataIdxEnd / (candleSeries.dataPoints.length - 1);
				this.canvasBoundsContainer.recalculateNavigationMapElementBounds();
				this.bus.fireDraw();
			}),
		);
		//#endregion
	}

	private leftKnotDragStart = (point: Point) => {
		const nMapChart = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_CHART);
		this.leftKnotDragStartXRelative = point.x - nMapChart.x - NAV_MAP_KNOT_CORRECTION;
	};

	private leftKnotDragTick = (dragInfo: DragInfo) => {
		const { delta: xDelta } = dragInfo;
		const chart = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_CHART);
		const knotsWindowWidth = chart.width;
		const moveLeftRatio = (this.leftKnotDragStartXRelative + xDelta) / knotsWindowWidth;
		this.canvasBoundsContainer.leftRatio = moveLeftRatio;
		this.scaleModel.setXScale(
			Math.round(this.chartModel.mainCandleSeries.dataPoints.length * this.canvasBoundsContainer.leftRatio),
			this.scaleModel.xEnd,
		);
	};

	private rightKnotDragStart = (point: Point) => {
		const nMapChart = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_CHART);
		this.rightKnotDragStartXRelative = point.x - nMapChart.x + NAV_MAP_KNOT_CORRECTION;
	};

	private rightKnotDragTick = (dragInfo: DragInfo) => {
		const { delta: xDelta } = dragInfo;
		const nMapChart = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_CHART);
		const nMapChartWidth = nMapChart.width;
		const moveRightRatio = (this.rightKnotDragStartXRelative + xDelta) / nMapChartWidth;
		this.canvasBoundsContainer.rightRatio = moveRightRatio;
		this.scaleModel.setXScale(
			this.scaleModel.xStart,
			Math.round(this.chartModel.mainCandleSeries.dataPoints.length * this.canvasBoundsContainer.rightRatio),
		);
	};

	private sliderDragStart = () => {
		this.lastMousePosition = 0;
	};

	private sliderDragTick = (dragInfo: DragInfo) => {
		const { delta: absoluteXDelta } = dragInfo;
		const navMap = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_CHART);
		const moveMultiplier =
			this.chartModel.mainCandleSeries.meanCandleWidth /
			(navMap.width / this.chartModel.mainCandleSeries.dataPoints.length);
		const step = (this.lastMousePosition - absoluteXDelta) * moveMultiplier;
		this.scaleModel.moveXStart(this.scaleModel.xStart - step);
		this.lastMousePosition = absoluteXDelta;
	};
}
