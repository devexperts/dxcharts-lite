/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DrawingManager } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { DynamicObjectsDrawer } from './dynamic-objects.drawer';
import { DynamicObjectsModel } from './dynamic-objects.model';

export class DynamicObjectsComponent extends ChartBaseElement {
	public model: DynamicObjectsModel;

	constructor(canvasModel: CanvasModel, drawingManager: DrawingManager) {
		super();

		// model
		const dynamicObjectsModel = new DynamicObjectsModel(canvasModel);
		this.model = dynamicObjectsModel;
		this.addChildEntity(dynamicObjectsModel);

		// drawer
		const dynamicObjectsDrawer = new DynamicObjectsDrawer(dynamicObjectsModel, canvasModel);
		drawingManager.addDrawer(dynamicObjectsDrawer, 'DYNAMIC_OBJECTS');
	}
}
