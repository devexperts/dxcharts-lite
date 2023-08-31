/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export interface ChartElements {
	canvasArea?: HTMLElement;
	snapshotCanvas?: HTMLCanvasElement;
	backgroundCanvas?: HTMLCanvasElement;
	mainCanvas?: HTMLCanvasElement;
	dynamicObjectsCanvas?: HTMLCanvasElement;
	yAxisLabelsCanvas?: HTMLCanvasElement;
	crossToolCanvas?: HTMLCanvasElement;
	hitTestCanvas?: HTMLCanvasElement;
	chartResizer?: HTMLElement;
	chartContainer?: HTMLElement;
}

export type ValidatedChartElements = Required<ChartElements>;

export const validateChartElements = (els: ChartElements): els is ValidatedChartElements => {
	const canvasAreaAvailable = els.canvasArea !== null;
	const snapshotCanvasAvailable = els.snapshotCanvas !== null;
	const backgroundCanvasAvailable = els.backgroundCanvas !== null;
	const mainCanvasAvailable = els.mainCanvas !== null;
	const yAxisLabelsCanvasAvailable = els.yAxisLabelsCanvas !== null;
	const crossToolCanvasAvailable = els.crossToolCanvas !== null;
	const hitTestCanvasAvailable = els.hitTestCanvas !== null;
	const chartResizerAvailable = els.chartResizer !== null;
	const chartContainerAvailable = els.chartContainer !== null;
	const dynamicObjectsCanvasAvailable = els.dynamicObjectsCanvas !== null;
	return (
		canvasAreaAvailable &&
		snapshotCanvasAvailable &&
		backgroundCanvasAvailable &&
		mainCanvasAvailable &&
		yAxisLabelsCanvasAvailable &&
		crossToolCanvasAvailable &&
		hitTestCanvasAvailable &&
		chartResizerAvailable &&
		chartContainerAvailable &&
		dynamicObjectsCanvasAvailable
	);
};
