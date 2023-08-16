/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged, throttleTime } from 'rxjs/operators';
import { CursorType } from '../chart.config';
import { CanvasInputListenerComponent } from '../inputlisteners/canvas-input-listener.component';
import { Bounds } from '../model/bounds.model';
import { ChartBaseElement } from '../model/chart-base-element';
import { HitTestCanvasModel } from '../model/hit-test-canvas.model';
import { CanvasBoundsContainer, HitBoundsTest } from './canvas-bounds-container';

interface HitTestCursor {
	cursor: CursorType;
	hitTest: HitBoundsTest;
}

/**
 * This class is responsible for changing cursor for different entities which are drawn on the canvas.
 * @doc-tags chart-core,cursor
 */
export class CursorHandler extends ChartBaseElement {
	private normalLayer: Map<string, HitTestCursor> = new Map<string, HitTestCursor>();
	private extensionLayer: Map<string, HitTestCursor> = new Map<string, HitTestCursor>();
	public cursorChangedSubject = new Subject<CursorType>();

	constructor(
		private element: HTMLElement,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private hitTestCanvasModel: HitTestCanvasModel,
	) {
		super();
	}

	/**
	 * This method is called when the user activates the canvas. It subscribes to the mouse move event and checks if the mouse pointer is over any of the elements in the normalLayer or extensionLayer. If the mouse pointer is over any of the elements, it updates the cursor to the corresponding cursor of the element.
	 */
	protected doActivate() {
		super.doActivate();
		this.canvasInputListener
			.observeMouseMoveNoDrag()
			.pipe(throttleTime(100, undefined, { trailing: true }))
			.subscribe(point => {
				const cursorFromHT = this.hitTestCanvasModel.resolveCursor(point);
				if (cursorFromHT !== undefined) {
					this.updateCursor(cursorFromHT);
					return;
				}
				if (point) {
					this.normalLayer.forEach(val => {
						if (val.hitTest(point.x, point.y)) {
							this.updateCursor(val.cursor);
						}
					});
					this.extensionLayer.forEach(val => {
						if (val.hitTest(point.x, point.y)) {
							this.updateCursor(val.cursor);
						}
					});
				}
			});
	}
	/***
	 * @param elId
	 * @param bounds
	 * @param cursorType
	 * @param extension is an extra area beyond the borders of the bounds
	 */
	public setCursorForBounds(elId: string, bounds: Bounds, cursorType: CursorType, extension: number = 0): void {
		const hitTest = CanvasBoundsContainer.hitTestOf(bounds, { extensionY: extension });
		if (extension) {
			// extension layer has a higher priority, so if its hitTest intersects with other hitTests
			// the cursor will be of type specified in extension layer
			this.extensionLayer.set(elId, { cursor: cursorType, hitTest });
		} else {
			this.normalLayer.set(elId, { cursor: cursorType, hitTest });
		}
	}

	/**
	 * Sets a cursor for a canvas element
	 * @param {string} canvasEl - The canvas element to add the cursor to
	 * @param {CursorType} cursor - The type of cursor to add
	 * @param {number} [extensionRadius] - The extension radius of the cursor
	 */
	public setCursorForCanvasEl(canvasEl: string, cursor: CursorType, extensionRadius?: number) {
		this.observeCursorType(canvasEl, cursor, extensionRadius);
	}

	/**
	 * Removes the cursor for a given canvas element.
	 *
	 * @param {string} canvasEl - The canvas element to remove the cursor from.
	 * @returns {void}
	 */
	public removeCursorForCanvasEl(canvasEl: string) {
		this.normalLayer.delete(canvasEl);
		this.extensionLayer.delete(canvasEl);
	}

	/**
	 * Returns an Observable that emits the latest CursorType value whenever the cursorChangedSubject emits a new value.
	 * The emitted value is guaranteed to be distinct from the previous one.
	 * @returns {Observable<CursorType>} An Observable that emits the latest CursorType value.
	 */
	public observeCursorChanged(): Observable<CursorType> {
		return this.cursorChangedSubject.pipe(distinctUntilChanged());
	}

	/**
	 * Sets the cursor type for a given canvas element and optionally extends the hit test area.
	 * @param {string} canvasElement - The ID of the canvas element to observe.
	 * @param {CursorType} cursorType - The type of cursor to set.
	 * @param {number} [extensionY] - Optional extension of the hit test area in the Y axis.
	 * @returns {void}
	 */
	private observeCursorType(canvasElement: string, cursorType: CursorType, extensionY?: number): void {
		const hitTest = extensionY
			? this.canvasBoundsContainer.getBoundsHitTest(canvasElement, { extensionY })
			: this.canvasBoundsContainer.getBoundsHitTest(canvasElement);
		if (extensionY) {
			this.extensionLayer.set(canvasElement, { cursor: cursorType, hitTest });
		} else {
			this.normalLayer.set(canvasElement, { cursor: cursorType, hitTest });
		}
	}

	/**
	 * Updates the cursor type of an element based on the mouse enter or leave event.
	 * @param {CursorType} cursorType - The type of cursor to be set on the element.
	 * @returns {void}
	 */
	public updateCursor(cursorType: CursorType) {
		if (this.element.style.cursor === cursorType) {
			return;
		}
		this.element.style.cursor = cursorType;
		this.cursorChangedSubject.next(cursorType);
	}
}
