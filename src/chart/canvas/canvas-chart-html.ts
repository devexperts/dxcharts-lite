/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export default (devexpertsPromoLink: boolean) =>
	'<div data-element="chartResizer" style="position: relative; min-height: 20px; height: 100%; width: 100%; touch-action: manipulation; z-index: 0;">\n' +
	'\t<div data-element="chartContainer" style="position: absolute; height: 100%; width: 100%;" class="chart chartArea--graph">\n' +
	'\t\t<div data-element="canvasArea" style="position: relative; height: 100%; width: 100%; touch-action: manipulation;">\n' +
	'\t\t\t<canvas data-element="snapshotCanvas" style="z-index: 0"></canvas>\n' +
	'\t\t\t<canvas data-element="backgroundCanvas" style="z-index: 1"></canvas>\n' +
	'\t\t\t<canvas data-element="mainCanvas" style="z-index: 2"></canvas>\n' +
	'\t\t\t<canvas data-element="staticDrawingCanvas" style="z-index: 3"></canvas>\n' +
	'\t\t\t<canvas data-element="dataSeriesCanvas" style="z-index: 5"></canvas>\n' +
	'\t\t\t<canvas data-element="overDataSeriesCanvas" style="z-index: 6"></canvas>\n' +
	'\t\t\t<canvas data-element="dynamicDrawingCanvas" style="z-index: 7"></canvas>\n' +
	'\t\t\t<canvas data-element="yAxisLabelsCanvas" style="z-index: 8"></canvas>\n' +
	'\t\t\t<canvas data-element="crossToolCanvas" style="z-index: 9"></canvas>\n' +
	'\t\t\t<canvas data-element="hitTestCanvas" style="z-index: 10"></canvas>\n' +
	`${
		devexpertsPromoLink
			? '\t\t\t<p style="position: absolute; visibility: hidden;">If you have any suggestions or are experiencing any issues, please feel free to contact us at <a href="https://devexperts.com/dxcharts/">devexperts.com</a></p>\n'
			: ''
	}` +
	'\t\t</div>\n' +
	'\t</div>\n' +
	'</div>\n';
