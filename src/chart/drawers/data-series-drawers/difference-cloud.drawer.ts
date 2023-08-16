/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { ChartDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';
import { Viewable } from '../../model/scaling/viewport.model';
import { buildLinePath } from './data-series-drawers.utils';
import { Point } from '../../inputlisteners/canvas-input-listener.component';
import { firstOf, lastOf } from '../../utils/array.utils';
import { toRGBA } from '../../utils/color.utils';

/**
 * Point used to draw difference type indicator (clouds) (e.g. Ichimoku indicator)
 */
export interface DifferencePoint {
	diffPoints: [VisualSeriesPoint, VisualSeriesPoint];
}

export class DifferenceCloudDrawer implements SeriesDrawer {
	constructor() {}

	draw(
		ctx: CanvasRenderingContext2D,
		allPoints: VisualSeriesPoint[][],
		model: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	): void {
		if (model.config.visible) {
			// draw main line
			allPoints.forEach((points, idx) => {
				const config = model.getPaintConfig(idx);
				setLineWidth(ctx, config.lineWidth, model, drawerConfig, config.hoveredLineWidth);
				const lineColor = drawerConfig.singleColor ?? config.color;
				ctx.strokeStyle = lineColor;

				this.drawLine(ctx, points, model.view);
			});
			// draw difference cloud
			model.linkedDataSeriesModels.forEach((linkedSeries, linkedSeriesIdx) => {
				if (
					isDifferenceTool(linkedSeries.config.type) &&
					isDifferenceTool(model.config.type) &&
					linkedSeries.config.visible
				) {
					const differencePoints: DifferencePoint[] = [];

					const mainSeries = model;

					const allPointsMain = mainSeries.getSeriesInViewport(
						mainSeries.scaleModel.xStart - 1,
						mainSeries.scaleModel.xEnd + 1,
					);

					const allPointsLinked = linkedSeries.getSeriesInViewport(
						linkedSeries.scaleModel.xStart - 1,
						linkedSeries.scaleModel.xEnd + 1,
					);

					allPointsMain.forEach((points, idx) => {
						const to = Math.min(points.length, allPointsLinked[idx].length);
						for (let k = 0; k < to; k++) {
							const diffPoints: [VisualSeriesPoint, VisualSeriesPoint] = [
								points[k].clone(),
								allPointsLinked[idx][k].clone(),
							];
							differencePoints.push({
								diffPoints,
							});
						}
						const curSeriesColor = mainSeries.getPaintConfig(idx).color;
						const nextSeriesColor = linkedSeries.getPaintConfig(linkedSeriesIdx).color;
						this.drawDifference(
							ctx,
							curSeriesColor,
							nextSeriesColor,
							differencePoints,
							mainSeries,
							linkedSeries,
							drawerConfig,
						);
					});
				}
			});
		}
	}

	private drawLine(ctx: CanvasRenderingContext2D, points: VisualSeriesPoint[], view: Viewable) {
		ctx.beginPath();
		buildLinePath(points, ctx, view);
		ctx.stroke();
	}

	private drawDifference(
		ctx: CanvasRenderingContext2D,
		lineColor: string,
		nextLineColor: string,
		diffPoints: DifferencePoint[],
		curSeries: DataSeriesModel,
		nextSeries: DataSeriesModel,
		drawerConfig: ChartDrawerConfig,
	) {
		const [linePoints, nextLinePoints]: [VisualSeriesPoint[], VisualSeriesPoint[]] = [[], []];
		diffPoints.forEach(points => {
			const [point, nextPoint] = points.diffPoints;
			linePoints.push(point);
			nextLinePoints.push(nextPoint);
		});
		const curSeriesPoints = mapDataSeriesDiffPointsIntoPoints(linePoints, curSeries.view);
		const nextSeriesPoints = mapDataSeriesDiffPointsIntoPoints(nextLinePoints, nextSeries.view);
		this.fillCloud(ctx, nextLineColor, curSeriesPoints, nextSeriesPoints, drawerConfig);
		this.fillCloud(ctx, lineColor, nextSeriesPoints, curSeriesPoints, drawerConfig);
	}

	private fillCloud(
		ctx: CanvasRenderingContext2D,
		color: string,
		linePoints: Point[],
		nextLinePoints: Point[],
		drawerConfig: ChartDrawerConfig,
	) {
		ctx.save();
		// clip above lowerLine
		ctx.beginPath();
		const firstX = firstOf(linePoints)?.x ?? 0;
		const lastX = lastOf(linePoints)?.x ?? 0;

		ctx.lineTo(firstX, 0);
		linePoints.forEach(p => {
			ctx.lineTo(p.x, p.y);
		});
		ctx.lineTo(lastX, 0);
		ctx.closePath();
		ctx.clip();
		ctx.beginPath();
		linePoints.forEach((p, idx) => {
			if (idx === 0) {
				ctx.moveTo(p.x, p.y);
			} else {
				ctx.lineTo(p.x, p.y);
			}
		});
		nextLinePoints
			.slice()
			.reverse()
			.forEach(p => {
				ctx.lineTo(p.x, p.y);
			});
		ctx.closePath();
		ctx.fillStyle = drawerConfig.singleColor ? drawerConfig.singleColor : toRGBA(color ? color : '#383838', 0.3);
		ctx.fill();
		ctx.restore();
	}
}

const mapDataSeriesDiffPointsIntoPoints = (points: VisualSeriesPoint[], view: Viewable): Point[] => {
	return points.map(p => {
		const { centerUnit, close } = p;
		const x = view.toX(centerUnit);
		const y = view.toY(close);
		return { x, y };
	});
};

export const isDifferenceTool = (type: string) => type === 'DIFFERENCE';
