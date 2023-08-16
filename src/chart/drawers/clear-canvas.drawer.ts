/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Drawer } from './drawing-manager';
import { CanvasModel } from '../model/canvas.model';

/**
 * Clears the canvas.
 */
export class ClearCanvasDrawer implements Drawer {
	constructor(private canvasModel: CanvasModel) {}

	draw(): void {
		this.canvasModel.clear();
	}

	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
