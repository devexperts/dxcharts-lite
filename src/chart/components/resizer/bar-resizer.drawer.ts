/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasAnimation } from '../../animation/canvas-animation';
import { FullChartConfig } from '../../chart.config';
import { Drawer } from '../../drawers/drawing-manager';
import { BoundsProvider } from '../../model/bounds.model';
import { CanvasModel } from '../../model/canvas.model';

export class BarResizerDrawer implements Drawer {
	constructor(
		private config: FullChartConfig,
		private boundsProvider: BoundsProvider,
		private canvasModel: CanvasModel,
		private canvasAnimation: CanvasAnimation,
		private animationId: string,
	) {}

	/**
	 * Draws the pane resizer on the canvas if it is visible.
	 * The resizer is drawn with a fixed mode or with an animation.
	 * The resizer's position and size are determined by the bounds provider.
	 * The yAxisWidth is calculated based on the canvas bounds container.
	 * The resizerXOffset and resizerWidthOffset are calculated based on the yAxis alignment.
	 * The resizer is filled with a color based on the animation or the config colors.
	 * If the bgMode is true, the resizer is filled without the drag zone, otherwise it is filled with the drag zone.
	 */
	draw() {
		if (this.config.components.paneResizer.visible) {
			const fixedMode = this.config.components.paneResizer.fixedMode;
			const resizer = this.boundsProvider();
			const ctx = this.canvasModel.ctx;
			const animation = this.canvasAnimation.getColorAlphaAnimation(this.animationId);
			const drag = this.config.components.paneResizer.dragZone;
			if (!fixedMode && animation) {
				ctx.fillStyle = animation.getColor(0);
				ctx.fillRect(resizer.x, resizer.y - drag, resizer.width, resizer.height + 2 * drag);
			}
			ctx.fillStyle = this.config.colors.paneResizer.lineColor;
			if (this.config.animation.paneResizer.bgMode) {
				ctx.fillRect(resizer.x, resizer.y, resizer.width, resizer.height);
			} else {
				ctx.fillRect(resizer.x, resizer.y - drag, resizer.width, resizer.height + 2 * drag);
			}
		}
	}

	/**
	 * Returns an array of canvas IDs.
	 *
	 * @returns {Array<string>} An array containing the ID of the canvas model.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
