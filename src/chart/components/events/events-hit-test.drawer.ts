/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Drawer } from '../../drawers/drawing-manager';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';
import { ChartModel } from '../chart/chart.model';
import { FullChartConfig } from '../../chart.config';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { EventsModel } from './events.model';
import { getEventSize } from './events.drawer';

const hoverExtendedAreaPixels = 5;

export class EventsHitTestDrawer implements Drawer {
	constructor(
		private hitTestCanvasModel: HitTestCanvasModel,
		private chartModel: ChartModel,
		private config: FullChartConfig,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private model: EventsModel,
	) {}

	/**
     * Draws events on the hit test canvas.
     * @function
     * @name draw
     * @memberof CanvasElement.EVENTS
     * @instance
     * @returns {void}
      
    */
	draw(): void {
		const ctx = this.hitTestCanvasModel.ctx;
		const bounds = this.canvasBoundsContainer.getBounds(CanvasElement.EVENTS);
		ctx.save();
		this.model.events.forEach((event, idx) => {
			const prevEvent = this.model.events[idx - 1];
			const prevX =
				prevEvent &&
				this.chartModel.candleFromTimestamp(prevEvent.timestamp).xCenter(this.chartModel.scaleModel);
			const x = this.chartModel.candleFromTimestamp(event.timestamp).xCenter(this.chartModel.scaleModel);
			if (x > bounds.x && x < bounds.x + bounds.width) {
				const color = this.config.colors.events[event.type].color;
				ctx.strokeStyle = color;
				ctx.fillStyle = color;
				const size = getEventSize(event);
				// draw hit test
				ctx.fillStyle = this.hitTestCanvasModel.idToColor(event.id);
				const hoverSize = (size + hoverExtendedAreaPixels) * 2;
				if (prevX !== undefined) {
					const prevSize = getEventSize(prevEvent);
					const isIntersectsWithPrev = prevX + prevSize > x - hoverSize / 2;
					if (isIntersectsWithPrev) {
						const hoverSize = size * 2 + hoverExtendedAreaPixels;
						ctx.fillRect(prevX + prevSize, bounds.y, hoverSize, bounds.height);
					} else {
						ctx.fillRect(x - size - hoverExtendedAreaPixels, bounds.y, hoverSize, bounds.height);
					}
				} else {
					ctx.fillRect(x - size - hoverExtendedAreaPixels, bounds.y, hoverSize, bounds.height);
				}
			}
		});
		ctx.restore();
	}

	/**
	 * Returns an array of string containing the canvas ID of the hitTestCanvasModel.
	 * @returns {Array<string>} An array of string containing the canvas ID of the hitTestCanvasModel.
	 */
	getCanvasIds(): Array<string> {
		return [this.hitTestCanvasModel.canvasId];
	}
}
