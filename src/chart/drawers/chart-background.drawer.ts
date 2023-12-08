/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Drawer } from './drawing-manager';
import { CanvasModel } from '../model/canvas.model';
import { FullChartConfig } from '../chart.config';
import { getDPR } from '../utils/device/device-pixel-ratio.utils';
import { floor } from '../utils/math.utils';
import Color from 'color';

export class BackgroundDrawer implements Drawer {
	constructor(private canvasModel: CanvasModel, private config: FullChartConfig) {}

	draw(): void {
		const ctx = this.canvasModel.ctx;
		const shouldRedraw = this.shouldRedrawBackground(ctx);

		if (shouldRedraw) {
			this.canvasModel.clear();
			if (this.config.colors.chartAreaTheme.backgroundMode === 'gradient') {
				const grd = ctx.createLinearGradient(0, 0, this.canvasModel.width, this.canvasModel.height);
				grd.addColorStop(0, this.config.colors.chartAreaTheme.backgroundGradientTopColor);
				grd.addColorStop(1, this.config.colors.chartAreaTheme.backgroundGradientBottomColor);
				ctx.fillStyle = grd;
			} else {
				ctx.fillStyle = this.config.colors.chartAreaTheme.backgroundColor;
			}
			ctx.fillRect(0, 0, this.canvasModel.width, this.canvasModel.height);
		}
	}

	shouldRedrawBackground(ctx: CanvasRenderingContext2D): boolean {
		// checking the gradient background
		// it takes two edge pixels (far left and far right) and compares them with the config values
		if (this.config.colors.chartAreaTheme.backgroundMode === 'gradient') {
			const dpr = getDPR();

			const imageDataLeft = ctx.getImageData(1, 1, 1, 1).data;
			const rgbaLeft = `rgba(${imageDataLeft[0]}, ${imageDataLeft[1]}, ${imageDataLeft[2]}, ${
				imageDataLeft[3] / 255
			})`;

			const imageDataRight = ctx.getImageData(
				this.canvasModel.width * dpr - 1,
				this.canvasModel.height * dpr - 1,
				1,
				1,
			).data;
			const rgbaRight = `rgba(${imageDataRight[0]}, ${imageDataRight[1]}, ${imageDataRight[2]}, ${
				imageDataRight[3] / 255
			})`;

			if (
				rgbaLeft === this.config.colors.chartAreaTheme.backgroundGradientTopColor &&
				rgbaRight === this.config.colors.chartAreaTheme.backgroundGradientBottomColor
			) {
				return false;
			}
		}
		// checking the regular background when one color is used
		if (
			this.config.colors.chartAreaTheme.backgroundMode === 'regular' &&
			this.canvasModel.ctx.fillStyle === Color(this.config.colors.chartAreaTheme.backgroundColor).hex()
		) {
			return false;
		}
		return true;
	}

	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}

// this function in used in case when
// some entity can overlap with another chart entity, so we need to hide the another entity
export const redrawBackgroundArea = (
	backgroundCtx: CanvasRenderingContext2D,
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	opacity?: number,
) => {
	const dpr = getDPR();
	const backgroundCoords = [x * dpr, y * dpr, width * dpr, height * dpr] as const;
	let imageData = backgroundCtx.getImageData(...backgroundCoords);
	if (opacity !== undefined) {
		// convert rgba to rgb for black background
		//		Target.R = (Source.A * Source.R)
		//		Target.G = (Source.A * Source.G)
		//		Target.B = (Source.A * Source.B)
		const alpha = imageData.data[3] / 255;
		if (alpha === 1) {
			// fast path
			for (let i = 3; i < imageData.data.length; i += 4) {
				imageData.data[i] = floor(imageData.data[i] * opacity);
			}
		} else {
			for (let i = 0; i < imageData.data.length; i++) {
				const v = imageData.data[i];
				imageData.data[i] = i % 4 === 3 ? floor(v * opacity) : floor(alpha * v);
			}
		}
		imageData = new ImageData(
			// i % 4 === 3 - this condition is for alpha channel
			imageData.data,
			imageData.width,
			imageData.height,
			{ colorSpace: imageData.colorSpace },
		);
	}
	ctx.putImageData(imageData, backgroundCoords[0], backgroundCoords[1]);
};
