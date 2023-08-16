/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Bounds } from '../../model/bounds.model';
import { CHART_UUID, CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ChartConfigComponentsWaterMark, FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { DrawingManager } from '../../drawers/drawing-manager';
import EventBus from '../../events/event-bus';
import { merge } from '../../utils/merge.utils';
import { ChartModel } from '../chart/chart.model';
import { PaneManager } from '../pane/pane-manager.component';
import { WaterMarkDrawer } from './water-mark.drawer';

export interface WaterMarkConfig {
	isVisible?: boolean;
	fontFamily?: string;
	firstRowFontSize?: number;
	firstRowBottomPadding?: number;
	secondRowFontSize?: number;
	secondRowBottomPadding?: number;
	thirdRowFontSize?: number;
}

export interface WaterMarkData {
	firstRow?: string;
	secondRow?: string;
	thirdRow?: string;
}

export class WaterMarkComponent extends ChartBaseElement {
	private waterMarkDrawer: WaterMarkDrawer;
	private waterMarkConfig: ChartConfigComponentsWaterMark;
	private waterMarkData: WaterMarkData;
	constructor(
		private paneManager: PaneManager,
		private chartModel: ChartModel,
		public eventBus: EventBus,
		private config: FullChartConfig,
		canvasBoundsContainer: CanvasBoundsContainer,
		public canvasModel: CanvasModel,
		drawingManager: DrawingManager,
	) {
		super();
		this.waterMarkConfig = this.config.components.waterMark;
		this.waterMarkData = this.getWaterMarkData();
		this.waterMarkDrawer = new WaterMarkDrawer(
			this.config,
			canvasBoundsContainer,
			canvasModel,
			() => this.waterMarkConfig,
			() => this.waterMarkData,
		);
		this.addRxSubscription(
			merge(
				canvasBoundsContainer.observeBoundsChanged(CanvasElement.PANE_UUID(CHART_UUID)),
				this.paneManager.panesChangedSubject,
			).subscribe((bounds: Bounds) => {
				this.waterMarkConfig = this.recalculateTextSize(bounds.width, bounds.height);
			}),
		);
		this.addRxSubscription(
			this.chartModel.candlesSetSubject.subscribe(() => {
				this.waterMarkData = this.getWaterMarkData();
			}),
		);
		drawingManager.addDrawerAfter(this.waterMarkDrawer, 'WATERMARK', 'DRAWINGS');
	}

	/**
	 * Sets the visibility of the watermark component.
	 *
	 * @param {boolean} visible - A boolean indicating whether the watermark should be visible or not.
	 * @returns {void}
	 */
	public setWaterMarkVisible(visible: boolean): void {
		if (this.config.components && this.config.components.waterMark) {
			this.config.components.waterMark.visible = visible;
			this.canvasModel.fireDraw();
		}
	}

	/**
	 * Sets the watermark data to be used in the canvas.
	 * @param {WaterMarkData} watermarkData - The data to be used as watermark.
	 * @returns {void}
	 */
	public setWaterMarkData(watermarkData: WaterMarkData): void {
		this.waterMarkData = watermarkData;
		this.canvasModel.fireDraw();
	}

	/**
	 * Returns the water mark data object if it exists, otherwise returns an empty object.
	 * @returns {WaterMarkData} The water mark data object.
	 */
	private getWaterMarkData(): WaterMarkData {
		return this.waterMarkData || {};
	}

	/**
     * Sets the watermark configuration for the chart.
     * @param {WaterMarkConfig} watermarkConfig - The configuration object for the watermark.
     * @returns {void}
     
    */
	public setWaterMarkConfig(watermarkConfig: WaterMarkConfig): void {
		if (!watermarkConfig || !this.config.components) {
			return;
		}
		if (!this.config.components.waterMark) {
			this.config.components.waterMark = JSON.parse(JSON.stringify(watermarkConfig));
		} else {
			const newWatermark: WaterMarkConfig = {};
			merge(newWatermark, watermarkConfig);
			merge(newWatermark, this.config.components.waterMark);
			// eslint-disable-next-line no-restricted-syntax
			this.config.components.waterMark = newWatermark as ChartConfigComponentsWaterMark &
				Required<ChartConfigComponentsWaterMark>;
		}
		this.canvasModel.fireDraw();
	}

	/**
	 * Sets the logo image to be used as a watermark.
	 * @param {CanvasImageSource} img - The image to be used as a watermark.
	 */
	public setLogoImage(img: CanvasImageSource) {
		this.waterMarkDrawer.setLogoImage(img);
	}

	/**
	 * Recalculates the watermark text size based on the chart's width and height.
	 * @param {number} chartWidth - The width of the chart.
	 * @param {number} chartHeight - The height of the chart.
	 * @returns {Object} - An object containing the updated watermark font sizes.
	 */
	private recalculateTextSize(chartWidth: number, chartHeight: number) {
		const defaultScreenWidth = 1920;
		const defaultScreenHeight = 1080;
		// this function is used to make logarithmic dependency between screen size and watermark size
		const fun = (x: number) => (0.15 * Math.log(x)) / Math.log(1.5) + 1;
		const textSizeRatioHorizontal = fun(chartWidth / defaultScreenWidth);
		const textSizeRatioVertical = fun(chartHeight / defaultScreenHeight);
		const textSizeRatio = Math.min(textSizeRatioHorizontal, textSizeRatioVertical);
		const textRatio = textSizeRatio >= 0 ? textSizeRatio : 0;
		const updatedProps = {
			firstRowFontSize: Math.round(this.config.components.waterMark.firstRowFontSize * textRatio),
			secondRowFontSize: Math.round(this.config.components.waterMark.secondRowFontSize * textRatio),
			thirdRowFontSize: Math.round(this.config.components.waterMark.thirdRowFontSize * textRatio),
		};
		return { ...this.config.components.waterMark, ...updatedProps };
	}
}
