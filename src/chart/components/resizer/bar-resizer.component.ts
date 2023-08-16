/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subject } from 'rxjs';
import { distinctUntilChanged, skip, startWith } from 'rxjs/operators';
import { CanvasAnimation } from '../../animation/canvas-animation';
import { CanvasBoundsContainer, HitBoundsTest } from '../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { DrawingManager, DynamicDrawerType } from '../../drawers/drawing-manager';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasInputListenerComponent } from '../../inputlisteners/canvas-input-listener.component';
import { DragInfo } from '../dran-n-drop_helper/drag-n-drop.component';
import { DragNDropYComponent } from '../dran-n-drop_helper/drag-n-drop-y.component';
import { ChartPanComponent } from '../pan/chart-pan.component';
import { BarResizerDrawer } from './bar-resizer.drawer';
import { BoundsProvider } from '../../model/bounds.model';

/**
 * Bar separator between panes.
 * Used to resize the areas height or just draw a fixed line.
 * Supports hover animation.
 *
 * @doc-tags chart-core,resizer
 */
export class BarResizerComponent extends ChartBaseElement {
	animationId: string;
	initialY: number = 0;
	resizeEvent$: Subject<void> = new Subject<void>();
	constructor(
		private id: string,
		private boundsProvider: BoundsProvider,
		private hitTest: HitBoundsTest,
		private dragTickCb: (yDelta: number) => void,
		private chartPanComponent: ChartPanComponent,
		private canvasModel: CanvasModel,
		private drawingManager: DrawingManager,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasAnimation: CanvasAnimation,
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
	) {
		super();
		this.animationId = `${this.id}_RESIZER`;
	}

	/**
	 * This method activates the pane resizer component.
	 * It calls the parent class's doActivate method and then checks if the fixedMode property is set to false in the config object.
	 * If it is false, it creates a new DragNDropYComponent and adds it to the component list.
	 * It also adds a subscription to the canvasInputListener to observe mouse enter events and
	 * handle hover animations if the animation is enabled in the config object.
	 * Finally, it creates a new BarResizerDrawer and adds it to the drawing manager as a DynamicDrawerType.paneResizer with the current id.
	 * It also adds a subscription to remove the drawer when the component is deactivated.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();
		const fixedMode = this.config.components.paneResizer.fixedMode;
		if (!fixedMode) {
			const dragNDropYComponent = new DragNDropYComponent(
				this.hitTest,
				{
					onDragTick: this.onYDragTick,
					onDragStart: this.onYDragStart,
					onDragEnd: this.onYDragEnd,
				},
				this.canvasInputListener,
				this.chartPanComponent,
			);
			this.addChildEntity(dragNDropYComponent);
			if (this.config.animation.paneResizer.enabled) {
				this.addRxSubscription(
					this.canvasInputListener
						.observeMouseEnter(this.hitTest, true)
						.pipe(
							// set initial pipe state to false, so animation will play for the first time only for appearing
							startWith(false),
							distinctUntilChanged(),
							skip(1),
						)
						.subscribe(enter => {
							if (enter) {
								this.handleHoverAnimation('appearing');
							} else {
								this.handleHoverAnimation('fading');
							}
						}),
				);
			}
		}
		const barResizerDrawer = new BarResizerDrawer(
			this.config,
			this.boundsProvider,
			this.canvasModel,
			this.canvasAnimation,
			this.animationId,
		);
		this.drawingManager.addDrawer(barResizerDrawer, DynamicDrawerType.paneResizer(this.id));
		this.addSubscription(() => this.drawingManager.removeDrawerByName(DynamicDrawerType.paneResizer(this.id)));
	}

	private onYDragStart = () => {
		this.config.components.crossTool.type = 'none';
		this.initialY = this.boundsProvider().y;
	};

	private onYDragEnd = () => {
		this.config.components.crossTool.type = 'cross-and-labels';
		this.initialY = this.boundsProvider().y;
		this.canvasBoundsContainer.graphsHeightRatioChangedSubject.next(this.canvasBoundsContainer.graphsHeightRatio);
	};

	private onYDragTick = (dragInfo: DragInfo) => {
		const { delta: yDelta, draggedPixels } = dragInfo;
		// in case cursor moves outside the bar - do not generate "tick"
		if (Math.abs(this.initialY - this.boundsProvider().y + draggedPixels) >= 0) {
			this.dragTickCb(yDelta);
			this.resizeEvent$.next();
		}
	};

	/**
	 * This method is called when the component is being deactivated.
	 * It calls the parent method doDeactivate() and then completes the resizeEvent$ observable.
	 * @protected
	 * @returns {void}
	 */
	protected doDeactivate() {
		super.doDeactivate();
		this.resizeEvent$.complete();
	}

	/**
	 * This function handles the hover animation of a pane resizer. It takes a type parameter which can be either 'fading' or 'appearing'.
	 * If the background mode is enabled, it gets the color alpha animation from the canvasAnimation and starts the color alpha animation
	 * with the given animationId and the color and type provided in the parameter. If the background mode is not enabled, it gets the color transition
	 * animation from the canvasAnimation and starts the color transition animation with the given animationId, startColor, endColor and type
	 * provided in the parameter and the duration from the config. If there is an animation in progress, it reverts it.
	 *
	 * @param {string} type - The type of animation, can be either 'fading' or 'appearing'.
	 * @returns {void}
	 */
	handleHoverAnimation(type: 'fading' | 'appearing'): void {
		let animation;
		if (this.config.animation.paneResizer.bgMode) {
			animation = this.canvasAnimation.getColorAlphaAnimation(this.animationId);
			if (!animation || !animation.animationInProgress) {
				this.canvasAnimation.startColorAlphaAnimation(this.animationId, [
					{
						color: this.config.colors.paneResizer.bgHoverColor,
						type,
					},
				]);
			}
		} else {
			animation = this.canvasAnimation.getColorTransitionAnimation(this.animationId);
			if (!animation || !animation.animationInProgress) {
				this.canvasAnimation.startColorTransitionAnimation(
					this.animationId,
					[
						{
							startColor: this.config.colors.paneResizer.bgColor,
							endColor: this.config.colors.paneResizer.bgHoverColor,
							type,
						},
					],
					this.config.animation.paneResizer.duration,
				);
			}
		}
		if (animation && animation.animationInProgress) {
			animation.revert();
		}
	}
}
