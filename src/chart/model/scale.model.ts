/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { ChartConfigComponentsOffsets, ChartScale, FullChartConfig } from '../chart.config';
import { CanvasAnimation } from '../animation/canvas-animation';
import { startViewportModelAnimation } from '../animation/viewport-model-animation';
import { cloneUnsafe } from '../utils/object.utils';
import { AutoScaleViewportSubModel } from './scaling/auto-scale.model';
import { changeXToKeepRatio, changeYToKeepRatio } from './scaling/lock-ratio.model';
import { moveXStart, moveYStart } from './scaling/move-chart.functions';
import {
	Price,
	Unit,
	ViewportModel,
	ViewportModelState,
	Zoom,
	calculateZoom,
	compareStates,
} from './scaling/viewport.model';
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

export interface ZoomReached {
	zoomIn: boolean;
	zoomOut: boolean;
}

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
	// y-axis component needs this subject in order to halt prev animation if axis type is percent
	public beforeStartAnimationSubject: Subject<void> = new Subject<void>();
	public autoScaleModel: AutoScaleViewportSubModel;
	public zoomReached: ZoomReached = { zoomIn: false, zoomOut: false };
	public readonly state: ChartScale;
	// TODO rework, make a new history based on units
	public history: ScaleHistoryItem[] = [];
	public offsets: ChartConfigComponentsOffsets;
	private xConstraints: Constraints[] = [];

	constructor(
		public config: FullChartConfig,
		public getBounds: BoundsProvider,
		private canvasAnimation: CanvasAnimation,
	) {
		super();
		this.state = cloneUnsafe(config.scale);
		this.autoScaleModel = new AutoScaleViewportSubModel(this);
		this.offsets = this.config.components.offsets;
	}

	protected doActivate(): void {
		super.doActivate();
		this.scaleInversedSubject = new Subject();
		this.beforeStartAnimationSubject = new Subject();
		this.zoomReached = this.calculateZoomReached(this.export().zoomX);

		this.addRxSubscription(
			this.scaleInversedSubject.subscribe(() => {
				this.fireChanged();
			}),
		);
	}

	protected doDeactivate(): void {
		super.doDeactivate();
		this.scaleInversedSubject.complete();
		this.beforeStartAnimationSubject.complete();
	}

	/**
	 * The method adds a new "constraint" to the existing list of x-axis constraints for charting.
	 * The "constraint" is expected to be an object containing information about the constraints, such as the minimum and maximum values for the x-axis.
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
		zoomSensitivity: number,
	) {
		const disabledAnimations = this.config.scale.disableAnimations || forceNoAnimation;
		if (disabledAnimations) {
			this.haltAnimation();
		}
		this.beforeStartAnimationSubject.next();
		const state = this.export();
		zoomXToPercentViewportCalculator(this, state, viewportPercent, zoomSensitivity, zoomIn);
		this.zoomXTo(state, zoomIn, disabledAnimations);
	}

	/**
	 * Zooms the X axis of the chart relativly to the end of the data range.
	 * @param zoomIn - If true, the chart will be zoomed in. If false, the chart will be zoomed out.
	 * @param zoomSensitivity - The sensitivity of the zoom. Default value is taken from the configuration object.
	 */
	public zoomXToEnd(zoomIn: boolean, zoomSensitivity: number) {
		if (this.config.scale.disableAnimations) {
			this.haltAnimation();
		}
		this.beforeStartAnimationSubject.next();
		const state = this.export();
		zoomXToEndViewportCalculator(this, state, zoomSensitivity, zoomIn);
		this.zoomXTo(state, zoomIn, this.config.scale.disableAnimations);
	}

	public haltAnimation() {
		if (this.currentAnimation?.animationInProgress) {
			this.currentAnimation.finishAnimation();
			this.doAutoScale();
		}
	}

	private zoomXTo(state: ViewportModelState, zoomIn: boolean, forceNoAnimation?: boolean) {
		const initialStateCopy = this.export();
		const constrainedState = this.scalePostProcessor(initialStateCopy, state);
		this.zoomReached = this.calculateZoomReached(constrainedState.zoomX, zoomIn);

		if (this.zoomReached.zoomIn || this.zoomReached.zoomOut) {
			return;
		}

		if (this.state.lockPriceToBarRatio) {
			changeYToKeepRatio(initialStateCopy, constrainedState);
		}
		if (this.state.auto) {
			this.autoScaleModel.doAutoYScale(constrainedState);
		}
		if (forceNoAnimation) {
			this.apply(constrainedState);
		} else {
			startViewportModelAnimation(this.canvasAnimation, this, constrainedState);
		}
	}

	public calculateZoomReached(zoomX: Unit, zoomIn: boolean = true) {
		const chartWidth = this.getBounds().width;
		const delta = 0.001; // zoom values are very precise and should be compared with some precision delta

		if (chartWidth > 0) {
			const maxZoomIn = calculateZoom(this.config.components.chart.minCandles, chartWidth);
			const maxZoomInReached = zoomX !== maxZoomIn && zoomX - maxZoomIn <= delta;
			// max zoom in reached and trying to zoom in further
			const maxZoomInDisabled = maxZoomInReached && zoomIn;

			const maxZoomOut = calculateZoom(chartWidth / this.config.components.chart.minWidth, chartWidth);
			const maxZoomOutReached = zoomX - maxZoomOut >= delta;
			// max zoom out reached and trying to zoom out further
			const maxZoomOutDisabled = maxZoomOutReached && !zoomIn;

			return { zoomIn: maxZoomInDisabled, zoomOut: maxZoomOutDisabled };
		}

		return { zoomIn: false, zoomOut: false };
	}

	/**
	 * Moves the viewport to exactly xStart..xEnd place.
	 * (you need to fire DRAW event after this)
	 * @param xStart - viewport start in units
	 * @param xEnd - viewport end in units
	 * @param fireChanged
	 * @param forceNoAutoScale - force NOT apply auto-scaling (for lazy loading)
	 */
	public setXScale(xStart: Unit, xEnd: Unit, forceNoAnimation: boolean = true) {
		const initialState = this.export();
		const zoomX = this.calculateZoomX(xStart, xEnd);
		if (initialState.xStart === xStart && initialState.xEnd === xEnd && initialState.zoomX > 0) {
			return;
		}
		const state = { ...initialState, zoomX, xStart, xEnd };
		const constrainedState = this.scalePostProcessor(initialState, state);
		const zoomIn = constrainedState.xEnd - constrainedState.xStart < initialState.xEnd - initialState.xStart;
		this.zoomReached = this.calculateZoomReached(zoomX, zoomIn);
		if (this.zoomReached.zoomIn || this.zoomReached.zoomOut) {
			return;
		}

		if (this.state.lockPriceToBarRatio) {
			changeYToKeepRatio(initialState, constrainedState);
		}
		if (this.state.auto) {
			this.autoScaleModel.doAutoYScale(constrainedState);
		}
		if (forceNoAnimation || this.config.scale.disableAnimations) {
			this.haltAnimation();
			this.apply(constrainedState);
		} else {
			startViewportModelAnimation(this.canvasAnimation, this, constrainedState);
		}
	}

	public setYScale(yStart: Unit, yEnd: Unit, fire = false) {
		const initialState = this.export();
		if (initialState.yStart === yStart && initialState.yEnd === yEnd && initialState.zoomY > 0) {
			return;
		}

		if (this.state.lockPriceToBarRatio) {
			this.setLockedYScale(yStart, yEnd, fire, initialState);
			return;
		}

		super.setYScale(yStart, yEnd, fire);
		const state = this.export();
		const constrainedState = this.scalePostProcessor(initialState, state);
		if (this.state.auto) {
			this.autoScaleModel.doAutoYScale(constrainedState);
		}

		this.apply(constrainedState);
	}

	private setLockedYScale(yStart: Unit, yEnd: Unit, fire = false, initialState: ViewportModelState) {
		const zoomIn = yEnd < initialState.yEnd;
		if ((this.zoomReached.zoomOut && zoomIn === false) || (this.zoomReached.zoomIn && zoomIn === true)) {
			return;
		}

		super.setYScale(yStart, yEnd, fire);
		const state = this.export();
		const constrainedState = this.scalePostProcessor(initialState, state);

		changeXToKeepRatio(initialState, constrainedState);
		this.zoomReached = this.calculateZoomReached(constrainedState.zoomX, zoomIn);
		this.apply(constrainedState);
		this.fireChanged();
	}

	/**
	 * Moves both xStart and xEnd without changing the viewport width (zoom).
	 * Works without animation.
	 * WILL CHANGE the Y axis if scale.auto=true.
	 * @param xStart - starting point in units
	 */
	public moveXStart(xStart: Unit): void {
		const state = this.export();
		const initialStateCopy = { ...state };
		// always stop the animations
		this.haltAnimation();
		moveXStart(state, xStart);
		// there we need only candles constraint
		const constrainedState = this.scalePostProcessor(initialStateCopy, state);
		if (this.state.auto) {
			this.autoScaleModel.doAutoYScale(constrainedState);
		}
		this.apply(constrainedState);
	}

	private scalePostProcessor = (initialState: ViewportModelState, state: ViewportModelState) => {
		// for now <s>reduceRight<s/> reduce bcs ChartModel#getZoomConstrait should be invoked first
		// if we will need more complex order handling -> add some managing
		return this.xConstraints.reduce((acc, cur) => cur(initialState, acc), state);
	};

	/**
	 * Moves both yStart and yEnd without changing the viewport height (zoom).
	 * Works without animation.
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
			this.autoScaleModel.doAutoYScale(state);
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

		this.state.lockPriceToBarRatio = value;
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
