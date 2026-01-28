/*
 * Copyright (C) 2019 - 2026 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { DataSeriesModel, VisualSeriesPoint } from '../../model/data-series.model';
import { HTSeriesDrawerConfig, SeriesDrawer, setLineWidth } from '../data-series.drawer';
import { Viewable } from '../../model/scaling/viewport.model';
import { buildLinePath } from './data-series-drawers.utils';
import { Point } from '../../inputlisteners/canvas-input-listener.component';
import { firstOf, lastOf } from '../../utils/array.utils';
import { toRGBA } from '../../utils/color.utils';

export interface DifferenceCloudDrawPredicates {
	showLine?: boolean;
	showCloud?: boolean;
	backgroundColor?: string;
}

const DEFAULT_LINE_COLOR = `#383838`;

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
		hitTestDrawerConfig: HTSeriesDrawerConfig,
	): void {
		const drawPredicates = model.config.additionalVisibilityPredicatesMap;
		const shouldDrawLine = drawPredicates?.showLine !== undefined ? drawPredicates.showLine : model.config.visible;
		const shouldDrawCloud =
			drawPredicates?.showCloud !== undefined ? drawPredicates.showCloud : model.config.visible;

		if (shouldDrawLine) {
			// draw main line
			allPoints.forEach((points, idx) => {
				const config = model.getPaintConfig(idx);
				setLineWidth(ctx, config.lineWidth, model, hitTestDrawerConfig, config.hoveredLineWidth);
				const lineColor = hitTestDrawerConfig.color ?? config.color;
				ctx.strokeStyle = lineColor;

				this.drawLine(ctx, points, model.view);
			});
		}
		if (shouldDrawCloud) {
			// draw difference cloud
			model.linkedDataSeriesModels.forEach((linkedSeries, linkedSeriesIdx) => {
				const linkedDrawPredicates = linkedSeries.config.additionalVisibilityPredicatesMap;
				const linkedShouldDrawCloud =
					linkedDrawPredicates?.showCloud !== undefined
						? linkedDrawPredicates.showCloud
						: linkedSeries.config.visible;

				if (
					isDifferenceTool(linkedSeries.config.type) &&
					isDifferenceTool(model.config.type) &&
					linkedShouldDrawCloud
				) {
					const differencePoints: DifferencePoint[] = [];

					const mainSeries = model;

					const allPointsMain = mainSeries.getSeriesInViewport(
						mainSeries.scale.xStart - 1,
						mainSeries.scale.xEnd + 1,
					);

					const allPointsLinked = linkedSeries.getSeriesInViewport(
						linkedSeries.scale.xStart - 1,
						linkedSeries.scale.xEnd + 1,
					);

					allPointsMain.forEach((points, idx) => {
						const to = Math.min(points.length, allPointsLinked[idx]?.length ?? 0);
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
							hitTestDrawerConfig,
							drawPredicates,
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

	protected drawDifference(
		ctx: CanvasRenderingContext2D,
		lineColor: string,
		nextLineColor: string,
		diffPoints: DifferencePoint[],
		curSeries: DataSeriesModel,
		nextSeries: DataSeriesModel,
		hitTestDrawerConfig: HTSeriesDrawerConfig,
		drawPredicates?: DifferenceCloudDrawPredicates,
	) {
		const [linePoints, nextLinePoints]: [VisualSeriesPoint[], VisualSeriesPoint[]] = [[], []];
		diffPoints.forEach(points => {
			const [point, nextPoint] = points.diffPoints;
			linePoints.push(point);
			nextLinePoints.push(nextPoint);
		});
		const curSeriesPoints = this.mapDataSeriesDiffPointsIntoPoints(linePoints, curSeries.view);
		const nextSeriesPoints = this.mapDataSeriesDiffPointsIntoPoints(nextLinePoints, nextSeries.view);

		const bgColor = drawPredicates?.backgroundColor;
		const fillColor1: string = bgColor !== undefined ? bgColor : nextLineColor;
		const fillColor2: string = bgColor !== undefined ? bgColor : lineColor;

		this.fillCloud(ctx, fillColor1, curSeriesPoints, nextSeriesPoints, hitTestDrawerConfig, drawPredicates);
		this.fillCloud(ctx, fillColor2, nextSeriesPoints, curSeriesPoints, hitTestDrawerConfig, drawPredicates);
	}

	protected fillCloud(
		ctx: CanvasRenderingContext2D,
		color: string,
		linePoints: Point[],
		nextLinePoints: Point[],
		hitTestDrawerConfig: HTSeriesDrawerConfig,
		drawPredicates?: DifferenceCloudDrawPredicates,
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

		const hasBgColor = drawPredicates?.backgroundColor !== undefined;

		if (hitTestDrawerConfig.color) {
			ctx.fillStyle = hitTestDrawerConfig.color;
			// If the background color exists, use the color as-is
		} else if (hasBgColor) {
			ctx.fillStyle = color ?? DEFAULT_LINE_COLOR;
		} else {
			ctx.fillStyle = toRGBA(color ?? DEFAULT_LINE_COLOR, 0.3);
		}

		ctx.fill();
		ctx.restore();
	}

	protected mapDataSeriesDiffPointsIntoPoints(points: VisualSeriesPoint[], view: Viewable): Point[] {
		return points.map(p => {
			const { centerUnit, close } = p;
			const x = view.toX(centerUnit);
			const y = view.toY(close);
			return { x, y };
		});
	}
}

export const isDifferenceTool = (type: string) => type === 'DIFFERENCE';
