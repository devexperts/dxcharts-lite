/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BarType, FullChartConfig } from '../chart.config';
import EventBus from '../events/event-bus';
import { PickedDOMRect } from '../inputhandlers/chart-resize.handler';
import { DrawingManager } from '../drawers/drawing-manager';

/**
 * The minimum supported canvas size in chart-core (in pixels).
 * Any size of <canvas> element below these dimensions will not be rendered (is NOT INTENDED to be rendered).
 * @doc-tags chart-core,canvas
 */
export const MIN_SUPPORTED_CANVAS_SIZE = {
	width: 20,
	height: 20,
};

export class CanvasModel {
	private readonly context: CanvasRenderingContext2D;
	public parent: HTMLElement;
	public width: number = 0;
	public height: number = 0;
	public prevHeight: number = 0;
	public prevWidth: number = 0;
	private readonly _canvasId: string;
	type: CanvasBarType = CANDLE_TYPE;
	constructor(
		private eventBus: EventBus,
		public canvas: HTMLCanvasElement,
		public drawingManager: DrawingManager,
		canvasModels: CanvasModel[],
		private resizer?: HTMLElement,
		options: CanvasRenderingContext2DSettings = {},
	) {
		canvasModels.push(this);
		this.parent = findHeightParent(canvas);
		const ctx = canvas.getContext('2d', options);
		if (ctx === null) {
			throw new Error("Couldn't get 2d context????");
		}
		this.context = ctx;
		this._canvasId = canvas.getAttribute('data-element') ?? '';
		this.updateCanvasWidthHeight(canvas, this.getChartResizerElement().getBoundingClientRect());
	}
	/**
	 * About rendering for non-integer dpi
	 * https://stackoverflow.com/questions/17553557/draw-crisp-lines-on-html5-canvas-with-browser-zoom
	 * @param bcr
	 */
	updateDPR(bcr: PickedDOMRect | ClientRect) {
		const { width, height } = bcr;
		const dpi = window.devicePixelRatio;
		this.canvas.style.height = height + 'px';
		this.canvas.style.width = width + 'px';
		this.canvas.width = width * dpi;
		this.canvas.height = height * dpi;
		this.width = width;
		this.height = height;
		this.ctx.scale(dpi, dpi);
	}

	get canvasId(): string {
		return this._canvasId;
	}

	get ctx(): CanvasRenderingContext2D {
		return this.context;
	}

	/**
	 * Clears the canvas by using the clearRect method of the canvas context.
	 * @function
	 * @name clear
	 * @memberof Canvas
	 * @returns {void}
	 */
	clear(): void {
		this.context.clearRect(0, 0, this.width, this.height);
	}

	/**
	 * Checks if the type is linked.
	 *
	 * @returns {boolean} Returns true if the type is linked, false otherwise.
	 */
	isLinked(): boolean {
		return this.type?.linked ?? false;
	}

	/**
	 * Triggers the 'fireDraw' event on the event bus with the canvas ID as the parameter.
	 */
	public fireDraw() {
		this.eventBus.fireDraw([this.canvasId]);
	}

	/**
	 * Updates the width and height of the canvas element based on the client width and height of the canvas element and the height of the chart resizer element.
	 * @param {HTMLCanvasElement} canvas - The canvas element to update.
	 * @param {ClientRect | DOMRect} [bcr=this.getChartResizerElement().getBoundingClientRect()] - The bounding client rectangle of the chart resizer element.
	 * @returns {void}
	 */
	private updateCanvasWidthHeight(
		canvas: HTMLCanvasElement,
		bcr: ClientRect | DOMRect = this.getChartResizerElement().getBoundingClientRect(),
	): void {
		if (canvas.clientWidth !== this.width) {
			canvas.width = canvas.clientWidth;
			this.width = canvas.clientWidth;
		}
		const height = bcr.height;
		if (height !== this.height) {
			canvas.style.height = height + 'px';
			this.height = height;
			canvas.height = height;
			this.prevHeight = height;
		}
	}

	/**
	 * Returns the chart resizer element. If the resizer is not defined, it returns the parent element.
	 *
	 * @returns {HTMLElement} The chart resizer element.
	 */
	getChartResizerElement() {
		return this.resizer ?? this.parent;
	}

	/**
	 * Checks if the canvas is ready to be used by verifying if its width and height are greater than the minimum supported canvas size.
	 *
	 * @returns {boolean} - Returns true if the canvas is ready to be used, false otherwise.
	 */
	isReady() {
		return this.width > MIN_SUPPORTED_CANVAS_SIZE.width && this.height > MIN_SUPPORTED_CANVAS_SIZE.height;
	}
}

export interface CanvasBarType {
	name: string;
	linked?: boolean;
}

const CANDLE_TYPE: CanvasBarType = {
	name: 'candle',
};
const BAR_TYPE: CanvasBarType = {
	name: 'candle',
};
const LINE_TYPE: CanvasBarType = {
	name: 'line',
	linked: true,
};
const AREA_TYPE: CanvasBarType = {
	name: 'area',
	linked: true,
};

const TYPES: Partial<Record<BarType, CanvasBarType>> = {
	candle: CANDLE_TYPE,
	bar: BAR_TYPE,
	line: LINE_TYPE,
	area: AREA_TYPE,
};

/**
 * Creates a new canvas model for the main chart canvas.
 *
 * @param {EventBus} eventBus - The event bus used to communicate between components.
 * @param {HTMLCanvasElement} canvas - The canvas element to create the model for.
 * @param {HTMLElement} resizer - The element used to resize the canvas.
 * @param {BarType} barType - The type of bar to use for the chart.
 * @param {FullChartConfig} config - The configuration object for the chart.
 * @param {DrawingManager} drawingManager - The drawing manager used to draw on the canvas.
 * @param {CanvasModel[]} canvasModels - An array of canvas models to add the new model to.
 *
 * @returns {CanvasModel} The newly created canvas model.
 
export function createMainCanvasModel(
    eventBus,
    canvas,
    resizer,
    barType,
    config,
    drawingManager,
    canvasModels,
) {
    const canvasModel = createCanvasModel(eventBus, canvas, config, drawingManager, canvasModels, resizer);
    // @ts-ignore
    canvasModel.type = TYPES[barType] ?? CANDLE_TYPE;
    return canvasModel;
}*/
export function createMainCanvasModel(
	eventBus: EventBus,
	canvas: HTMLCanvasElement,
	resizer: HTMLElement,
	barType: BarType,
	config: FullChartConfig,
	drawingManager: DrawingManager,
	canvasModels: CanvasModel[],
): CanvasModel {
	const canvasModel = createCanvasModel(eventBus, canvas, config, drawingManager, canvasModels, resizer);
	// @ts-ignore
	canvasModel.type = TYPES[barType] ?? CANDLE_TYPE;
	return canvasModel;
}

/**
 * Creates a new CanvasModel instance.
 *
 * @param {EventBus} eventBus - The event bus to use.
 * @param {HTMLCanvasElement} canvas - The canvas element to use.
 * @param {FullChartConfig} config - The configuration object for the chart.
 * @param {DrawingManager} drawingManager - The drawing manager to use.
 * @param {CanvasModel[]} canvasModels - An array of existing canvas models.
 * @param {HTMLElement} [resizer] - The element to use for resizing the canvas.
 *
 * @returns {CanvasModel} A new instance of the CanvasModel class.
 */
export function createCanvasModel(
	eventBus: EventBus,
	canvas: HTMLCanvasElement,
	config: FullChartConfig,
	drawingManager: DrawingManager,
	canvasModels: CanvasModel[],
	resizer?: HTMLElement,
	options?: CanvasRenderingContext2DSettings,
): CanvasModel {
	const canvasModel = new CanvasModel(eventBus, canvas, drawingManager, canvasModels, resizer, options);
	initCanvasWithConfig(canvasModel, config);
	return canvasModel;
}

/**
 * Initializes a canvas with a given configuration.
 * @param {CanvasModel} canvasModel - The canvas model to be initialized.
 * @param {FullChartConfig} config - The configuration object for the canvas.
 * @returns {void}
 
*/
export function initCanvasWithConfig(canvasModel: CanvasModel, config: FullChartConfig) {
	const canvas = canvasModel.canvas;
	if (config.fixedSize) {
		canvas.width = config.fixedSize.width;
		canvas.height = config.fixedSize.height;
		canvas.style.width = config.fixedSize.width + 'px';
		canvas.style.height = config.fixedSize.height + 'px';
		canvasModel.width = config.fixedSize.width;
		canvasModel.height = config.fixedSize.height;
	}
	canvas.style.position = 'absolute';
	canvas.style.top = '0';
	canvas.style.left = '0';
	canvas.style.direction = 'ltr';
}

/**
 * Gets the first parent with "data-chart-container" attribute to compute height
 */
function findHeightParent(initial: HTMLElement): HTMLElement {
	let el = initial;
	while (el) {
		if (el.nodeType === 1 && el.hasAttribute('data-chart-container')) {
			return el;
		} else {
			if (el.parentElement !== null) {
				el = el.parentElement;
			} else {
				break;
			}
		}
	}
	return el;
}
