/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { merge } from 'rxjs';
import { filter, pairwise } from 'rxjs/operators';
import { FullChartConfig } from '../../chart.config';
import { ChartBaseElement } from '../../model/chart-base-element';
import EventBus from '../../events/event-bus';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { CanvasModel } from '../../model/canvas.model';
import { DrawingManager } from '../../drawers/drawing-manager';
import { EVENT_RESIZED } from '../../events/events';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { DateTimeFormatterFactory } from '../../model/date-time.formatter';
import { ChartModel } from '../chart/chart.model';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { NavigationMapDrawer } from './navigation-map.drawer';
import { NavigationMapMoveHandler } from './navigation-map-move.handler';
import { floor } from '../../utils/math.utils';

/**
 * Navigation map component for chart.
 * Controls navigation map in the bottom.
 */
export class NavigationMapComponent extends ChartBaseElement {
	private visualCandles: Array<[number, number]> = [];
	public navigationMapMoveHandler: NavigationMapMoveHandler;

	constructor(
		protected eventBus: EventBus,
		private chartModel: ChartModel,
		private canvasModel: CanvasModel,
		private config: FullChartConfig,
		private canvasInputListeners: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		drawingManager: DrawingManager,
		formatterFactory: DateTimeFormatterFactory,
		private chartPanComponent: ChartPanComponent,
		cursorHandler: CursorHandler,
	) {
		super();

		const navigationMapDrawer = new NavigationMapDrawer(
			config,
			chartModel,
			canvasModel,
			canvasBoundsContainer,
			formatterFactory,
			() => this.visualCandles,
		);
		drawingManager.addDrawer(navigationMapDrawer, CanvasElement.N_MAP_CHART);
		this.navigationMapMoveHandler = new NavigationMapMoveHandler(
			this.eventBus,
			this.chartModel,
			this.chartModel.scaleModel,
			this.canvasInputListeners,
			this.canvasBoundsContainer,
			this.chartPanComponent,
		);
		cursorHandler.setCursorForCanvasEl(CanvasElement.N_MAP_CHART, config.components.navigationMap.cursors.chart);
		cursorHandler.setCursorForCanvasEl(
			CanvasElement.N_MAP_BTN_L,
			config.components.navigationMap.cursors.buttonLeft,
		);
		cursorHandler.setCursorForCanvasEl(
			CanvasElement.N_MAP_BTN_R,
			config.components.navigationMap.cursors.buttonRight,
		);
		cursorHandler.setCursorForCanvasEl(
			CanvasElement.N_MAP_KNOT_L,
			config.components.navigationMap.cursors.leftResizer,
		);
		cursorHandler.setCursorForCanvasEl(
			CanvasElement.N_MAP_KNOT_R,
			config.components.navigationMap.cursors.rightResizer,
		);
		cursorHandler.setCursorForCanvasEl(
			CanvasElement.N_MAP_SLIDER_WINDOW,
			config.components.navigationMap.cursors.slider,
		);
	}

	/**
	 * Method to activate the chart. It subscribes to the observables of the chartModel and canvasBoundsContainer.
	 * It also subscribes to the xChanged observable of the chartModel's scaleModel and filters the values to check
	 * if the previous viewport had no-candles area and current viewport contains only candles or if the current viewport
	 * has no-candles area. If the navigationMap component is visible, it makes visual candles and fires the draw event
	 * of the canvasModel.
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			merge(
				this.chartModel.observeCandlesChanged(),
				this.canvasBoundsContainer.observeBoundsChanged(CanvasElement.N_MAP),
				this.chartModel.scaleModel.xChanged.pipe(
					pairwise(),
					filter(([prevScale, curScale]) => {
						// TODO rework
						const itemsCount = 0; //this.chartModel.scaleModel.getItemsCount();
						const prev = prevScale.start < 0 || prevScale.end > itemsCount;
						const cur = curScale.start < 0 || curScale.end > itemsCount;
						// trigger recalculation visual candles for nav map if previous viewport had
						// no-candles area and current viewport contains only candles.
						// OR if current viewport has no-candles area.
						return (prev && !cur) || cur;
					}),
				),
			).subscribe(() => {
				if (this.config.components.navigationMap.visible) {
					this.visualCandles = this.makeVisualCandles();
					this.canvasModel.fireDraw();
				}
			}),
		);
	}

	/**
	 * This function generates an array of visual candles based on the data provided by the chartModel.
	 * It calculates the maximum and minimum values of the candles and maps them to the canvas bounds.
	 * @returns {Array<[number, number]>} An array of tuples containing the x and y coordinates of each visual candle.
	 */
	private makeVisualCandles(): Array<[number, number]> {
		const candles = this.chartModel.getCandles();
		if (!candles.length) {
			return [];
		}
		const firstId = this.chartModel.mainCandleSeries.dataIdxStart;
		const lastId = this.chartModel.mainCandleSeries.dataIdxEnd;
		const leftSideOffsetVisible = Math.round(Math.max(-firstId, 0));
		// take into account left offset and a new rule using which we can scroll to right, so only two candles on left are visible
		const len = Math.max(this.chartModel.getCandlesCountWithRightOffset(), lastId) + leftSideOffsetVisible;
		let max = Number.NEGATIVE_INFINITY;
		let min = Number.POSITIVE_INFINITY;
		const nMapChart = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_CHART);
		const width = nMapChart.width;
		const res = [];
		let candleClose: number = 0;
		let x;
		let idx;
		for (x = 0; x < width; x++) {
			idx = floor((x * len) / width) - leftSideOffsetVisible;
			if (idx in candles) {
				res[x] = candles[idx].close;
				candleClose = res[x] ?? 0;
				max = Math.max(max, candleClose);
				min = Math.min(min, candleClose);
			} else {
				res[x] = 0;
			}
		}
		max -= min;
		return res.map((y, x) => {
			return [x + nMapChart.x, ((max + min - y) * nMapChart.height) / max + nMapChart.y];
		});
	}

	/**
	 * Sets the visibility of the navigation map component.
	 * @param {boolean} visible - Whether the navigation map component should be visible or not. Default is true.
	 */
	public setVisible(visible = true) {
		if (this.config.components?.navigationMap) {
			this.config.components.navigationMap.visible = visible;
			this.eventBus.fire(EVENT_RESIZED);
			this.canvasModel.fireDraw();
		}
	}
}
