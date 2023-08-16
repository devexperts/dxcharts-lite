/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasBoundsContainer } from '../../canvas/canvas-bounds-container';
import { FullChartConfig } from '../../chart.config';
import { ClearCanvasDrawer } from '../../drawers/clear-canvas.drawer';
import { CompositeDrawer } from '../../drawers/composite.drawer';
import { DrawingManager } from '../../drawers/drawing-manager';
import { CrossEventProducerComponent } from '../../inputhandlers/cross-event-producer.component';
import { HoverProducerComponent } from '../../inputhandlers/hover-producer.component';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { PaneManager } from '../pane/pane-manager.component';
import { CrossToolDrawer, CrossToolTypeDrawer } from './cross-tool.drawer';
import { CrossToolModel, CrossToolType } from './cross-tool.model';
import { CrossAndLabelsDrawerType } from './types/cross-and-labels.drawer';
import { NoneDrawerType } from './types/none.drawer';

export type MagnetTarget = 'O' | 'H' | 'L' | 'C' | 'OHLC' | 'none';

/**
 * Default bundled chart cross tool.
 */
export class CrossToolComponent extends ChartBaseElement {
	readonly model: CrossToolModel;
	private readonly crossToolTypeDrawers: Record<string, CrossToolTypeDrawer> = {};
	constructor(
		private config: FullChartConfig,
		private crossToolCanvasModel: CanvasModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private drawingManager: DrawingManager,
		private paneManager: PaneManager,
		crossEventProducer: CrossEventProducerComponent,
		hoverProducer: HoverProducerComponent,
	) {
		super();
		this.model = new CrossToolModel(
			config.components.crossTool,
			this.crossToolCanvasModel,
			crossEventProducer,
			hoverProducer,
		);
		this.addChildEntity(this.model);
		const clearCanvasDrawer = new ClearCanvasDrawer(this.crossToolCanvasModel);
		this.registerDefaultDrawerTypes();
		const crossToolDrawer = new CrossToolDrawer(this.model, this.crossToolCanvasModel, this.crossToolTypeDrawers);
		const compositeDrawer = new CompositeDrawer();
		compositeDrawer.addDrawer(clearCanvasDrawer, 'CLEAR_CANVAS');
		compositeDrawer.addDrawer(crossToolDrawer, 'CROSS_TOOL_DRAWER');
		this.drawingManager.addDrawer(compositeDrawer, 'CROSS_TOOL');
	}

	/**
	 * Registers default drawer types for the chart.
	 * @private
	 * @function
	 * @name registerDefaultDrawerTypes
	 *
	 * @returns {void}
	 */
	private registerDefaultDrawerTypes() {
		this.registerCrossToolTypeDrawer(
			'cross-and-labels',
			new CrossAndLabelsDrawerType(this.config, this.canvasBoundsContainer, this.paneManager, () => true),
		);
		this.registerCrossToolTypeDrawer(
			'just-labels',
			new CrossAndLabelsDrawerType(this.config, this.canvasBoundsContainer, this.paneManager, () => true, true),
		);
		this.registerCrossToolTypeDrawer('none', new NoneDrawerType());
	}

	//#region public methods
	/**
	 * Sets the cross tool visibility.
	 * @param visible
	 */
	public setVisible(visible: boolean) {
		this.model.setType(visible ? 'cross-and-labels' : 'none');
	}

	/**
	 * Sets the crosstool type.
	 * - cross-and-labels - both the crosshair and X/Y labels
	 * - only-labels - only the X/Y label
	 * - none
	 * @param type
	 */
	public setType(type: CrossToolType) {
		this.model.setType(type);
	}

	/**
	 * Returns an Observable that emits the current hover subject.
	 */
	public observeCrossToolChanged() {
		return this.model.currentHoverSubject;
	}

	/**
	 * Sets magnet target for cross tool.
	 * Supported only for 'cross-and-labels' type.
	 * Default magnet target is none.
	 * @param target
	 */
	public setMagnetTarget(target: MagnetTarget) {
		this.config.components.crossTool.magnetTarget = target;
	}

	/**
	 * Adds a new drawer type for cross tool, so you can add your own implementation of cross tool
	 * (or override existing)
	 * @param drawerName - an unique drawer type name
	 * @param drawerImpl - CrossToolTypeDrawer object
	 */
	public registerCrossToolTypeDrawer(drawerName: CrossToolType, drawerImpl: CrossToolTypeDrawer) {
		this.crossToolTypeDrawers[drawerName] = drawerImpl;
	}
	//#endregion
}
