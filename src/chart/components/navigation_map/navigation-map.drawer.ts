/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../chart.config';
import { ChartModel } from '../chart/chart.model';
import { CanvasModel } from '../../model/canvas.model';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { Drawer } from '../../drawers/drawing-manager';
import { Bounds } from '../../model/bounds.model';
import {
	getTextLines,
	drawText,
	CanvasTextProperties,
	getTextLineHeight,
	prepareTextForFill,
} from '../../utils/canvas/canvas-text-functions.utils';
import { DateTimeFormatterFactory } from '../../model/date-time.formatter';
import { getFormattedTimeLabel } from './navigation-map.model';
import { flat } from '../../utils/array.utils';

const BTN_ARROW_WIDTH = 4;

interface NMapTimeLabelProperties {
	dateFormat: string;
	padding: {
		x: number;
		y: number;
	};
	textProperties: CanvasTextProperties;
}

export class NavigationMapDrawer implements Drawer {
	constructor(
		private config: FullChartConfig,
		private chartModel: ChartModel,
		private canvasModel: CanvasModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private formatterFactory: DateTimeFormatterFactory,
		private visualCandlesProvider: () => Array<[number, number]>,
	) {}

	/**
	 * Draws the navigation map on the canvas if it is visible in the configuration.
	 * It first gets the bounds of all the necessary elements on the canvas.
	 * Then it fills the background of the navigation map with the configured color.
	 * Draws a line at the top of the navigation map with the configured color.
	 * Draws the left and right arrow buttons if their width is not zero.
	 * Draws the chart with the configured colors and fills it with a gradient if the gradient colors are configured.
	 * Draws the slider with the left and right knots and the slider window.
	 * Draws the time labels.
	 * @returns {void}
	 */
	draw(): void {
		if (this.config.components.navigationMap.visible) {
			const candles = this.visualCandlesProvider();
			if (candles.length) {
				const nMap = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP);
				const btnL = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_BTN_L);
				const btnR = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_BTN_R);
				const knotL = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_KNOT_L);
				const knotR = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_KNOT_R);
				const slider = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_SLIDER_WINDOW);
				const chart = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_CHART);

				const ctx = this.canvasModel.ctx;
				ctx.fillStyle = this.config.colors.navigationMap.backgroundColor;
				ctx.fillRect(nMap.x, nMap.y, nMap.width, nMap.height);

				// bar resizer at the very top
				ctx.strokeStyle = this.config.colors.paneResizer.lineColor;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(nMap.x, nMap.y);
				ctx.lineTo(nMap.x + nMap.width, nMap.y);
				ctx.closePath();
				ctx.stroke();
				// btn left and right
				if (btnL.width !== 0) {
					this.drawLeftArrowButton(ctx, btnL, this.config);
				}
				if (btnR.width !== 0) {
					this.drawRightArrowButton(ctx, btnR, this.config);
				}
				// chart
				ctx.fillStyle = this.config.colors.navigationMap.mapFillColor;
				ctx.beginPath();
				ctx.moveTo(chart.x, chart.y + chart.height);
				for (const candle of candles) {
					ctx.lineTo(candle[0], candle[1]);
				}
				ctx.lineTo(chart.x + chart.width, chart.y + chart.height);
				ctx.lineTo(chart.x, chart.y + chart.height);
				ctx.closePath();
				if (
					this.config.colors.navigationMap.mapGradientTopColor &&
					this.config.colors.navigationMap.mapGradientBottomColor
				) {
					const grd = ctx.createLinearGradient(chart.x, chart.y, chart.x, chart.y + chart.height);
					grd.addColorStop(0, this.config.colors.navigationMap.mapGradientTopColor);
					grd.addColorStop(1, this.config.colors.navigationMap.mapGradientBottomColor);
					ctx.fillStyle = grd;
				}
				ctx.fill();
				if (this.config.colors.navigationMap.mapColor) {
					ctx.strokeStyle = this.config.colors.navigationMap.mapColor;
					ctx.stroke();
				}
				// slider
				this.drawSlider(ctx, knotL, knotR, btnL, slider);
				// time labels
				this.drawTimeLabels(ctx);
			}
		}
	}

	/**
	 * Moves the left knot and the slider to the right of the left arrow button if the left knot is to the left of the button.
	 * @param {Bounds} knotL - The bounds of the left knot.
	 * @param {Bounds} knotR - The bounds of the right knot.
	 * @param {Bounds} btnL - The bounds of the left arrow button.
	 * @param {Bounds} slider - The bounds of the slider.
	 */
	private blockDrawSliderOnLeftArrow(knotL: Bounds, knotR: Bounds, btnL: Bounds, slider: Bounds) {
		if (knotL.x <= btnL.x + btnL.width) {
			knotL.x = btnL.x + btnL.width;
			slider.x = knotL.x + knotL.width;
			knotR.x = slider.x + slider.width;
		}
	}

	/**
	 * Draws a slider on a canvas context with given bounds for knots, button and slider.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {Bounds} knotL - The bounds for the left knot.
	 * @param {Bounds} knotR - The bounds for the right knot.
	 * @param {Bounds} btnL - The bounds for the left button.
	 * @param {Bounds} slider - The bounds for the slider.
	 * @returns {void}
	 */
	private drawSlider(ctx: CanvasRenderingContext2D, knotL: Bounds, knotR: Bounds, btnL: Bounds, slider: Bounds) {
		//Slider can't move above the left arrow
		this.blockDrawSliderOnLeftArrow(knotL, knotR, btnL, slider);
		// knots
		this.drawKnotButton(ctx, knotL, this.config, true);
		this.drawKnotButton(ctx, knotR, this.config, false);
		// slider
		ctx.fillStyle = this.config.colors.navigationMap.sliderColor;
		ctx.fillRect(slider.x, slider.y, slider.width, slider.height);
	}

	/**
	 * Draws a left arrow button on a canvas context with the provided bounds and configuration
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
	 * @param {Bounds} bounds - The bounds of the button to be drawn
	 * @param {FullChartConfig} config - The configuration object containing the colors to be used for the button and arrow
	 * @returns {void}
	 */
	private drawLeftArrowButton(ctx: CanvasRenderingContext2D, bounds: Bounds, config: FullChartConfig) {
		ctx.fillStyle = config.colors.navigationMap.buttonColor;
		ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
		ctx.beginPath();
		const leftX: number = Math.round(bounds.x + bounds.width / 2 - BTN_ARROW_WIDTH / 2);
		const midY: number = Math.round(bounds.y + bounds.height / 2);
		ctx.moveTo(leftX, midY);
		ctx.lineTo(leftX + BTN_ARROW_WIDTH, midY + BTN_ARROW_WIDTH);
		ctx.lineTo(leftX + BTN_ARROW_WIDTH, midY - BTN_ARROW_WIDTH);
		ctx.fillStyle = config.colors.navigationMap.buttonArrowColor;
		ctx.fill();
	}

	/**
	 * Draws a right arrow button on a canvas context with the provided bounds and configuration
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
	 * @param {Bounds} bounds - The bounds of the button to be drawn
	 * @param {FullChartConfig} config - The configuration object containing the colors to be used for the button and arrow
	 * @returns {void}
	 */
	private drawRightArrowButton(ctx: CanvasRenderingContext2D, bounds: Bounds, config: FullChartConfig) {
		ctx.fillStyle = config.colors.navigationMap.buttonColor;
		ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
		ctx.beginPath();
		const leftX: number = Math.round(bounds.x + bounds.width / 2 - BTN_ARROW_WIDTH / 2);
		const midY: number = Math.round(bounds.y + bounds.height / 2);
		ctx.moveTo(leftX, midY - BTN_ARROW_WIDTH);
		ctx.lineTo(leftX, midY + BTN_ARROW_WIDTH);
		ctx.lineTo(leftX + BTN_ARROW_WIDTH, midY);
		ctx.fillStyle = config.colors.navigationMap.buttonArrowColor;
		ctx.fill();
	}

	/**
	 * Draws a knot button on a canvas context with the given bounds and configuration.
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {Bounds} bounds - The bounds of the knot button.
	 * @param {FullChartConfig} config - The configuration for the chart.
	 * @param {boolean} isLeft - Whether the knot button is on the left side of the chart.
	 * @returns {void}
	 */
	private drawKnotButton(ctx: CanvasRenderingContext2D, bounds: Bounds, config: FullChartConfig, isLeft: boolean) {
		const borderWidth = config.components.navigationMap.knots.border;
		ctx.fillStyle = config.colors.navigationMap.knotColor;
		const xWithBorder = isLeft ? bounds.x - borderWidth : bounds.x + borderWidth;
		ctx.fillRect(xWithBorder, bounds.y, bounds.width, bounds.height);
		ctx.lineWidth = config.components.navigationMap.knots.lineWidth;

		if (borderWidth > 0) {
			ctx.beginPath();
			ctx.moveTo(xWithBorder, bounds.y);
			ctx.lineTo(xWithBorder, bounds.y + bounds.height);
			ctx.lineTo(xWithBorder + bounds.width, bounds.y + bounds.height);
			ctx.lineTo(xWithBorder + bounds.width, bounds.y);
			ctx.lineTo(xWithBorder, bounds.y);
			ctx.lineWidth = borderWidth;
			ctx.strokeStyle = config.colors.navigationMap.knotBorderColor;
			ctx.stroke();
		}

		ctx.beginPath();
		ctx.moveTo(xWithBorder + bounds.width / 2, bounds.y + bounds.height / 4);
		ctx.lineTo(xWithBorder + bounds.width / 2, bounds.y + (3 * bounds.height) / 4);
		ctx.strokeStyle = config.colors.navigationMap.knotLineColor;
		ctx.stroke();
	}

	/**
	 * Draws time labels on the navigation map canvas.
	 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context for the canvas.
	 * @returns {void}
	 */
	private drawTimeLabels(ctx: CanvasRenderingContext2D) {
		const candleSource = flat(this.chartModel.mainCandleSeries.getSeriesInViewport());
		const timeLabelsConfig = this.config.components.navigationMap.timeLabels;
		const timeLabelsVisible = timeLabelsConfig.visible;
		if (candleSource.length && timeLabelsVisible) {
			const startViewportTimestamp = candleSource[0].candle.timestamp;
			const endViewportTimestamp = candleSource[candleSource.length - 1].candle.timestamp;
			const textLabelL = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_LABEL_L);
			const textLabelR = this.canvasBoundsContainer.getBounds(CanvasElement.N_MAP_LABEL_R);
			const timeLabelsColor = this.config.colors.navigationMap.timeLabelsTextColor;
			const textProperties: CanvasTextProperties = {
				textFill: timeLabelsColor,
				textFontFamily: timeLabelsConfig.fontFamily,
				textSize: `${timeLabelsConfig.fontSize}px`,
			};
			const leftLabelProperties: NMapTimeLabelProperties = {
				dateFormat: timeLabelsConfig.dateFormat,
				padding: timeLabelsConfig.padding,
				textProperties: {
					...textProperties,
					textAlign: 'left',
				},
			};
			const rightLabelProperties: NMapTimeLabelProperties = {
				dateFormat: timeLabelsConfig.dateFormat,
				padding: timeLabelsConfig.padding,
				textProperties: {
					...textProperties,
					textAlign: 'right',
				},
			};
			this.drawTimeLabel(ctx, textLabelL, startViewportTimestamp, leftLabelProperties);
			this.drawTimeLabel(ctx, textLabelR, endViewportTimestamp, rightLabelProperties);
		}
	}

	/**
	 * Draws a time label on a canvas context.
	 * @private
	 * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
	 * @param {Bounds} bounds - The bounds of the label.
	 * @param {number} timestamp - The timestamp to display.
	 * @param {NMapTimeLabelProperties} config - The configuration for the label.
	 * @returns {void}
	 */
	private drawTimeLabel(
		ctx: CanvasRenderingContext2D,
		bounds: Bounds,
		timestamp: number,
		config: NMapTimeLabelProperties,
	) {
		const padding = config.padding;
		const text = getFormattedTimeLabel(timestamp, config.dateFormat, this.formatterFactory);
		prepareTextForFill(ctx, config.textProperties);
		const lineHeight = getTextLineHeight(ctx);
		const lines = getTextLines(text);
		drawText(ctx, lines, bounds.x + padding.x, bounds.y + lineHeight + padding.y, config.textProperties);
	}

	/**
	 * Returns an array of string containing the canvas ID.
	 * @returns {Array<string>} An array of string containing the canvas ID.
	 */
	getCanvasIds(): Array<string> {
		return [this.canvasModel.canvasId];
	}
}
