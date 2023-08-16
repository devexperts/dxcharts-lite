/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
// import { CanvasBoundsContainer } from '../../canvas/CanvasBoundsContainer';
// import { ChartModel } from '../../components/chart/ChartModel';
// import { DataSeriesModel, VisualSeriesPoint } from '../../model/DataSeriesModel';
import { SeriesDrawer } from '../data-series.drawer';

export class RectangularToolDrawer implements SeriesDrawer {
	// private lastDrawnTimelineX: number = -1;
	// private regularZoneOpacity: number = 0.3;
	// private lastZoneOpacity: number = 0.4;

	// constructor(private chartModel: ChartModel, private chartBoundsContainer: CanvasBoundsContainer) {}

	draw(): void {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	// draw(ctx: CanvasRenderingContext2D, allPoints: VisualSeriesPoint[][], model: DataSeriesModel): void {
	// 	const line: StudyLine = studySeries.line(lineNumber);
	// 	const next: StudyLine = studySeries.line(lineNumber + 1);
	// 	const timelinesXToDraw: Array<number> = [];
	// 	if (!next || !this.isRectangularStudy(next) || line.colors?.length === 0) {
	// 		return;
	// 	}
	// 	to = Math.min(to, series.length, studySeries.series[lineNumber + 1].length);
	// 	ctx.globalAlpha = 0.35;
	// 	let startX = NaN;
	// 	let previousX = NaN;
	// 	let previousTopY = NaN;
	// 	let previousBottomY = NaN;
	// 	const gap = 0;
	// 	const showTimelines = studySeries.studyConfig.parameters.filter(param => param.id === 'showTimeLines') || [];
	// 	const drawTimelines = showTimelines.length > 0 && showTimelines[0].value && showTimelines[0].value !== 'false';
	// 	const colors = line.colors;
	// 	if (!colors) {
	// 		return;
	// 	}
	// 	ctx.save();
	// 	const color = colors[0];
	// 	for (let i = from; i < to; i++) {
	// 		const topPoint = studySeries.series[lineNumber][i];
	// 		const currentTopY = studySeries.toY(topPoint.val);
	// 		const currentBottomY = studySeries.toY(studySeries.series[lineNumber + 1][i].val);
	// 		if (
	// 			startX &&
	// 			!isNaN(startX) &&
	// 			(!topPoint ||
	// 				isNaN(topPoint.val) ||
	// 				(!isNaN(currentBottomY) && !isNaN(currentTopY) && previousBottomY !== currentBottomY) ||
	// 				previousTopY !== currentTopY)
	// 		) {
	// 			this.drawRectAndStoreX(
	// 				ctx,
	// 				startX - gap,
	// 				previousTopY,
	// 				previousX - startX + 2 * gap,
	// 				previousBottomY - previousTopY,
	// 				color,
	// 				timelinesXToDraw,
	// 				drawTimelines,
	// 				this.regularZoneOpacity,
	// 			);
	// 			startX = NaN;
	// 			previousBottomY = NaN;
	// 			previousTopY = NaN;
	// 			previousX = NaN;
	// 		}
	// 		if (topPoint && !isNaN(topPoint.val)) {
	// 			const currentX = studySeries.toX(topPoint.idx);
	// 			if (isNaN(startX)) {
	// 				startX = currentX;
	// 			}
	// 			previousX = currentX;
	// 			previousTopY = studySeries.toY(topPoint.val);
	// 			previousBottomY = studySeries.toY(studySeries.series[lineNumber + 1][i].val);
	// 		}
	// 	}
	// 	if (!isNaN(startX)) {
	// 		this.drawRectAndStoreX(
	// 			ctx,
	// 			startX - gap,
	// 			previousTopY,
	// 			previousX - startX + 2 * gap,
	// 			previousBottomY - previousTopY,
	// 			color,
	// 			timelinesXToDraw,
	// 			drawTimelines,
	// 			this.lastZoneOpacity,
	// 		);
	// 	}
	// 	if (timelinesXToDraw.length > 0) {
	// 		timelinesXToDraw.reverse().forEach(timelineX => this.drawTimeline(ctx, color, timelineX));
	// 	}
	// 	ctx.restore();
	// }
	// drawRectAndStoreX(
	// 	ctx: CanvasRenderingContext2D,
	// 	x: number,
	// 	y: number,
	// 	width: number,
	// 	height: number,
	// 	color: string,
	// 	timelinesXToDraw: Array<number>,
	// 	drawTimelines: boolean,
	// 	opacity: number,
	// ): void {
	// 	ctx.fillStyle = toRGBA(color, opacity);
	// 	if (drawTimelines) {
	// 		timelinesXToDraw.push(x);
	// 		timelinesXToDraw.push(x + width);
	// 	}
	// 	ctx.fillRect(x, y, width, height);
	// }
	// private drawTimeline(ctx: CanvasRenderingContext2D, color: string, x: number) {
	// 	if (x.toFixed(2) === this.lastDrawnTimelineX.toFixed(2)) {
	// 		return;
	// 	}
	// 	ctx.strokeStyle = color;
	// 	const mainChartBounds = this.chartBoundsContainer.getBounds(CanvasElement.CHART);
	// 	ctx.beginPath();
	// 	ctx.moveTo(x, mainChartBounds.y);
	// 	ctx.lineTo(x, mainChartBounds.y + mainChartBounds.height);
	// 	ctx.stroke();
	// 	this.lastDrawnTimelineX = x;
	// }
}
