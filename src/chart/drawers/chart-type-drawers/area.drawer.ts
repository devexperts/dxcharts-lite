/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartConfigComponentsChart } from '../../chart.config';
import { Bounds } from '../../model/bounds.model';
import { CandleSeriesModel, isCandleSeriesModel } from '../../model/candle-series.model';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import VisualCandle from '../../model/visual-candle';
import { flat } from '../../utils/array.utils';
import {
	fromHexThreeDigitsToHex,
	isHex,
	isHexThreeDigits,
	isHexWithAlpha,
	isRgb,
	isRgba,
	toRGBA,
} from '../../utils/color.utils';
import { floor } from '../../utils/math.utils';
import { HTSeriesDrawerConfig, SeriesDrawer } from '../data-series.drawer';

interface GradientFillColorOpacityCategory {
	hex: string;
	rgba: number;
}

interface GradientFillColorsOpacity {
	startColor: GradientFillColorOpacityCategory;
	stopColor: GradientFillColorOpacityCategory;
}

// custom gradient fill colors opacity
const gradientFillColorsOpacity: GradientFillColorsOpacity = {
	// 20%
	startColor: {
		hex: '33',
		rgba: 0.2,
	},
	// 10%
	stopColor: {
		hex: '1A',
		rgba: 0.1,
	},
};

export class AreaDrawer implements SeriesDrawer {
	constructor(private config: ChartConfigComponentsChart) {}

	public draw(
		ctx: CanvasRenderingContext2D,
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	) {
		const isHitTestDrawer = !!hitTestDrawerConfig.color;

		if (isCandleSeriesModel(model)) {
			// @ts-ignore
			const visualCandles: VisualCandle[] = flat(points);
			if (visualCandles.length === 0) {
				return;
			}

			const paneBounds = model.extentComponent.getBounds();
			const hasCustomCandleColors = Object.values(model.customCandleColors).length > 0;

			if (hasCustomCandleColors) {
				this.drawCustomColorArea(ctx, visualCandles, model, hitTestDrawerConfig, paneBounds, isHitTestDrawer);
			} else {
				this.drawDefaultArea(ctx, visualCandles, model, hitTestDrawerConfig, paneBounds, isHitTestDrawer);
			}
		}
	}

	/**
	 * Draws a single continuous area from the first to the last candle using the
	 * default area theme colors.
	 */
	private drawDefaultArea(
		ctx: CanvasRenderingContext2D,
		visualCandles: VisualCandle[],
		model: CandleSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
		paneBounds: Bounds,
		isHitTestDrawer: boolean,
	) {
		if (hitTestDrawerConfig.color) {
			ctx.strokeStyle = hitTestDrawerConfig.color;
		} else {
			ctx.strokeStyle = model.colors.areaTheme.lineColor;
		}

		if (isHitTestDrawer) {
			ctx.lineWidth = hitTestDrawerConfig.hoverWidth ?? this.config.selectedWidth * 3;
		} else if (model.highlighted) {
			ctx.lineWidth = this.config.selectedWidth;
		} else {
			ctx.lineWidth = this.config.areaLineWidth;
		}

		const first = visualCandles[0];
		const firstLineX = model.view.toX(first.centerUnit);
		for (let i = 0; i < visualCandles.length; i++) {
			const prev = visualCandles[i - 1];
			const next = visualCandles[i + 1];
			const visualCandle = visualCandles[i];

			const lineX = model.view.toX(visualCandle.centerUnit);
			const closeY = model.view.toY(visualCandle.close);
			const bottomY = paneBounds.y + paneBounds.height;
			if (prev === void 0) {
				ctx.beginPath();
				ctx.lineTo(floor(lineX), bottomY);
				ctx.moveTo(floor(lineX), closeY);
			} else if (next === void 0) {
				ctx.lineTo(floor(lineX), closeY);
				ctx.stroke();
				ctx.lineTo(floor(lineX), bottomY);
				ctx.lineTo(floor(firstLineX), bottomY);
				ctx.closePath();

				let fillColor: CanvasGradient;
				if (hitTestDrawerConfig.color) {
					ctx.fillStyle = hitTestDrawerConfig.color;
				} else {
					ctx.fillStyle =
						model.colors.areaTheme.startColor && model.colors.areaTheme.stopColor
							? ((fillColor = ctx.createLinearGradient(0, 0, 0, paneBounds.height)),
								fillColor.addColorStop(0, model.colors.areaTheme.startColor),
								fillColor.addColorStop(1, model.colors.areaTheme.stopColor),
								fillColor)
							: '';
				}
				if (!isHitTestDrawer) {
					ctx.fill();
				}
			} else {
				ctx.lineTo(lineX, closeY);
			}
		}
	}

	/**
	 * Draws the area in runs of consecutive candles sharing the same custom color,
	 * producing a single shape per run instead of one per candle. Candles without a
	 * custom color form their own runs filled with the default area theme.
	 */
	private drawCustomColorArea(
		ctx: CanvasRenderingContext2D,
		visualCandles: VisualCandle[],
		model: CandleSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
		paneBounds: Bounds,
		isHitTestDrawer: boolean,
	) {
		if (isHitTestDrawer) {
			ctx.lineWidth = hitTestDrawerConfig.hoverWidth ?? this.config.selectedWidth * 3;
		} else if (model.highlighted) {
			ctx.lineWidth = this.config.selectedWidth;
		} else {
			ctx.lineWidth = this.config.areaLineWidth;
		}

		const bottomY = paneBounds.y + paneBounds.height;
		const getCustomCandleColor = (vc: VisualCandle) => model.customCandleColors[vc.candle.idx ?? 0];

		// a candle colors the segment that ends at it, so a run of candles [start, end]
		// sharing a color spans the shape from candle start - 1 up to candle end
		let start = 1;
		while (start < visualCandles.length) {
			const customColor = getCustomCandleColor(visualCandles[start]);

			let end = start;
			while (end + 1 < visualCandles.length && getCustomCandleColor(visualCandles[end + 1]) === customColor) {
				end++;
			}

			this.drawAreaRun(
				ctx,
				visualCandles,
				model,
				start - 1,
				end,
				bottomY,
				hitTestDrawerConfig.color || customColor || model.colors.areaTheme.lineColor,
				isHitTestDrawer ? undefined : this.createFillStyle(ctx, model, paneBounds, customColor),
			);

			// consecutive runs share their boundary candle so the shapes touch without gaps
			start = end + 1;
		}
	}

	/**
	 * Strokes the close line through candles [from, to] and, when a fill is given,
	 * closes the shape down to the pane bottom and fills it.
	 */
	private drawAreaRun(
		ctx: CanvasRenderingContext2D,
		visualCandles: VisualCandle[],
		model: CandleSeriesModel,
		from: number,
		to: number,
		bottomY: number,
		strokeStyle: string,
		fillStyle?: CanvasGradient | string,
	) {
		const fromX = model.view.toX(visualCandles[from].centerUnit);

		ctx.strokeStyle = strokeStyle;
		ctx.beginPath();
		ctx.moveTo(fromX, model.view.toY(visualCandles[from].close));
		for (let i = from + 1; i <= to; i++) {
			ctx.lineTo(model.view.toX(visualCandles[i].centerUnit), model.view.toY(visualCandles[i].close));
		}
		ctx.stroke();

		if (fillStyle !== undefined) {
			ctx.lineTo(floor(model.view.toX(visualCandles[to].centerUnit)), bottomY);
			ctx.lineTo(floor(fromX), bottomY);
			ctx.closePath();
			ctx.fillStyle = fillStyle;
			ctx.fill();
		}
	}

	private createFillStyle(
		ctx: CanvasRenderingContext2D,
		model: CandleSeriesModel,
		paneBounds: Bounds,
		customColor?: string,
	): CanvasGradient | string {
		let startColor = model.colors.areaTheme.startColor;
		let stopColor = model.colors.areaTheme.stopColor;

		if (customColor) {
			const gradientFillColors = this.getGradientFillFromColor(customColor);
			startColor = gradientFillColors.startColor;
			stopColor = gradientFillColors.stopColor;
		}

		if (!startColor || !stopColor) {
			return '';
		}

		const gradient = ctx.createLinearGradient(0, 0, 0, paneBounds.height);
		gradient.addColorStop(0, startColor);
		gradient.addColorStop(1, stopColor);
		return gradient;
	}

	private getGradientFillFromColor(color: string) {
		return {
			startColor: this.parseGradientColor(color, gradientFillColorsOpacity.startColor),
			stopColor: this.parseGradientColor(color, gradientFillColorsOpacity.stopColor),
		};
	}

	private parseGradientColor(color: string, opacity: GradientFillColorOpacityCategory) {
		if (isHexWithAlpha(color) || isRgba(color)) {
			return color;
		}
		if (isHexThreeDigits(color)) {
			return `${fromHexThreeDigitsToHex(color)}${opacity.hex}`;
		}
		if (isHex(color)) {
			return `${color}${opacity.hex}`;
		}
		if (isRgb(color)) {
			return toRGBA(color, opacity.rgba);
		}
		return color;
	}
}
