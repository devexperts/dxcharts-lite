/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Remote } from 'comlink';
import {
	CanvasOffscreenContext2D,
	isOffscreenCanvasModel,
	strsToSync,
} from '../canvas/offscreen/canvas-offscreen-wrapper';
import { initOffscreenWorker, isOffscreenWorkerAvailable } from '../canvas/offscreen/init-offscreen';
import { OffscreenWorker } from '../canvas/offscreen/offscreen-worker';
import EventBus from '../events/event-bus';
import { EVENT_DRAW } from '../events/events';
import { ChartResizeHandler } from '../inputhandlers/chart-resize.handler';
import { CanvasModel, MIN_SUPPORTED_CANVAS_SIZE } from '../model/canvas.model';
import { arrayIntersect, reorderArray } from '../utils/array.utils';
import { StringTMap } from '../utils/object.utils';
import { animationFrameThrottled } from '../utils/performance/request-animation-frame-throttle.utils';
import { uuid } from '../utils/uuid.utils';
import { FullChartConfig } from '../chart.config';

export const HIT_TEST_PREFIX = 'HIT_TEST_';

const drawerTypes = [
	'MAIN_BACKGROUND',
	'MAIN_CLEAR',
	'HIT_TEST_CLEAR',
	'YAXIS_CLEAR',
	'SERIES_CLEAR',
	'OVER_SERIES_CLEAR',
	'HIT_TEST_DRAWINGS',
	'GRID',
	'UNDERLAY_VOLUMES_AREA',
	'X_AXIS',
	'Y_AXIS',
	'HIGH_LOW',
	'DYNAMIC_OBJECTS',
	'N_MAP_CHART',
	'PL_CHART',
	'WATERMARK',
	'EMPTY_CHART',
	'OFFLINE_CHART',
	'LABELS',
	'EVENTS',
	'HIT_TEST_EVENTS',
	'ZERO_LINE',
	'PL_ZERO_LINE_BACKGROUND',
	'CROSS_TOOL',
] as const;
export type DrawerType = typeof drawerTypes[number];

/**
 * Manages the drawing process.
 * Can re-order drawers to make one be on top of the other.
 */
export class DrawingManager {
	private drawingOrder: Array<string> = [];
	private drawersMap: StringTMap<Drawer> = {};

	private readonly drawHitTestCanvas: () => void;
	private canvasIdsList: Record<string, boolean> = {};
	private animFrameId = `draw_${uuid()}`;
	private readyDraw = false;
	private offscreenWorker?: Remote<OffscreenWorker>;
	private offscreenCanvases: CanvasModel<CanvasOffscreenContext2D>[] = [];

	constructor(
		private config: FullChartConfig,
		eventBus: EventBus,
		private chartResizeHandler: ChartResizeHandler,
		canvases: CanvasModel[],
	) {
		for (const canvas of canvases) {
			this.canvasIdsList[canvas.canvasId] = true;
		}
		if (config.experimental.offscreen.enabled && isOffscreenWorkerAvailable) {
			initOffscreenWorker(canvases, config.experimental.offscreen.fonts).then(worker => {
				this.offscreenCanvases = canvases.filter(isOffscreenCanvasModel);
				this.offscreenWorker = worker;
				this.readyDraw = true;
				eventBus.fireDraw();
			});
		} else {
			this.readyDraw = true;
			eventBus.fireDraw();
		}
		// eventBus.on(EVENT_DRAW_LAST_CANDLE, () => animationFrameThrottled(this.animFrameId + 'last', () => this.drawLastBar()));
		this.drawHitTestCanvas = () => {
			this.drawingOrder.forEach(drawer => {
				if (drawer.indexOf(HIT_TEST_PREFIX) !== -1) {
					this.drawersMap[drawer].draw();
				}
			});
		};
		eventBus.on(EVENT_DRAW, (canvasIds: Array<string>) => {
			if (chartResizeHandler.wasResized()) {
				// if we fire bus.fireDraw() without arguments(undefined) we need to redraw all canvases
				if (!canvasIds) {
					for (const canvasId of Object.keys(this.canvasIdsList)) {
						this.canvasIdsList[canvasId] = true;
					}
				} else {
					for (const canvasId of canvasIds) {
						this.canvasIdsList[canvasId] = true;
					}
				}
				animationFrameThrottled(this.animFrameId, async() => {
					if (!this.isDrawable()) {
						// previous rendering cycle is not finished yet, schedule another draw
						eventBus.fireDraw([]);
						return;
					}
					const canvasIds = Object.entries(this.canvasIdsList).filter(([, v]) => v).map(([k]) => k);
					this.forceDraw();
					this.drawHitTestCanvas();
					for (const canvasId of canvasIds) {
						this.canvasIdsList[canvasId] = false;
					}
					// we use mutex in order to avoid situation when canvas resize happened during offscreen rendering
					await this.chartResizeHandler.mutex.calculateSafe(() => this.drawOffscreen());
					this.readyDraw = true;
				});
			}
		});
	}

	private async drawOffscreen() {
		if (this.offscreenWorker === undefined) {
			return;
		}
		// commit method exists only in offscreen context class and adds END_OF_FILE marker to the buffer
		// so worker knows where is the end of commands
		this.offscreenCanvases.forEach(canvas => canvas.ctx.commit());
		if (strsToSync.length) {
			await this.offscreenWorker.syncStrings(strsToSync);
			strsToSync.length = 0;
		}
		await this.offscreenWorker.executeCanvasCommands(this.offscreenCanvases.map(canvas => canvas.idx));
	}

	/**
	 * Updates canvases' sizes and executes redraw without animation frame.
	 * This is required for multi-chart canvas update synchronization.
	 * If all canvases update in separate animation frames - we see visual lag. Instead we should do all updates and then redraw.
	 * @doc-tags tricky,canvas,resize
	 */
	public async redrawCanvasesImmediate() {
		// not safe and meaningless to use in offscreen mode
		// I'm not sure if it's even possible because of async nature of offscreen
		// of course we can implement some kind of spinlock, but it's insane
		if (this.config.experimental.offscreen.enabled) {
			return;
		}
		this.chartResizeHandler.fireUpdates();
		this.forceDraw();
		this.readyDraw = true;
	}

	drawLastBar() {
		this.drawingOrder.forEach(drawerName => {
			if (drawerName.indexOf(HIT_TEST_PREFIX) === -1) {
				const drawer = this.drawersMap[drawerName];
				drawer.drawLastBar && drawer.drawLastBar();
			}
		});
	}

	forceDraw(canvasIds?: Array<string>) {
		if (!this.isDrawable()) {
			return;
		}
		this.readyDraw = false;
		this.drawingOrder.forEach(drawerName => {
			if (drawerName.indexOf(HIT_TEST_PREFIX) === -1) {
				const drawer = this.drawersMap[drawerName];
				// draw if not canvas specified
				if (!canvasIds || canvasIds.length === 0) {
					drawer.draw();
					return;
				}
				// draw if at least 1 canvas is touched (intersection)
				if (arrayIntersect(canvasIds, drawer.getCanvasIds()).length) {
					drawer.draw();
				}
			}
		});
	}

	/**
	 * Indicates whether it is possible to draw chart or not.
	 * @returns {boolean} true if chart is drawable
	 */
	public isDrawable(): boolean {
		return (
			this.readyDraw &&
			(this.chartResizeHandler.previousBCR?.height ?? 0) > MIN_SUPPORTED_CANVAS_SIZE.width &&
			(this.chartResizeHandler.previousBCR?.width ?? 0) > MIN_SUPPORTED_CANVAS_SIZE.height
		);
	}

	drawHitTestOnly() {
		this.drawHitTestCanvas();
	}

	addDrawer(drawer: Drawer, name: string = uuid()) {
		this.drawingOrder.indexOf(name) === -1 && this.drawingOrder.push(name);
		this.drawersMap[name] = drawer;
	}

	addDrawerAfter(drawer: Drawer, newDrawerName: string, drawerToPutAfterName: string) {
		this.addDrawer(drawer, newDrawerName);
		const newDrawerIdx = this.drawingOrder.indexOf(newDrawerName);
		this.drawingOrder.splice(newDrawerIdx, 1);
		const idx = this.drawingOrder.indexOf(drawerToPutAfterName);
		this.drawingOrder.splice(idx + 1, 0, newDrawerName);
		this.reorderDrawers(this.drawingOrder);
	}

	addDrawerBefore(drawer: Drawer, newDrawerName: string, drawerToPutBeforeName: string): boolean {
		this.addDrawer(drawer, newDrawerName);
		const idx = this.drawingOrder.indexOf(drawerToPutBeforeName);
		if (idx !== -1) {
			const newDrawerIdx = this.drawingOrder.indexOf(newDrawerName);
			this.drawingOrder.splice(newDrawerIdx, 1);
			this.drawingOrder.splice(idx, 0, newDrawerName);
			this.reorderDrawers(this.drawingOrder);
			return true;
		}
		return false;
	}

	getDrawerByName(name: string): Drawer {
		return this.drawersMap[name];
	}

	getNameByDrawer(drawer: Drawer): string | undefined {
		for (const drawerName in this.drawersMap) {
			if (this.drawersMap[drawerName] === drawer) {
				return drawerName;
			}
		}
	}

	removeDrawerByName(name: string) {
		const drawer = this.drawersMap[name];
		this.removeDrawer(drawer);
	}

	removeDrawer(drawer: Drawer) {
		Object.keys(this.drawersMap).forEach(name => {
			if (this.drawersMap[name] === drawer) {
				delete this.drawersMap[name];
				const drawerIdx = this.drawingOrder.indexOf(name);
				drawerIdx !== -1 && this.drawingOrder.splice(drawerIdx, 1);
			}
		});
	}

	public reorderDrawers(newOrder: string[]) {
		this.drawingOrder = reorderArray(this.drawingOrder, newOrder);
	}
}

export interface Drawer {
	draw(): void; // model could be outside of chart-core, for example, DrawingsModel
	/**
	 * Used for optimization when we have to update only the last candle
	 * Doesn't work for line chart types
	 * TODO rework, method should not be a part of abstract drawer, maybe Candle drawer or something like this
	 * @doc-tags tricky
	 */
	drawLastBar?: () => void;
	getCanvasIds(): Array<string>;
}

// use this to create dynamic names
export class DynamicDrawerType {
	static paneResizer(id: string) {
		return `PANE_RESIZER_${id}`;
	}
}
