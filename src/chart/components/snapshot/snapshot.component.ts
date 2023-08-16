/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasModel } from '../../model/canvas.model';
import { ValidatedChartElements } from '../../canvas/chart-elements';

/**
 * Snapshot Component.
 * Allows to copy, download and share snapshot
 */
export class SnapshotComponent extends ChartBaseElement {
	constructor(private elements: ValidatedChartElements, private canvasModel: CanvasModel) {
		super();
	}

	/**
	 * Implements doActivate method.
	 * @protected
	 * @returns {void}
	 */
	protected doActivate(): void {
		super.doActivate();
	}

	/**
	 * Creates a snapshot of the canvas and returns it as a Promise of Blob object.
	 * @param {function} userDrawCallback - Optional callback function that takes a CanvasRenderingContext2D object
	 * as a parameter and allows the user to draw on the canvas before taking the snapshot.
	 * @returns {Promise<Blob>} - A Promise that resolves with a Blob object representing the snapshot of the canvas.
	 * @throws {Error} - If the snapshot isn't supported, an error is thrown.
	 */
	public createSnapshot(userDrawCallback?: (ctx: CanvasRenderingContext2D) => void): Promise<Blob> {
		const snapshotCanvas = this.canvasModel.canvas;
		const ctx = this.canvasModel.ctx;
		if (ctx) {
			ctx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
			const width = snapshotCanvas.width / window.devicePixelRatio;
			const height = snapshotCanvas.height / window.devicePixelRatio;
			ctx.drawImage(this.elements.backgroundCanvas, 0, 0, width, height);
			ctx.drawImage(this.elements.mainCanvas, 0, 0, width, height);
			ctx.drawImage(this.elements.staticDrawingCanvas, 0, 0, width, height);
			ctx.drawImage(this.elements.dataSeriesCanvas, 0, 0, width, height);
			ctx.drawImage(this.elements.overDataSeriesCanvas, 0, 0, width, height);
			ctx.drawImage(this.elements.dynamicDrawingCanvas, 0, 0, width, height);
			ctx.drawImage(this.elements.crossToolCanvas, 0, 0, width, height);
			userDrawCallback && userDrawCallback(ctx);
			return new Promise<Blob>((resolve, fail) =>
				this.elements.snapshotCanvas.toBlob(blob => {
					return blob ? resolve(blob) : fail('Blob is null');
				}),
			);
		} else {
			console.error("Snapshot isn't supported");
			return Promise.reject();
		}
	}
}
