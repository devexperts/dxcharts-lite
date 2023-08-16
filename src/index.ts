/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ChartBootstrap from './chart/bootstrap';
import { PartialChartConfig } from './chart/chart.config';

const createChart =
	/**
	 * Creates a new chart instance using ChartBootstrap class and returns it.
	 * @param {HTMLElement} el - The HTML element where the chart will be rendered.
	 * @param {PartialChartConfig} config - Optional configuration object for the chart.
	 * @returns {ChartBootstrap} - The chart instance.
	 */
	(el: HTMLElement, config: PartialChartConfig = {}) => {
		const chart = new ChartBootstrap(el, config);
		return chart;
	};

/**
 * DXChart global variable. Exposes ChartBootstrap constructor.
 * @doc-tags chart-core,api
 */
// @ts-ignore
window['DXChart'] = {
	// @ts-ignore
	...window['DXChart'],
	ChartBootstrap,
	createChart,
};

export { createChart, ChartBootstrap };
