/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { CanvasModel } from '../../model/canvas.model';
import { DataSeriesModel, DataSeriesPoint, VisualSeriesPoint } from '../../model/data-series.model';
import { HIT_TEST_ID_RANGE, HitTestSubscriber } from '../../model/hit-test-canvas.model';
import { flatMap } from '../../utils/array.utils';
import { PaneComponent } from './pane.component';

export class PaneHitTestController implements HitTestSubscriber<DataSeriesModel> {
	// used in hit test for creating series
	private dataSeriesIdCounter: number = HIT_TEST_ID_RANGE.DATA_SERIES[0];
	constructor(private readonly paneComponents: Record<string, PaneComponent>, private canvasModel: CanvasModel) {}
	public getNewDataSeriesHitTestId = (): number => {
		return this.dataSeriesIdCounter++;
	};

	/**
	 * Returns an array with two numbers representing the range of IDs for data series.
	 * @returns {Array<number>} An array with two numbers representing the range of IDs for data series.
	 */
	public getIdRange(): [number, number] {
		return HIT_TEST_ID_RANGE.DATA_SERIES;
	}
	get allDataSeries(): DataSeriesModel[] {
		return flatMap(
			flatMap(Object.values(this.paneComponents), c => c.yExtentComponents),
			p => Array.from(p.dataSeries),
		);
	}

	/**
	 * Looks up a data series by its ID.
	 *
	 * @param {number} id - The ID of the data series to look up.
	 * @returns {DataSeriesModel | undefined} - The data series with the given ID, or undefined if it does not exist.
	 */
	public lookup(id: number): DataSeriesModel | undefined {
		const result = this.allDataSeries.find(d => d.id === id);
		return result;
	}

	/**
	 * Changes the hovered property of all data series to true if their id matches the id of the provided model.
	 * @param {DataSeriesModel | null} model - The model to compare the id with.
	 * @returns {void}
	 */
	onHover(model: DataSeriesModel | null): void {
		this.allDataSeries.forEach(d => (d.hovered = d.id === model?.id));
		this.canvasModel.fireDraw();
	}

	onMouseDown(model: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint>): void {
		model && this.handleYExtentDragStart(model);
	}

	onMouseUp(): void {
		this.handleYExtentDragEnd();
	}

	handleYExtentDragStart(model: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint>) {
		Object.values(this.paneComponents).forEach(p => p.yExtentComponents.forEach(y => y.dragNDrop.deactivate()));
		model.extentComponent.dragNDrop.activate();
	}

	handleYExtentDragEnd() {
		Object.values(this.paneComponents).forEach(p => p.yExtentComponents.forEach(y => y.dragNDrop.activate()));
	}
}
