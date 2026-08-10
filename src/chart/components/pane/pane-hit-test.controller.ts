/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { isCandleSeriesModel } from '../../model/candle-series.model';
import { CanvasModel } from '../../model/canvas.model';
import { DataSeriesModel, DataSeriesPoint, VisualSeriesPoint } from '../../model/data-series.model';
import { HIT_TEST_ID_RANGE, HitTestSubscriber } from '../../model/hit-test-canvas.model';
import { flatMap } from '../../utils/array.utils';
import { PaneComponent } from './pane.component';
import { BehaviorSubject, Observable } from 'rxjs';

export class PaneHitTestController implements HitTestSubscriber<DataSeriesModel> {
	// used in hit test for creating series
	private dataSeriesIdCounter: number = HIT_TEST_ID_RANGE.DATA_SERIES[0];
	private selectedDataSeries: DataSeriesModel | null = null;
	private selectedDataSeriesIdSubject = new BehaviorSubject<string | null>(null);

	constructor(
		private readonly panes: Record<string, PaneComponent>,
		private canvasModel: CanvasModel,
	) {}
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
			flatMap(Object.values(this.panes), c => c.yExtentComponents),
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
		const result = this.allDataSeries.find(d => d.htId === id);
		return result;
	}

	/**
	 * Sets the selected data series.
	 * @param {DataSeriesModel | null} model - The model of the data series to highlight
	 * @returns {void}
	 */
	public selectDataSeries(model: DataSeriesModel | null): void {
		this.selectedDataSeries = model;
		this.selectedDataSeriesIdSubject.next(model ? `${model.parentId ?? model.id}` : null);
		if (!isCandleSeriesModel(model)) {
			this.allDataSeries.forEach(d => (d.selected = d.htId === this.selectedDataSeries?.htId));
		}
	}

	/**
	 * Observes selected data series ID changes.
	 * @returns {Observable<string | null>} Observable that emits selected data series ID or null.
	 */
	public observeSelectedDataSeriesChanged(): Observable<string | null> {
		return this.selectedDataSeriesIdSubject.asObservable();
	}

	onHover(model: DataSeriesModel | null): void {
		this.allDataSeries.forEach(d => (d.hovered = d.htId === model?.htId));
		this.canvasModel.fireDraw();
	}

	onMouseDown(model: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint>): void {
		this.selectDataSeries(model);
		model && this.handleYExtentDragStart(model);
	}

	onMouseUp(): void {
		this.handleYExtentDragEnd();
	}

	handleYExtentDragStart(model: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint>) {
		Object.values(this.panes).forEach(p => p.yExtentComponents.forEach(y => y.dragNDrop.deactivate()));
		model.extentComponent.dragNDrop.activate();
	}

	handleYExtentDragEnd() {
		Object.values(this.panes).forEach(p => p.yExtentComponents.forEach(y => y.dragNDrop.activate()));
	}
}
