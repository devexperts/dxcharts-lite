/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import {
	CanvasBoundsContainer,
	CanvasElement,
	HitBoundsTest,
	isInVerticalBounds,
} from '../canvas/canvas-bounds-container';
import { CursorHandler } from '../canvas/cursor.handler';
import { FullChartConfig } from '../chart.config';
import { ChartBaseElement } from './chart-base-element';
import { ChartModel } from '../components/chart/chart.model';
import { DragInfo } from '../components/dran-n-drop_helper/drag-n-drop.component';
import { DragNDropYComponent } from '../components/dran-n-drop_helper/drag-n-drop-y.component';
import { ChartPanComponent } from '../components/pan/chart-pan.component';
import { CanvasModel } from './canvas.model';
import { CanvasInputListenerComponent } from '../inputlisteners/canvas-input-listener.component';
import { Bounds } from './bounds.model';

export const BASELINE_RESIZER_UUID = 'BASELINE_RESIZER';

/**
 * Baseline separator for baseline chart
 * Used to resize baseline area on chart.
 */
export class BaselineModel extends ChartBaseElement {
	public readonly resizerBounds: Bounds = { x: 0, y: 0, pageX: 0, pageY: 0, height: 0, width: 0 };
	// the position of a baseline in percents relatively to chart height
	public baselineYPercents: number = 50;
	public ht: HitBoundsTest = CanvasBoundsContainer.hitTestOf(this.resizerBounds, {
		extensionY: this.config.components.paneResizer.dragZone,
	});
	constructor(
		private chartModel: ChartModel,
		chartPanComponent: ChartPanComponent,
		private canvasModel: CanvasModel,
		private canvasInputListener: CanvasInputListenerComponent,
		private config: FullChartConfig,
		private canvasBoundContainer: CanvasBoundsContainer,
		private cursorHandler: CursorHandler,
	) {
		super();
		const dndHelper = new DragNDropYComponent(
			this.ht,
			{
				onDragTick: this.dragTickCb,
			},
			canvasInputListener,
			chartPanComponent,
		);
		this.addChildEntity(dndHelper);
	}

	protected doActivate(): void {
		super.doActivate();
		this.addRxSubscription(
			this.canvasBoundContainer
				.observeBoundsChanged(CanvasElement.CHART)
				.subscribe(() => this.recalculateBounds()),
		);

		this.chartModel.chartTypeChanged.subscribe(type => {
			if (type === 'baseline') {
				this.cursorHandler.setCursorForBounds(
					'BASELINE_RESIZER',
					this.resizerBounds,
					this.config.components.baseline.cursor,
					this.config.components.baseline.dragZone,
				);
			} else {
				this.cursorHandler.removeCursorForCanvasEl('BASELINE_RESIZER');
			}
		});
	}

	private dragTickCb = (dragInfo: DragInfo): void => {
		const { delta: yDelta } = dragInfo;
		const chart = this.canvasBoundContainer.getBounds(CanvasElement.CHART);
		const y = this.canvasInputListener.getCurrentPoint().y;
		if (yDelta !== 0 && isInVerticalBounds(y, chart)) {
			this.moveBaseLine(y);
			this.canvasModel.fireDraw();
		}
	};

	/**
	 * Recalculates the bounds of the baseline resizer based on the current chart and y-axis bounds.
	 * @private
	 * @function
	 * @name recalculateBounds
	 * @memberof ClassName
	 * @returns {void}
	 */
	private recalculateBounds() {
		const chart = this.canvasBoundContainer.getBounds(CanvasElement.CHART);
		const yAxis = this.canvasBoundContainer.getBounds(CanvasElement.Y_AXIS);
		this.resizerBounds.x = chart.x;
		this.resizerBounds.width = chart.width + yAxis.width;
		this.resizerBounds.height = this.config.components.baseline.height;
		const relativeBaselineY = chart.y + chart.height * (this.baselineYPercents / 100);
		this.resizerBounds.y = relativeBaselineY;
		this.canvasBoundContainer.bounds[BASELINE_RESIZER_UUID] = this.resizerBounds;
	}

	/**
	 * Moves the baseline of the chart to the specified y coordinate.
	 * @param {number} y - The y coordinate to move the baseline to.
	 * @returns {void}
	 */
	moveBaseLine(y: number) {
		const chart = this.canvasBoundContainer.getBounds(CanvasElement.CHART);
		this.baselineYPercents = ((y - chart.y) * 100) / chart.height;
		this.resizerBounds.y = y;
	}

	/**
	 * This method is called when the component is being deactivated.
	 * It calls the doDeactivate method of the parent class.
	 * @protected
	 */
	protected doDeactivate() {
		super.doDeactivate();
	}
}
