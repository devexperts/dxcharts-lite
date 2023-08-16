/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CandleSeriesModel } from '../../model/candle-series.model';
import { CandleTheme, ChartConfigComponentsChart } from '../../chart.config';
import VisualCandle from '../../model/visual-candle';
import { avoidAntialiasing } from '../../utils/canvas/canvas-drawing-functions.utils';
import { dpr, floorToDPR } from '../../utils/device/device-pixel-ratio.utils';
import { ChartDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { flat } from '../../utils/array.utils';

export class CandleDrawer implements SeriesDrawer {
	constructor(private config: ChartConfigComponentsChart) {}

	//#region
	// These properties are some kind of optimization hack
	// we can calculate them inside drawCandle method, but it can affect performance since there are a lot of candles - lots of recalculations

	// this value is calculate in following way: 1 / devicePixelRatio
	// pixelLength is a length of one pixel in canvas units (CU), for example if dpr is 1 when in 1 CU we have 1 pixel
	// for dpr 2 we have pixel length equal 0.5 CU, so when you draw a line with width 2, the actual width in pixels will be equal 4
	private pixelLength = 1;
	// lineWidth and halfLineWidth are calculated using ctx.lineWidth (CU - canvas unit)
	// why do we need half line width and line width? - to correctly draw candle border
	// Canvas stroke draws outline border - for example, if we have a rectangle with height=10, width=20
	// and we try to draw a border for this square like this: ctx.strokeRect(0, 0, 10, 20), lineWidth=2
	// as a result on the canvas we have a rectangle which edge points are (-1, -1), (21, 11);
	// for lineWidth=4 we get this edge points as a result: (-2, -2), (22, 12).
	// However the border should not exceed candle width, so we add halfLine width to start point for rectangle
	// and subtract lineWidth from width/height. As a result, candle border on canvas won't exceed candle width
	private lineWidthCU = 1;
	private halfLineWidthCU = 1;
	//#endregion

	public draw(
		ctx: CanvasRenderingContext2D,
		/**
		 * You can pass two-dimension array to divide series into multiple parts
		 */
		points: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	) {
		if (model instanceof CandleSeriesModel) {
			// @ts-ignore
			const visualCandles: VisualCandle[] = flat(points);
			// TODO FIXME draw called 3-4 times on single candle update even if multichart is off
			setLineWidth(ctx, this.config.candleLineWidth, model, drawerConfig, this.config.candleLineWidth);
			avoidAntialiasing(ctx, () => {
				this.pixelLength = 1 / dpr;
				this.halfLineWidthCU = ctx.lineWidth / 2;
				this.lineWidthCU = ctx.lineWidth;
				for (const visualCandle of visualCandles) {
					const { candleTheme, activeCandleTheme } = model.colors;
					if (candleTheme && activeCandleTheme) {
						this.drawCandle(ctx, drawerConfig, model, visualCandle);
					}
				}
			});
		}
	}

	drawCandle(
		ctx: CanvasRenderingContext2D,
		drawerConfig: ChartDrawerConfig,
		candleSeries: CandleSeriesModel,
		visualCandle: VisualCandle,
	) {
		const { candleTheme, activeCandleTheme } = candleSeries.colors;
		const direction = visualCandle.name;
		const currentCandleTheme = visualCandle.isActive ? activeCandleTheme : candleTheme;
		const isHollow = visualCandle.isHollow;

		// choose candle filling color
		if (drawerConfig.singleColor) {
			ctx.fillStyle = drawerConfig.singleColor;
		} else if (isHollow) {
			ctx.fillStyle = currentCandleTheme[`${direction}WickColor`];
		} else {
			ctx.fillStyle = currentCandleTheme[`${direction}Color`];
		}

		const baseX = floorToDPR(candleSeries.view.toX(visualCandle.startUnit));
		const width = floorToDPR(candleSeries.view.xPixels(visualCandle.width));
		const bodyH = visualCandle.bodyHeight(candleSeries.view);

		const [lineStart, bodyStart, _bodyEnd, _lineEnd] = visualCandle.yBodyKeyPoints(candleSeries.view);
		const bodyEnd = bodyStart === _bodyEnd ? bodyStart + 1 : _bodyEnd;
		const lineEnd = lineStart === _lineEnd ? lineStart + 1 : _lineEnd;

		const candleColor = currentCandleTheme[`${direction}Color`];
		const wickColor = direction === 'none' ? candleColor : currentCandleTheme[`${direction}WickColor`];
		ctx.fillStyle = candleColor;

		// wick style, borders are drawn after the wicks, so style for borders will be changed in drawBorder method
		if (drawerConfig.singleColor) {
			ctx.strokeStyle = drawerConfig.singleColor;
		} else {
			ctx.strokeStyle = wickColor;
		}

		const showCandleBorder =
			isHollow ||
			(visualCandle.hasBorder && visualCandle.isActive
				? this.config.showActiveCandlesBorder
				: this.config.showCandlesBorder);

		// just draw a vertical line
		const showWicks = this.config.showWicks;
		// separate logic for each candle width in pixels
		if (width < 2) {
			ctx.beginPath();
			ctx.moveTo(baseX, showWicks ? lineStart : bodyStart);
			ctx.lineTo(baseX, showWicks ? lineEnd : bodyEnd);
			ctx.stroke();
		} else if (width < 3) {
			// draw 2 vertical lines for each px width
			ctx.beginPath();
			ctx.moveTo(baseX, showWicks ? lineStart : bodyStart);
			ctx.lineTo(baseX, showWicks ? lineEnd : bodyEnd);
			ctx.moveTo(baseX + 1, bodyStart);
			ctx.lineTo(baseX + 1, bodyEnd);
			ctx.stroke();
		} else if (width === 3) {
			const offset = width / dpr;
			this.drawCandlesWicks(ctx, baseX + offset, lineStart, lineEnd, bodyStart, bodyEnd);
			// border = 2px + 1px line
			if (!isHollow) {
				ctx.beginPath();
				ctx.moveTo(baseX + offset, bodyStart);
				ctx.lineTo(baseX + offset, bodyEnd);
				ctx.stroke();
			}
			this.drawCandleBorder(
				ctx,
				drawerConfig,
				currentCandleTheme,
				visualCandle,
				baseX + this.halfLineWidthCU,
				bodyStart + this.halfLineWidthCU,
				width - this.lineWidthCU,
				bodyH - this.lineWidthCU,
			);
		} else {
			// add paddings if exist
			const wickX = floorToDPR(candleSeries.view.toX(visualCandle.centerUnit));
			// candles' wick doesn't touch body end, so substract 1
			// we will rework the drawer in future, so let's keep it this way for now
			this.drawCandlesWicks(ctx, wickX, lineStart, lineEnd, bodyStart, bodyEnd - 1);
			const paddingPercent = this.config.candlePaddingPercent;
			const paddingWidthOffset = Math.max(floorToDPR((width * paddingPercent) / 2), this.pixelLength);
			const paddingBaseX = baseX + paddingWidthOffset;
			const paddingWidth = width - paddingWidthOffset * 2;
			if (!isHollow) {
				if (drawerConfig.singleColor) {
					ctx.fillStyle = drawerConfig.singleColor;
				}
				ctx.fillRect(paddingBaseX, bodyStart, paddingWidth, bodyH);
			}
			// choose border color around candle and draw candle
			if (showCandleBorder) {
				this.drawCandleBorder(
					ctx,
					drawerConfig,
					currentCandleTheme,
					visualCandle,
					paddingBaseX + this.halfLineWidthCU,
					bodyStart + this.halfLineWidthCU,
					paddingWidth - this.lineWidthCU,
					bodyH - this.lineWidthCU,
				);
			}
		}
	}

	private drawCandlesWicks(
		ctx: CanvasRenderingContext2D,
		x: number,
		lineStart: number,
		lineEnd: number,
		bodyStart: number,
		bodyEnd: number,
	) {
		// draw wick vertical line
		if (this.config.showWicks) {
			ctx.beginPath();
			// upper wick
			ctx.moveTo(x, lineStart);
			ctx.lineTo(x, bodyStart);
			// lower wick
			ctx.moveTo(x, bodyEnd);
			ctx.lineTo(x, lineEnd);
			ctx.stroke();
		}
	}

	private drawCandleBorder(
		ctx: CanvasRenderingContext2D,
		drawerConfig: ChartDrawerConfig,
		candleTheme: CandleTheme,
		visualCandle: VisualCandle,
		x: number,
		y: number,
		w: number,
		h: number,
	) {
		if (drawerConfig.singleColor) {
			ctx.strokeStyle = drawerConfig.singleColor;
		} else {
			const direction = visualCandle.name;
			ctx.strokeStyle =
				direction === 'none' ? candleTheme[`${direction}Color`] : candleTheme[`${direction}WickColor`];
		}
		ctx.strokeRect(x, y, w, h);
	}
}
