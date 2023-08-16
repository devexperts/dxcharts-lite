/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { ChartConfigComponentsOffsets, ChartScale, FullChartConfig } from '../chart.config';
import { CanvasAnimation } from '../animation/canvas-animation';
import { startViewportModelAnimation } from '../animation/viewport-model-animation';
import { cloneUnsafe } from '../utils/object.utils';
import { AutoScaleViewportSubModel } from './scaling/auto-scale.model';
import { zoomConstraint } from './scaling/constrait.functions';
import { ZoomXToZoomYRatio, lockedYEndViewportCalculator, ratioFromZoomXY } from './scaling/lock-ratio.model';
import { moveXStart, moveYStart } from './scaling/move-chart.functions';
import { Price, Unit, ViewportModel, ViewportModelState, Zoom, compareStates } from './scaling/viewport.model';
import { zoomXToEndViewportCalculator, zoomXToPercentViewportCalculator } from './scaling/x-zooming.functions';
import { BoundsProvider } from './bounds.model';

export interface HighLowWithIndex {
	high: Price;
	low: Price;
	highIdx: number;
	lowIdx: number;
}

export interface ScaleHistoryItem {
	xStart: Unit;
	xEnd: Unit;
	yStart: Unit;
	yEnd: Unit;
}

export const getDefaultHighLowWithIndex = (): HighLowWithIndex => ({
	high: Number.NEGATIVE_INFINITY,
	low: Number.POSITIVE_INFINITY,
	highIdx: 0,
	lowIdx: 0,
});

// 0..1 ratio of full viewport; 0.5 = middle, 0.75 = 3/4 of viewport
export type ViewportPercent = number;

type Constraints = (initialState: ViewportModelState, state: ViewportModelState) => ViewportModelState;

/**
 * The ScaleModel class represents the state of a chart's scale, including the current viewport, zoom level, and auto-scaling settings.
 * It extends the ViewportModel class, which provides the underlying implementation for handling viewports and zoom levels.
 * Controls current visible CHART viewport.
 * Has additional logic:
 * - auto-scale
 * - locked scale
 * - zooming functions
 * - history
 */
export class ScaleModel extends ViewportModel {
	public scaleInversedSubject: Subject<boolean> = new Subject<boolean>();

	// TODO rework, make a new history based on units
	history: ScaleHistoryItem[] = [];

	autoScaleModel: AutoScaleViewportSubModel;

	zoomXYRatio: ZoomXToZoomYRatio = 0;
	offsets: ChartConfigComponentsOffsets;

	xConstraints: Constraints[] = [];

	public readonly state: ChartScale;

	constructor(
		public config: FullChartConfig,
		public getBounds: BoundsProvider,
		private canvasAnimation: CanvasAnimation,
	) {
		super();
		this.state = cloneUnsafe(config.scale);
		this.autoScaleModel = new AutoScaleViewportSubModel(this);
		this.offsets = this.config.components.offsets;
		this.addXConstraint((initialState, state) =>
			zoomConstraint(initialState, state, this.config.components.chart, this.getBounds),
		);
	}

	/**
	 * The method adds a new "constraint" to the existing list of x-axis constraints for charting.
	 * The "constrait" is expected to be an object containing information about the constraints, such as the minimum and maximum values for the x-axis.
	 * @param constraint
	 */
	addXConstraint(constraint: Constraints) {
		this.xConstraints = [...this.xConstraints, constraint];
	}

	/**
	 * The method updates the offsets for the scale model based on the provided "offsets" object.
	 * Note that the method modifies the offsets and triggers an autoscale
	 * @param offsets
	 */
	updateOffsets(offsets: Partial<ChartConfigComponentsOffsets>) {
		this.offsets = {
			...this.offsets,
			...offsets,
		};
		this.doAutoScale(true);
	}

	/**
	 * @returns current offsets
	 */
	public getOffsets(): ChartConfigComponentsOffsets {
		return this.offsets;
	}

	/**
	 * Zooms the X axis of the chart to a specified percentage of the viewport.
	 * @param viewportPercent The percentage of the viewport width to zoom to.
	 * @param zoomIn Whether to zoom in or out.
	 * @param forceNoAnimation Whether to skip animation.
	 * @param zoomSensitivity The sensitivity of the zoom.
	 */
	public zoomXToPercent(
		viewportPercent: ViewportPercent,
		zoomIn: boolean,
		forceNoAnimation: boolean = false,
		zoomSensitivity: number = this.config.scale.zoomSensitivity,
	) {
		this.config.components.yAxis.type === 'percent' && this.haltAnimation();
		const state = this.export();
		zoomXToPercentViewportCalculator(this, state, viewportPercent, zoomSensitivity, zoomIn);
		this.zoomXTo(state, forceNoAnimation);
	}

	/**
	 * Zooms the X axis of the chart relativly to the end of the data range.
	 * @param zoomIn - If true, the chart will be zoomed in. If false, the chart will be zoomed out.
	 * @param zoomSensitivity - The sensitivity of the zoom. Default value is taken from the configuration object.
	 */
	public zoomXToEnd(zoomIn: boolean, zoomSensitivity: number = this.config.scale.zoomSensitivity) {
		this.config.components.yAxis.type === 'percent' && this.haltAnimation();
		const state = this.export();
		zoomXToEndViewportCalculator(this, state, zoomSensitivity, zoomIn);
		this.zoomXTo(state);
	}

	private haltAnimation() {
		// TODO: get rid of percent check
		if (this.currentAnimation?.animationInProgress) {
			this.currentAnimation.finishAnimation();
			this.doAutoScale();
		}
	}

	private zoomXTo(state: ViewportModelState, forceNoAnimation?: boolean) {
		const initialStateCopy = { ...state };

		const constraitedState = this.scalePostProcessor(initialStateCopy, state);
		if (this.state.lockPriceToBarRatio) {
			lockedYEndViewportCalculator(constraitedState, this.zoomXYRatio);
		}
		if (this.state.auto) {
			this.autoScaleModel.setAutoAndRecalculateState(constraitedState, true);
		}

		if (forceNoAnimation) {
			this.apply(constraitedState);
		} else {
			startViewportModelAnimation(this.canvasAnimation, this, constraitedState);
		}
	}

	/**
	 * Moves the viewport to exactly xStart..xEnd place.
	 * (you need to fire DRAW event after this)
	 * @param xStart - viewport start in units
	 * @param xEnd - viewport end in units
	 * @param fireChanged
	 * @param forceNoAutoScale - force NOT apply auto-scaling (for lazy loading)
	 */
	public setXScale(xStart: Unit, xEnd: Unit) {
		const initialState = this.export();
		super.setXScale(xStart, xEnd, false);
		const state = this.export();
		const constraitedState = this.scalePostProcessor(initialState, state);
		if (this.state.lockPriceToBarRatio) {
			lockedYEndViewportCalculator(constraitedState, this.zoomXYRatio);
		}
		if (this.state.auto) {
			this.autoScaleModel.setAutoAndRecalculateState(constraitedState, true);
		}

		this.apply(constraitedState);
	}

	/**
	 * Moves both xStart and xEnd without changing the viewport width (zoom).
	 * WILL CHANGE the Y axis if scale.auto=true.
	 * @param xStart - starting point in units
	 */
	public moveXStart(xStart: Unit): void {
		const state = this.export();
		const initialStateCopy = { ...state };
		// always stop the animations
		this.haltAnimation();
		moveXStart(state, xStart);
		// there we need only candles constrait
		const constraitedState = this.scalePostProcessor(initialStateCopy, state);
		if (this.state.auto) {
			this.autoScaleModel.setAutoAndRecalculateState(constraitedState, true);
		}
		this.apply(constraitedState);
	}

	private scalePostProcessor = (initialState: ViewportModelState, state: ViewportModelState) => {
		// for now <s>reduceRight<s/> reduce bcs ChartModel#getZoomConstrait should be invoked first
		// if we will need more complex order handling -> add some managing
		return this.xConstraints.reduce((acc, cur) => cur(initialState, acc), state);
	};

	/**
	 * Moves both yStart and yEnd without changing the viewport height (zoom).
	 * Will not move viewport if scale.auto=true
	 * @param yStart - starting point in units
	 */
	public moveYStart(yStart: Unit): void {
		this.haltAnimation();
		if (this.state.auto) {
			return;
		} else {
			const state = this.export();
			moveYStart(state, yStart);
			this.apply(state);
		}
	}

	/**
	 * Automatically scales the chart to fit the data range.
	 * @param forceApply - If true, the chart will be forcefully auto-scaled even if animation is in progress.
	 */
	doAutoScale(forceApply: boolean = false) {
		// dont auto-scale if animation, otherwise - forced or config
		if ((!this.isViewportAnimationInProgress() && this.state.auto) || forceApply) {
			const state = this.export();
			this.autoScaleModel.setAutoAndRecalculateState(state, true);
			if (!compareStates(state, this.export())) {
				this.apply(state);
			}
		}
	}

	/**
	 * Checks if viewport animation is currently in progress.
	 * @returns returns true if viewport animation is in progress, false otherwise.
	 */
	public isViewportAnimationInProgress() {
		const animation = this.currentAnimation;
		return animation?.animationInProgress;
	}

	/**
	 * Adds an item to the scale history.
	 * @param item - The item to add to the history.
	 */
	public pushToHistory(item: ScaleHistoryItem): void {
		this.history.push(item);
	}

	/**
	 * Removes the most recent item from the scale history and returns it.
	 * @returns - The most recent item from the history, or undefined if the history is empty.
	 */
	public popFromHistory(): ScaleHistoryItem | undefined {
		return this.history.pop();
	}

	/**
	 * Clears the scale history.
	 */
	public clearHistory(): void {
		this.history = [];
	}

	/**
	 * Checks if the X axis bounds are the default values.
	 * @returns if false - it means there are candles and it's possible to do scaling and add drawings
	 */
	isDefaultXBounds(): boolean {
		return this.xStart === 0 && this.xEnd === 0;
	}

	/**
	 * Checks if the Y axis bounds are the default values.
	 * @returns if false - it means there are candles and it's possible to do scaling and add drawings
	 */
	isDefaultYBounds(): boolean {
		return this.yStart === 0 && this.yEnd === 0;
	}

	/**
	 * Checks if the scale is ready to be used.
	 * @returns - Returns true if the scale is ready, false otherwise.
	 */
	isScaleReady(): boolean {
		return !this.isDefaultXBounds() && !this.isDefaultYBounds();
	}

	/**
	 * Enables or disables auto-scaling of the chart.
	 * @param auto - If true, the chart will be automatically scaled. If false, auto-scaling will be disabled.
	 */
	public autoScale(auto: boolean = true): void {
		// TODO rework, make this a separate feature toggle, describe in docs; this should be a business-logic level
		if (this.config.components.yAxis.type === 'percent') {
			this.state.auto = true;
		} else {
			this.state.auto = auto;
		}
		if (auto) {
			this.clearHistory();
			this.doAutoScale();
		}
	}

	/**
	 * Sets whether the price-to-bar ratio should be locked or not.
	 * @param value - If true, the price-to-bar ratio will be locked. If false, it will not be locked.
	 */
	public setLockPriceToBarRatio(value: boolean = false): void {
		const { type } = this.config.components.yAxis;
		// TODO rework, why such logic? same as above, if we have business-logic like this one => make it separate code
		if (type === 'percent' || type === 'logarithmic') {
			this.state.lockPriceToBarRatio = false;
			return;
		}
		if (value) {
			this.recalculateZoomXYRatio();
		}
		this.state.lockPriceToBarRatio = value;
	}

	/**
	 * Recalculates the zoom X/Y ratio based on the current zoom levels.
	 */
	public recalculateZoomXYRatio() {
		this.zoomXYRatio = ratioFromZoomXY(this.zoomX, this.zoomY);
	}
}

/**
 * The SyncedByXScaleModel class extends the ScaleModel class and adds support for synchronization with other ScaleModel instance, so both instances maintain the same X-axis bounds.
 * This is useful for scenarios where multiple charts need to display the same X-axis data, but with different Y-axis scales.
 */

export class SyncedByXScaleModel extends ScaleModel {
	constructor(
		private delegate: ViewportModel,
		public config: FullChartConfig,
		public getBounds: BoundsProvider,
		canvasAnimation: CanvasAnimation,
	) {
		super(config, getBounds, canvasAnimation);
	}

	protected doActivate(): void {
		this.addRxSubscription(this.delegate.xChanged.subscribe(() => this.doAutoScale(this.state.auto)));
	}

	get xStart() {
		return this.delegate.xStart;
	}

	set xStart(value: Unit) {
		this.delegate.xStart = value;
	}

	get xEnd() {
		return this.delegate.xEnd;
	}

	set xEnd(value: Unit) {
		this.delegate.xEnd = value;
	}

	get zoomX() {
		return this.delegate.zoomX;
	}

	set zoomX(value: Zoom) {
		this.delegate.zoomX = value;
	}

	observeXChanged() {
		return this.delegate.xChanged;
	}

	public fireChanged() {
		this.delegate.changed.next();
		this.changed.next();
	}
}
