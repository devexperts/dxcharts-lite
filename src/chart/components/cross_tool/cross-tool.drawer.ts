/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasModel } from '../../model/canvas.model';
import { Drawer } from '../../drawers/drawing-manager';
import { CrossToolHover, CrossToolModel, CrossToolType } from './cross-tool.model';

export interface CrossToolTypeDrawer {
	draw: (ctx: CanvasRenderingContext2D, hover: CrossToolHover) => void;
}

export class CrossToolDrawer implements Drawer {
	constructor(
		private model: CrossToolModel,
		private crossToolCanvasModel: CanvasModel,
		private readonly crossToolTypeDrawers: Record<CrossToolType, CrossToolTypeDrawer>,
	) {}

	/**
	 * Draws the cross tool on the canvas.
	 * @function
	 * @name draw
	 * @memberof CrossToolCanvasView
	 * @instance
	 * @returns {void}
	 */
	draw() {
		const drawer = this.crossToolTypeDrawers[this.model.type];
		if (drawer) {
			this.model.currentHover && drawer.draw(this.crossToolCanvasModel.ctx, this.model.currentHover);
		} else {
			console.error(`No cross tool drawer type registered for drawer type ${this.model.type}`);
		}
	}

	/**
	 * Returns an array of string containing the canvas ID of the crossToolCanvasModel.
	 *
	 * @returns {Array<string>} An array of string containing the canvas ID of the crossToolCanvasModel.
	 */
	getCanvasIds(): Array<string> {
		return [this.crossToolCanvasModel.canvasId];
	}
}
