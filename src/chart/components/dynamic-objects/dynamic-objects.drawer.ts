/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Drawer } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { DynamicObjectsModel } from './dynamic-objects.model';

export interface DynamicModelDrawer<T> {
	draw(canvasModel: CanvasModel, model: T, paneUUID?: string): void;
}

export class DynamicObjectsDrawer implements Drawer {
	constructor(private dynamicObjectsModel: DynamicObjectsModel, private canvasModel: CanvasModel) {}

	draw() {
		const objects = this.dynamicObjectsModel.objects;
		Object.entries(objects).forEach(([paneUUID, list]) => {
			for (const obj of list) {
				const { model, drawer } = obj;
				drawer.draw(this.canvasModel, model, paneUUID);
			}
		});
	}

	getCanvasIds(): string[] {
		return [this.canvasModel.canvasId];
	}
}
