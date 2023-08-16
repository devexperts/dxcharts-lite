/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig, YAxisAlign, getFontFromConfig } from '../chart.config';
import { CanvasModel } from '../model/canvas.model';
import { calculateTextWidth } from '../utils/canvas/canvas-font-measure-tool.utils';

export interface YAxisWidthContributor {
	getLargestLabel: () => string;
	getYAxisIndex: () => number;
	getYAxisAlign: () => YAxisAlign;
	getPaneUUID: () => string;
}

export type ExtentsOrder = Map<
	string, // uuid of the pane
	{
		left: number[];
		right: number[];
	}
>;
export interface YAxisWidths {
	left: number[];
	right: number[];
}

export class YAxisBoundsContainer {
	public extentsOrder: ExtentsOrder = new Map();

	constructor(private config: FullChartConfig, private mainCanvasModel: CanvasModel) {}

	yAxisWidthContributors: YAxisWidthContributor[] = [];
	/**
	 * Registers a YAxisWidthContributor to the chart.
	 *
	 * @param {YAxisWidthContributor} contributor - The YAxisWidthContributor to be registered.
	 * @returns {void}
	 */
	public registerYAxisWidthContributor(contributor: YAxisWidthContributor) {
		this.yAxisWidthContributors.push(contributor);
	}

	/**
	 * Removes a YAxisWidthContributor from the chart.
	 *
	 * @param {YAxisWidthContributor} contributor - The YAxisWidthContributor to be removed.
	 * @returns {void}
	 */
	public removeYAxisWidthContributor(contributor: YAxisWidthContributor) {
		this.yAxisWidthContributors = this.yAxisWidthContributors.filter(c => c !== contributor);
	}

	/**
	 * Calculates the width of a given text using the font from the yAxis component of the chart configuration
	 * @param {string} text - The text to calculate the width of
	 * @returns {number} - The width of the text in pixels
	 */
	private getTextWidth(text: string): number {
		const font = getFontFromConfig(this.config.components.yAxis);
		return calculateTextWidth(text, this.mainCanvasModel.ctx, font);
	}

	/**
	 * Updates width of Y axis.
	 * Considers max text of YAxis labels.
	 */
	public getYAxisWidths(): YAxisWidths {
		this.extentsOrder.clear();
		const left: number[] = [];
		const right: number[] = [];
		const margin =
			this.config.components.yAxis.labelBoxMargin.start + this.config.components.yAxis.labelBoxMargin.end;
		this.yAxisWidthContributors.forEach(c => {
			const width = this.getTextWidth(c.getLargestLabel()) + margin;
			const idx = c.getYAxisIndex();
			const uuid = c.getPaneUUID();
			const extentOrder = this.extentsOrder.get(uuid) ?? { left: [], right: [] };
			if (c.getYAxisAlign() === 'left') {
				const i = extentOrder.left.length;
				left[i] = Math.max(left[i] ?? 0, width);
				extentOrder.left.push(idx);
			} else {
				const i = extentOrder.right.length;
				right[i] = Math.max(right[i] ?? 0, width);
				extentOrder.right.push(idx);
			}
			this.extentsOrder.set(uuid, extentOrder);
		});
		return { left, right };
	}
}
