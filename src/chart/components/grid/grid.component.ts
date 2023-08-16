/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { NumericAxisLabel } from '../labels_generator/numeric-axis-labels.generator';
import { BoundsProvider } from '../../model/bounds.model';
import { FullChartConfig } from '../../chart.config';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasModel } from '../../model/canvas.model';
import { CompositeDrawer } from '../../drawers/composite.drawer';
import { DrawingManager } from '../../drawers/drawing-manager';
import { Unit, ViewportModel } from '../../model/scaling/viewport.model';
import { GridDrawer } from './grid.drawer';

export class GridComponent extends ChartBaseElement {
	private readonly drawer: GridDrawer;
	constructor(
		canvasModel: CanvasModel,
		viewportModel: ViewportModel,
		config: FullChartConfig,
		private drawerName: string,
		private drawingManager: DrawingManager | CompositeDrawer,
		xBoundsProvider: BoundsProvider,
		yBoundsProvider: BoundsProvider,
		xLabelsProvider: () => NumericAxisLabel[],
		yLabelsProvider: () => NumericAxisLabel[],
		getBaseLine?: () => Unit,
		drawPredicate?: () => boolean,
	) {
		super();
		this.drawer = new GridDrawer(
			canvasModel,
			viewportModel,
			config,
			xBoundsProvider,
			yBoundsProvider,
			xLabelsProvider,
			yLabelsProvider,
			drawPredicate,
			getBaseLine,
		);
	}

	/**
	 * This method is used to deactivate the drawer and remove it from the drawing manager.
	 * @protected
	 * @function
	 * @name doDeactivate
	 * @returns {void}
	 */
	protected doDeactivate() {
		super.doDeactivate();
		this.drawingManager.removeDrawer(this.drawer);
	}

	/**
	 * This method is used to activate the drawer. It calls the parent class's doActivate method and adds the drawer to the drawing manager.
	 * @protected
	 * @function
	 * @returns {void}
	 */
	protected doActivate() {
		super.doActivate();
		this.drawingManager.addDrawer(this.drawer, this.drawerName);
	}
}
