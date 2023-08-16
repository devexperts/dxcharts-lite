/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { merge, Observable, Subject, Subscription } from 'rxjs';
import { map, throttleTime } from 'rxjs/operators';
import { CanvasBoundsContainer, CanvasElement } from '../canvas/canvas-bounds-container';
import { CursorType, FullChartConfig } from '../chart.config';
import { CanvasModel, initCanvasWithConfig } from './canvas.model';
import { DrawingManager } from '../drawers/drawing-manager';
import EventBus from '../events/event-bus';
import { CanvasInputListenerComponent, Point } from '../inputlisteners/canvas-input-listener.component';
import { animationFrameId } from '../utils/perfomance/request-animation-frame-throttle.utils';

const bigPrimeNumber = 317;

export type HitTestEvents = 'mousedown' | 'hover' | 'touchstart' | 'dblclick' | 'contextmenu' | 'zoom' | 'mouseup';

type HitTestType = 'DRAWINGS' | 'DATA_SERIES' | 'EVENTS' | 'NEWS';

export const HIT_TEST_ID_RANGE: Record<HitTestType, [number, number]> = {
	DRAWINGS: [0, 199],
	NEWS: [200, 299],
	DATA_SERIES: [300, 2999],
	EVENTS: [3000, 4000],
};

/** HitTestCanvasModel
 * Canvas layer for testing mouse events over the models such as Charts, Drawings, Volumes and etc.
 * !!! always add new drawers to hit-test drawingManager BEFORE the DrawerType.HIT_TEST_DRAWINGS to save the hierarchy
 *
 * @doc-tags chart-core,hit-test
 */
export class HitTestCanvasModel extends CanvasModel {
	private hitTestSubscribers: HitTestSubscriber[] = [];
	private eventsSubscriptions: Subscription[] = [];
	private hoverSubject: Subject<HitTestEvent> = new Subject();
	private touchStartSubject: Subject<HitTestEvent> = new Subject();
	private dblClickSubject: Subject<HitTestEvent> = new Subject();
	private rightClickSubject: Subject<HitTestEvent> = new Subject();

	constructor(
		eventBus: EventBus,
		canvas: HTMLCanvasElement,
		private canvasInputListener: CanvasInputListenerComponent,
		private canvasBoundsContainer: CanvasBoundsContainer,
		drawingManager: DrawingManager,
		chartConfig: FullChartConfig,
		canvasModels: CanvasModel[],
		resizer?: HTMLElement,
	) {
		super(eventBus, canvas, drawingManager, canvasModels, resizer, {
			willReadFrequently: true,
			desynchronized: true,
		});
		initCanvasWithConfig(this, chartConfig);
		canvas.style.visibility = 'hidden';
		this.enableUserControls();
	}

	/**
	 * Enables HitTestCanvasModel events listeners.
	 */
	public enableUserControls(): void {
		if (this.eventsSubscriptions.length === 0) {
			const bounds = this.canvasBoundsContainer.getBoundsHitTest(CanvasElement.ALL_PANES);

			const hoverSub = this.canvasInputListener
				.observeMouseMove()
				.pipe(throttleTime(100, undefined, { trailing: true }))
				.subscribe(point => this.eventHandler(point, 'hover'));

			const touchStartSub = this.canvasInputListener
				.observeTouchStart()
				.pipe(map(() => this.canvasInputListener.currentPoint))
				.subscribe(point => this.eventHandler(point, 'touchstart'));

			const clickSub = merge(
				this.canvasInputListener.observeMouseDown(bounds),
				// should probably be deleted, touch event is a separate event and sometimes it doesn't work while being a part of click event
				this.canvasInputListener.observeTouchStart().pipe(map(() => this.canvasInputListener.currentPoint)),
			).subscribe(point => this.eventHandler(point, 'mousedown'));

			const mouseUpSub = merge(
				this.canvasInputListener.observeMouseUp(bounds),
				// should probably be deleted, touch event is a separate event and sometimes it doesn't work while being a part of click event
				this.canvasInputListener
					.observeTouchEndDocument()
					.pipe(map(() => this.canvasInputListener.currentPoint)),
			).subscribe(point => this.eventHandler(point, 'mouseup'));

			const dblClickSub = this.canvasInputListener
				.observeDbClick(bounds)
				.subscribe(point => this.eventHandler(point, 'dblclick'));

			const rightClickSub = this.canvasInputListener
				.observeContextMenu(bounds)
				.pipe(map(() => ({ ...this.canvasInputListener.currentPoint })))
				.subscribe(point => {
					this.eventHandler(point, 'contextmenu');
				});

			const zoomSub = this.canvasInputListener
				.observeWheel(bounds)
				.subscribe(point => setTimeout(() => this.eventHandler(point, 'zoom'), 0));

			this.eventsSubscriptions.push(
				hoverSub,
				clickSub,
				dblClickSub,
				rightClickSub,
				zoomSub,
				touchStartSub,
				mouseUpSub,
			);
		}
	}

	/**
	 * Disables HitTestCanvasModel events listeners.
	 */
	public disableUserControls(): void {
		this.eventsSubscriptions.forEach(sub => sub.unsubscribe());
		this.eventsSubscriptions = [];
	}

	/**
	 * Adds a new subscriber to the list of hit test subscribers.
	 * @param {HitTestSubscriber<unknown>} subscriber - The subscriber to be added.
	 * @returns {void}
	 */
	public addSubscriber(subscriber: HitTestSubscriber<unknown>): void {
		this.hitTestSubscribers.push(subscriber);
	}

	/**
	 * Removes a subscriber from the list of hit test subscribers.
	 *
	 * @param {HitTestSubscriber<unknown>} subscriber - The subscriber to be removed.
	 * @returns {void}
	 */
	public removeSubscriber(subscriber: HitTestSubscriber<unknown>): void {
		this.hitTestSubscribers = this.hitTestSubscribers.filter(sub => sub === subscriber);
	}

	/**
	 * Converts a number to a hexadecimal color code.
	 * @param {number} id - The number to be converted.
	 * @returns {string} - The hexadecimal color code.
	 */
	public idToColor(id: number): string {
		const hex = (id * bigPrimeNumber).toString(16);
		return '#000000'.substr(0, 7 - hex.length) + hex;
	}

	/**
	 * This function takes a number representing a color and returns the corresponding ID by dividing it by a big prime number.
	 *
	 * @param {number} color - The number representing the color.
	 * @returns {number} - The ID corresponding to the color.
	 */
	public colorToId(color: number): number {
		return color / bigPrimeNumber;
	}

	/**
	 * Observes hovered on element event, provides hovered element model when move in.
	 */
	public observeHoverOnElement(): Observable<HitTestEvent> {
		return this.hoverSubject.asObservable();
	}

	/**
	 * Observes touch start on element event, provides element model.
	 */
	public observeTouchStartOnElement(): Observable<HitTestEvent> {
		return this.touchStartSubject.asObservable();
	}

	/**
	 * Observes dblclicked on element event, provides dblclicked element model.
	 */
	public observeDblClickOnElement(): Observable<HitTestEvent> {
		return this.dblClickSubject.asObservable();
	}

	/**
	 * Observes rightclicked on element event, provides rightclicked element model.
	 */
	public observeRightClickOnElement(): Observable<HitTestEvent> {
		return this.rightClickSubject.asObservable();
	}

	private curImgData: Uint8ClampedArray = new Uint8ClampedArray(4);
	private prevAnimationFrameId = -1;
	/**
	 * Retrieves the pixel data at the specified coordinates.
	 *
	 * @private
	 * @param {number} x - The x-coordinate of the pixel.
	 * @param {number} y - The y-coordinate of the pixel.
	 * @returns {Uint8ClampedArray} - The pixel data at the specified coordinates.
	 */
	private getPixel(x: number, y: number): Uint8ClampedArray {
		const dpr = window.devicePixelRatio;
		// it's heavy operation, so use cached value if possible
		if (this.prevAnimationFrameId !== animationFrameId) {
			this.curImgData = this.ctx.getImageData(x * dpr, y * dpr, 1, 1).data;
			this.prevAnimationFrameId = animationFrameId;
		}
		return this.curImgData;
	}

	/**
	 * Resolves ht model based on the provided point
	 * @param point - The point for which to resolve model
	 */
	public resolveModel(point: Point): unknown {
		const data = this.getPixel(point.x, point.y);
		const id = this.colorToId(data[0] * 65536 + data[1] * 256 + data[2]);
		const idNumber = Number(id);
		const [subscriberToHit] = sortSubscribers(this.hitTestSubscribers, idNumber);
		const model = subscriberToHit?.lookup(id);
		return model;
	}

	/**
	 * Resolves cursor type based on the provided point
	 * @param point - The point for which to resolve cursor type
	 * @returns - The resolved cursor type, if any
	 */
	public resolveCursor(point: Point): CursorType | undefined {
		// do not spend time on resolving cursor if there are no subscribers that need it
		if (!this.hitTestSubscribers.some(s => s.resolveCursor !== undefined)) {
			return undefined;
		}
		const data = this.getPixel(point.x, point.y);
		const id = this.colorToId(data[0] * 65536 + data[1] * 256 + data[2]);
		const idNumber = Number(id);
		const [subscriberToHit] = sortSubscribers(this.hitTestSubscribers, idNumber);

		const model = subscriberToHit?.lookup(id);
		return subscriberToHit?.resolveCursor?.(point, model);
	}

	/**
	 * Private method that handles hit test events.
	 * @param {Point} point - The point where the event occurred.
	 * @param {HitTestEvents} event - The type of event that occurred.
	 * @returns {void}
	 */
	private eventHandler(point: Point, event: HitTestEvents): void {
		const data = this.getPixel(point.x, point.y);
		const id = this.colorToId(data[0] * 65536 + data[1] * 256 + data[2]);
		const idNumber = Number(id);
		const [subscriberToHit, restSubs] = sortSubscribers(this.hitTestSubscribers, idNumber);

		const model = subscriberToHit?.lookup(id);
		const hitTestEvent = {
			point,
			model,
		};
		switch (event) {
			case 'mousedown':
				model && subscriberToHit?.onMouseDown?.(model, point);
				restSubs.forEach(sub => sub.onMouseDown && sub.onMouseDown(null, point));
				break;
			case 'mouseup':
				model && subscriberToHit?.onMouseUp?.(model, point);
				restSubs.forEach(sub => sub.onMouseUp && sub.onMouseUp(null, point));
				break;
			case 'hover':
				model && subscriberToHit?.onHover?.(model, point);
				restSubs.forEach(sub => sub.onHover && sub.onHover(null, point));
				this.hoverSubject.next(hitTestEvent);
				break;
			case 'touchstart':
				model && subscriberToHit?.onTouchStart?.(model, point);
				restSubs.forEach(sub => sub.onTouchStart && sub.onTouchStart(null, point));
				this.touchStartSubject.next(hitTestEvent);
				break;
			case 'dblclick':
				model && subscriberToHit?.onDblClick?.(model, point);
				this.dblClickSubject.next(hitTestEvent);
				break;
			case 'contextmenu':
				model && subscriberToHit?.onRightClick?.(model, point);
				this.rightClickSubject.next(hitTestEvent);
				break;
			case 'zoom':
				model && subscriberToHit?.onZoom?.(model, point);
				restSubs.forEach(sub => sub.onZoom && sub.onZoom(null, point));
				break;
			default:
				break;
		}
	}
}

export interface HitTestSubscriber<T extends unknown = unknown> {
	// id range for charts [201-300], drawings - [1-200], etc - ?
	getIdRange(): [number, number];
	lookup(id: number): T | undefined;
	onMouseDown?(model: T | null, point?: Point): void;
	onMouseUp?(model: T | null, point?: Point): void;
	onHover?(model: T | null, point?: Point): void;
	onTouchStart?(model: T | null, point?: Point): void;
	onDblClick?(model: T, point?: Point): void;
	onRightClick?(model: T, point?: Point): void;
	onZoom?(model: T, point?: Point): void;
	resolveCursor?(point: Point, model?: T): CursorType | undefined;
}

export interface HitTestEvent<T = unknown> {
	readonly point: Point;
	readonly model: T;
}

const sortSubscribers = (
	subs: HitTestSubscriber[],
	id: number,
): [HitTestSubscriber | undefined, HitTestSubscriber[]] => {
	let mainSubscriber: HitTestSubscriber | undefined = undefined;
	const restSubs: HitTestSubscriber[] = [];
	subs.forEach(sub => {
		const [start, end] = sub.getIdRange();
		if (id >= start && id <= end) {
			mainSubscriber = sub;
		} else {
			restSubs.push(sub);
		}
	});
	return [mainSubscriber, restSubs];
};
