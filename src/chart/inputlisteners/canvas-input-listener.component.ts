/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { MouseButton, leftMouseButtonListener, subscribeListener } from '../utils/dom.utils';
import EventBus from '../events/event-bus';
import { merge, Observable, Subject } from 'rxjs';
import { ChartBaseElement } from '../model/chart-base-element';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { EVENT_RESIZED } from '../events/events';
import { HitBoundsTest } from '../canvas/canvas-bounds-container';
import { Bounds } from '../model/bounds.model';
import { deviceDetector } from '../utils/device/device-detector.utils';

type CustomMouseEvent = MouseEvent | TouchEvent;

/**
 * Gathers user input on canvas element:
 * Chart update order should be following:
 * 1. update currentPoints
 * 2. fire drag, so chart scale is updated if dragged
 * 3. fire cross - it should have updated chart coordinates
 * - mouse drag X / Y
 * - zooming (wheel event)
 * - touch start and move
 */
export class CanvasInputListenerComponent extends ChartBaseElement {
	static DRAG_START_EVENTS = ['mousedown', 'touchstart'] as const;
	static DRAG_EVENTS = ['mousemove', 'touchmove'] as const;
	static DRAG_END_EVENTS = ['mouseup', 'touchend', 'touchcancel'];
	private xDragStartSubject = new Subject<Point>();
	/* Returns X drag delta in pixels relative to start event above: 1, 2, 3, 5, 10, 7, 3, -1, -9, -43, -149, ...*/
	private xDragSubject = new Subject<number>();
	/* Returns X drag delta in pixels for every tick: 1, 1, 2, 3, 2, 1, 1, 5, 10, 30, 2, 1, ...*/
	private xDragTickSubject = new Subject<number>();
	private xDragEndSubject = new Subject<void>();
	private yDragStartSubject = new Subject<Point>();
	private yDragSubject = new Subject<number>();
	private yDragTickSubject = new Subject<number>();
	private yDragEndSubject = new Subject<void>();
	private mouseMoveSubject = new Subject<Point>();
	private mouseMoveDocumentSubject = new Subject<Point>();
	private clickSubject = new Subject<Point>();
	private clickDocumentSubject = new Subject<Event>();
	private dbClickSubject = new Subject<Point>();
	private dbTapSubject = new Subject<Point>();
	private mouseDownSubject = new Subject<Point>();
	private mouseUpSubject = new Subject<Point>();
	private mouseUpDocumentSubject = new Subject<Point>();

	private wheelSubject = new Subject<WheelEvent>();

	private touchStartSubject = new Subject<TouchEvent>();
	private touchStartTimestamp = 0;
	private touchMoveSubject = new Subject<TouchEvent>();
	private touchEndSubject = new Subject<TouchEvent>();
	private touchCancelSubject = new Subject<TouchEvent>();
	private longTouchStartSubject = new Subject<TouchEvent>();
	private longTouchEndSubject = new Subject<TouchEvent>();

	private contextMenuSubject = new Subject<MouseEvent>();

	private fastTouchScroll = new Subject<TouchEvent>();

	mouseLeavesCanvasSubject = new Subject<boolean>();

	// point at which start dragging
	dragStartPoint: Point = { x: 0, y: 0 };
	prevDragPoint: Point = { x: 0, y: 0 };
	// current mouse point in canvas
	currentPoint: Point = { x: 0, y: 0 };
	// current mouse point in document
	currentPointDocument: Point = { x: 0, y: 0 };
	// if currently dragging
	dragging = false;
	dragStartEvent?: CustomMouseEvent;
	canvasBounds: Bounds = {
		x: 0,
		y: 0,
		pageX: 0,
		pageY: 0,
		width: 0,
		height: 0,
	};

	// Cached bounding client rect to avoid frequent reflow in Safari
	private cachedElementRect: DOMRect | null = null;
	private rectCacheValid = false;

	constructor(private eventBus: EventBus, private element: HTMLElement) {
		super();
	}

	private documentDragListeners: Array<() => void> = [];

	/**
	 * Gets cached element bounding rect or calculates new one if cache is invalid.
	 * Caching prevents expensive getBoundingClientRect() calls during frequent operations.
	 */
	private getElementRect(): DOMRect {
		if (this.rectCacheValid && this.cachedElementRect) {
			return this.cachedElementRect;
		}

		try {
			if (!this.element || !this.element.isConnected) {
				return this.createFallbackRect();
			}

			const rect = this.element.getBoundingClientRect();
			this.cachedElementRect = rect;
			this.rectCacheValid = true;

			return rect;
		} catch (error) {
			return this.createFallbackRect();
		}
	}

	/**
	 * Creates fallback DOMRect for error cases or when element is unavailable
	 */
	private createFallbackRect(): DOMRect {
		// DOMRect might not be available in older browsers
		if (typeof DOMRect !== 'undefined') {
			return new DOMRect(0, 0, 0, 0);
		}
		// Fallback for older browsers - create object with same interface
		const rect: DOMRect = {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
			toJSON: () => ({}),
		};
		return rect;
	}

	/**
	 * Invalidates the cached bounding client rect, forcing recalculation on next access
	 */
	private invalidateRectCache(): void {
		this.rectCacheValid = false;
	}

	/**
	 * Forces immediate initialization of the rect cache and canvas bounds
	 */
	public initializeRectCache(): void {
		this.invalidateRectCache();
		const bcr = this.getElementRect();
		this.canvasBounds.x = bcr.left;
		this.canvasBounds.y = bcr.top;
		this.canvasBounds.width = bcr.width;
		this.canvasBounds.height = bcr.height;
	}

	/**
	 * Safely cleans up document drag listeners to prevent memory leaks
	 */
	private cleanupDocumentDragListeners(): void {
		if (!this.documentDragListeners || !Array.isArray(this.documentDragListeners)) {
			this.documentDragListeners = [];
			return;
		}

		this.documentDragListeners.forEach(unsub => {
			try {
				unsub();
			} catch (error) {
				// Ignore errors during cleanup to prevent crashes
				console.warn('Error cleaning up drag listener:', error);
			}
		});
		this.documentDragListeners = [];
	}

	/**
	 * Override doDeactivate to ensure proper cleanup of cached data
	 */
	protected doDeactivate(): void {
		// Clean up rect cache to prevent stale data
		this.invalidateRectCache();
		this.cachedElementRect = null;

		// Clean up drag listeners safely
		this.cleanupDocumentDragListeners();

		// Call parent cleanup
		super.doDeactivate();
	}

	private dragProcessListener = () => {
		this.xDragSubject.next(this.currentPoint.x - this.dragStartPoint.x);
		this.yDragSubject.next(this.currentPoint.y - this.dragStartPoint.y);
		this.xDragTickSubject.next(this.currentPoint.x - this.prevDragPoint.x);
		this.yDragTickSubject.next(this.currentPoint.y - this.prevDragPoint.y);
		this.prevDragPoint.x = this.currentPoint.x;
		this.prevDragPoint.y = this.currentPoint.y;
	};

	private dragStartListener = (e: CustomMouseEvent) => {
		if (this.isDraggable(e)) {
			this.updateCurrentPoints(e);
			this.dragging = true;
			this.dragStartEvent = e;
			// Clean up any existing drag listeners before adding new ones
			this.cleanupDocumentDragListeners();
			this.dragStartPoint = CanvasInputListenerComponent.copyPoint(this.currentPoint);
			this.xDragStartSubject.next(this.dragStartPoint);
			this.yDragStartSubject.next(this.dragStartPoint);
			this.prevDragPoint = { ...this.dragStartPoint };
			CanvasInputListenerComponent.DRAG_EVENTS.forEach(dragEvent => {
				// scale update rely on this listener, it should be executed BEFORE cross event, but AFTER updateCurrentPoints!!!
				document.addEventListener(dragEvent, this.dragProcessListener, true);
				const unsubscriber = document.removeEventListener.bind(
					document,
					dragEvent,
					this.dragProcessListener,
					true,
				);
				this.documentDragListeners.push(unsubscriber);
				this.addSubscription(unsubscriber);
			});
			this.dragProcessListener();
		}
	};

	/**
	 * This methods allows change scale, only if dragging using primary mouse button or touch.
	 * @param e
	 */
	private isDraggable(e: CustomMouseEvent) {
		if (e instanceof MouseEvent) {
			return e.button === MouseButton.left;
		}
		return e instanceof TouchEvent;
	}

	/**
	 * This methods allows you to start dragging programmatically
	 * @param e
	 */
	public startDragging(e: CustomMouseEvent) {
		this.updateCurrentPoints(e);
		this.dragStartListener(e);
	}

	/**
	 * This methods allows you to move mouse pointer programmatically
	 * @param e
	 */
	public movePointer(e: CustomMouseEvent) {
		this.updateCurrentPoints(e);
		this.dragListener();
		this.updateElementOffsetListener();
		this.dragging && this.dragProcessListener();
	}
	/**
	 * This methods allows you to stop dragging programmatically
	 */
	public stopDragging() {
		this.dragEndListener();
	}

	private dragListener = () => this.mouseMoveDocumentSubject.next(this.currentPoint);

	private updateElementOffsetListener = () => this.mouseMoveSubject.next(this.currentPoint);

	private dragEndListener = () => {
		this.dragging = false;
		this.cleanupDocumentDragListeners();
		this.xDragEndSubject.next();
		this.yDragEndSubject.next();
	};

	/**
	 * TODO: Do we need it?
	 * Prevents text selection inside chart-core canvas.
	 */
	private fixTextSelection() {
		const selectListener = (e: Event) => {
			e.preventDefault();
			return false;
		};
		this.element.addEventListener('selectstart', selectListener, false);
		this.addSubscription(this.element.removeEventListener.bind(this.element, 'selectstart', selectListener, false));
	}

	doActivate() {
		this.fixTextSelection();

		// catch drag start on canvas element but may continue dragging outside of it
		this.documentDragListeners = [];
		CanvasInputListenerComponent.DRAG_START_EVENTS.forEach(dragStartEvent => {
			this.element.addEventListener(dragStartEvent, this.dragStartListener);
			this.addSubscription(() => this.element.removeEventListener(dragStartEvent, this.dragStartListener));
		});

		// always keep track of current mouse point
		this.trackMousePosition();

		CanvasInputListenerComponent.DRAG_EVENTS.forEach(dragEvent => {
			document.addEventListener(dragEvent, this.dragListener);
			this.addSubscription(document.removeEventListener.bind(document, dragEvent, this.dragListener));
			this.element.addEventListener(dragEvent, this.updateElementOffsetListener);
			this.addSubscription(
				this.element.removeEventListener.bind(this.element, dragEvent, this.updateElementOffsetListener),
			);
		});

		CanvasInputListenerComponent.DRAG_END_EVENTS.forEach(dragEndEvent => {
			document.addEventListener(dragEndEvent, this.dragEndListener);
			this.addSubscription(document.removeEventListener.bind(document, dragEndEvent, this.dragEndListener));
		});

		this.addSubscription(
			subscribeListener(
				this.element,
				leftMouseButtonListener(() => this.clickSubject.next(this.currentPoint)),
				'click',
			),
		);

		this.addSubscription(
			subscribeListener(
				document,
				leftMouseButtonListener(e => this.clickDocumentSubject.next(e)),
				'click',
			),
		);

		const device = deviceDetector();
		if (device === 'apple' || device === 'mobile') {
			// workaround to handle double taps for iOS
			let dbTapTimeout: number | null = null;
			const doubleTapListenerProducer = (e: TouchEvent) => {
				e.preventDefault();
				if (dbTapTimeout) {
					this.dbTapSubject.next(this.currentPoint);
					clearTimeout(dbTapTimeout);
					dbTapTimeout = null;
				} else {
					dbTapTimeout = window.setTimeout(() => {
						dbTapTimeout = null;
					}, 250);
				}
			};
			this.addSubscription(subscribeListener(this.element, doubleTapListenerProducer, 'touchend'));

			// workaround to handle long touch start/end for iOS
			const longTouchListeners = (e: TouchEvent, delay = 200) => {
				e.preventDefault();
				let longTouchStart = false;
				let timerLongTouchStart: ReturnType<typeof setTimeout> | null = null;

				// start timeout for long touch
				timerLongTouchStart = setTimeout(() => {
					longTouchStart = true;
					this.longTouchStartSubject.next(e);
				}, delay);

				const touchMoveHandler = (e: TouchEvent) => {
					e.preventDefault();
					// clear long touch timeout if move area is bigger than pixelsForMove
					if (e.touches.length > 1) {
						timerLongTouchStart && clearTimeout(timerLongTouchStart);
					}
				};
				const touchEndHandler = (e: TouchEvent) => {
					e.preventDefault();
					timerLongTouchStart && clearTimeout(timerLongTouchStart);
					if (longTouchStart) {
						longTouchStart = false;
						this.longTouchEndSubject.next(e);
					}
					this.element.removeEventListener('touchend', touchEndHandler);
					this.element.removeEventListener('touchmove', touchMoveHandler);
				};
				this.element.addEventListener('touchmove', touchMoveHandler);
				this.element.addEventListener('touchend', touchEndHandler);
			};

			this.addSubscription(
				subscribeListener(this.element, (e: TouchEvent) => longTouchListeners(e), 'touchstart'),
			);

			const fastScrollListenerProducer = (e: TouchEvent) => {
				e.preventDefault();
				// should work only if dragged to the left
				if (this.prevDragPoint.x > this.dragStartPoint.x) {
					// in percent, perhaps should be changed to just pixels,
					// because landscape and portait orientations would give different % results
					const minDistance = 35;
					// in ms, should be lower to detect as "fast"
					const maxTime = 250;

					const touchStartTs = this.touchStartTimestamp;
					const touchEndTs = Date.now();
					const time = touchEndTs - touchStartTs;

					const distance = ((this.prevDragPoint.x - this.dragStartPoint.x) / this.canvasBounds.width) * 100;
					const isRightDistance = distance > minDistance;
					const isRightTime = time <= maxTime;

					if (isRightDistance && isRightTime) {
						this.fastTouchScroll.next(e);
					}
				}
			};
			this.addSubscription(subscribeListener(this.element, fastScrollListenerProducer, 'touchend'));
		}

		this.addSubscription(
			subscribeListener(
				this.element,
				leftMouseButtonListener(() => this.dbClickSubject.next(this.currentPoint)),
				'dblclick',
			),
		);

		this.addSubscription(
			subscribeListener(
				this.element,
				(e: TouchEvent) => {
					this.touchStartSubject.next(e);
					this.touchStartTimestamp = Date.now();
				},
				'touchstart',
			),
		);
		this.addSubscription(
			subscribeListener(this.element, (e: TouchEvent) => this.touchMoveSubject.next(e), 'touchmove', true),
		);
		this.addSubscription(
			subscribeListener(this.element, (e: TouchEvent) => this.touchEndSubject.next(e), 'touchend'),
		);
		this.addSubscription(
			subscribeListener(this.element, (e: TouchEvent) => this.touchCancelSubject.next(e), 'touchcancel'),
		);

		this.addSubscription(
			subscribeListener(
				this.element,
				(e: WheelEvent) => {
					this.updateCurrentPoints(e);
					this.wheelSubject.next(e);
					e.preventDefault(); // to disable the scroll over the document, if for example chart is used as widget
				},
				'wheel',
			),
		);

		this.addSubscription(
			subscribeListener(this.element, (e: MouseEvent) => this.contextMenuSubject.next(e), 'contextmenu'),
		);

		this.addSubscription(
			subscribeListener(
				this.element,
				leftMouseButtonListener(() => this.mouseDownSubject.next(this.currentPoint)),
				'mousedown',
			),
		);

		this.addSubscription(
			subscribeListener(
				this.element,
				leftMouseButtonListener(() => this.mouseUpSubject.next(this.currentPoint)),
				'mouseup',
			),
		);
		this.addSubscription(
			subscribeListener(
				document,
				leftMouseButtonListener(() => this.mouseUpDocumentSubject.next(this.currentPoint)),
				'mouseup',
			),
		);

		this.addRxSubscription(
			this.eventBus.observe(EVENT_RESIZED).subscribe(() => {
				// Force invalidate cache on resize to ensure fresh getBoundingClientRect data
				this.invalidateRectCache();
				const bcr = this.getElementRect();
				this.canvasBounds.x = bcr.left;
				this.canvasBounds.y = bcr.top;
				this.canvasBounds.width = bcr.width;
				this.canvasBounds.height = bcr.height;
			}),
		);

		const mouseLeaveListener = () => {
			this.mouseLeavesCanvasSubject.next(true);
		};
		this.element.addEventListener('mouseleave', mouseLeaveListener, false);
		this.addSubscription(
			this.element.removeEventListener.bind(this.element, 'mouseleave', mouseLeaveListener, false),
		);
	}

	/**
	 * Returns the current mouse point.
	 *
	 * @returns {Point} The current mouse point.
	 */
	public getCurrentMousePoint(): Point {
		return this.currentPoint;
	}

	/**
	 * Private method that tracks the mouse position by adding event listeners for drag events on the document.
	 * The event listeners are added on the capture phase to ensure that every other listener gets an actual state for current points.
	 * The method also adds a subscription to remove the event listeners when they are no longer needed.
	 */
	private trackMousePosition() {
		CanvasInputListenerComponent.DRAG_EVENTS.forEach(dragEvent => {
			// handle event on capture phase, so every other listeners get an actual state for current points
			document.addEventListener(dragEvent, this.updateCurrentPoints, true);
			this.addSubscription(() => document.removeEventListener(dragEvent, this.updateCurrentPoints, true));
		});
	}

	private updateCurrentPoints = (e: CustomMouseEvent) => {
		this.updateCurrentDocumentPoint(e);
		this.updateCurrentMousePoint(e);
	};

	/**
	 * Updates the current point of the document based on the provided event.
	 * @param {CustomMouseEvent} e - The event that triggered the update.
	 * @returns {void}
	 */
	private updateCurrentDocumentPoint(e: CustomMouseEvent) {
		if ('pageX' in e) {
			this.currentPointDocument.x = e.pageX;
		} else if (e.touches !== undefined) {
			this.currentPointDocument.x = e.touches[0].pageX;
		}
		if ('pageY' in e) {
			this.currentPointDocument.y = e.pageY;
		} else if (e.touches !== undefined) {
			this.currentPointDocument.y = e.touches[0].pageY;
		}
	}

	/**
	 * Updates the current mouse point based on the provided CustomMouseEvent.
	 * Uses cached element rect to avoid frequent reflow in Safari.
	 * @param {CustomMouseEvent} e - The CustomMouseEvent object containing the mouse/touch coordinates.
	 * @returns {void}
	 * @private
	 */
	private updateCurrentMousePoint(e: CustomMouseEvent) {
		// Use cached rect to prevent frequent reflow/repaint in Safari
		const rect = this.getElementRect();
		if ('clientX' in e) {
			this.currentPoint.x = e.clientX - rect.left;
		} else if (e.touches !== undefined) {
			this.currentPoint.x = e.touches[0].clientX - rect.left;
		}
		if ('clientY' in e) {
			this.currentPoint.y = e.clientY - rect.top;
		} else if (e.touches !== undefined) {
			this.currentPoint.y = e.touches[0].clientY - rect.top;
		}
	}

	/**
	 * Creates a new object with the same properties as the provided Point object.
	 * @param {Point} point - The Point object to be copied.
	 * @returns {Object} - A new object with the same properties as the provided Point object.
	 * @private
	 * @static
	 */
	private static copyPoint(point: Point) {
		return {
			x: point.x,
			y: point.y,
		};
	}
	/* **************************************************************** */
	/* HIT TEST argument allows to observe events only in specific areas */
	/* **************************************************************** */
	/**
	 * This method allows to observe mouse move events only in specific areas.
	 * @param {HitBoundsTest} hitBoundsTest - A function that takes x and y coordinates as arguments and returns a boolean value indicating whether the event should be observed or not.
	 * @returns {Observable<Point>} - An observable that emits a Point object whenever a mouse move event occurs within the specified area.
	 */
	public observeMouseMove(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.mouseMoveSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits the mouse move events only if the user is not dragging.
	 * @returns {Observable<Point>} An Observable that emits the mouse move events.
	 */
	public observeMouseMoveNoDrag(): Observable<Point> {
		return this.mouseMoveSubject.asObservable().pipe(filter(() => !this.dragging));
	}

	/**
	 * Observes any element hover in all document not only <canvas>
	 * @param hitBoundsTest
	 * @return point position in chart
	 */
	public observeMouseMoveDocument(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.mouseMoveDocumentSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Observes any element hover in all document not only <canvas>
	 * @param hitBoundsTest
	 * @return absolute point position in document
	 */
	public observeMouseMoveDocumentAnyElement(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.mouseMoveDocumentSubject.asObservable().pipe(
			filter(() => hitBoundsTest(this.currentPointDocument.x, this.currentPointDocument.y)),
			map(() => this.currentPointDocument),
		);
	}

	/**
	 * Returns an Observable that emits an Event object whenever a click event occurs on the document.
	 * The Observable is created from a Subject that emits the click event.
	 * @returns {Observable<Event>} An Observable that emits an Event object whenever a click event occurs on the document.
	 */
	public observeClickOnDocument(): Observable<Event> {
		return this.clickDocumentSubject.asObservable();
	}

	/**
	 * Returns observable which contains point position relative to chart canvas. (not document point!)
	 * @param hitBoundsTest {HitBoundsTest}
	 */
	public observeXDragStart(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.xDragStartSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits the xDragSubject value if the hitBoundsTest function returns true for the currentPoint.
	 * @param {HitBoundsTest} hitBoundsTest - A function that takes the currentPoint's x and y coordinates as arguments and returns a boolean value.
	 * @returns {Observable<number>} - An Observable that emits the xDragSubject value if the hitBoundsTest function returns true for the currentPoint.
	 */
	public observeXDrag(hitBoundsTest: HitBoundsTest = () => true): Observable<number> {
		return this.xDragSubject.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits when the xDragEndSubject emits and the hitBoundsTest function returns true for the currentPoint.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that takes the currentPoint's x and y coordinates as arguments and returns a boolean indicating whether the point is within the desired bounds.
	 * @returns {Observable<void>} - An Observable that emits when the xDragEndSubject emits and the hitBoundsTest function returns true for the currentPoint.
	 */
	public observeXDragEnd(hitBoundsTest: HitBoundsTest = () => true): Observable<void> {
		return this.xDragEndSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a number every time a drag tick event occurs on the X axis.
	 * The number emitted represents the current position of the drag on the X axis.
	 * The Observable is created from a Subject that emits the drag tick events.
	 * @returns {Observable<number>} An Observable that emits a number every time a drag tick event occurs on the X axis.
	 */
	public observeXDragTick(): Observable<number> {
		return this.xDragTickSubject.asObservable();
	}

	/**
	 * Returns observable which contains point position relative to chart canvas. (not document point!)
	 * @param hitBoundsTest {HitBoundsTest}
	 */
	public observeYDragStart(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.yDragStartSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an observable that emits the y-drag subject and filters it based on the hitBoundsTest function.
	 * @param {HitBoundsTest} hitBoundsTest - A function that returns a boolean indicating whether the current point is within the bounds.
	 * @returns {Observable<number>} - An observable that emits the y-drag subject.
	 */
	public observeYDrag(hitBoundsTest: HitBoundsTest = () => true): Observable<number> {
		return this.yDragSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits when the yDragEndSubject emits and the hitBoundsTest function returns true for the currentPoint.
	 * @param {HitBoundsTest} hitBoundsTest - A function that takes in the x and y coordinates of the currentPoint and returns a boolean indicating whether the point is within the bounds.
	 * @returns {Observable<void>} - An Observable that emits when the yDragEndSubject emits and the hitBoundsTest function returns true for the currentPoint.
	 */
	public observeYDragEnd(hitBoundsTest: HitBoundsTest = () => true): Observable<void> {
		return this.yDragEndSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a number every time the yDragTickSubject emits a value.
	 * The emitted value is the value emitted by the yDragTickSubject.
	 * @returns {Observable<number>} An Observable that emits a number every time the yDragTickSubject emits a value.
	 */
	public observeYDragTick(): Observable<number> {
		return this.yDragTickSubject.asObservable();
	}

	/**
	 * Returns an Observable that emits a boolean value when the mouse enters the canvas.
	 * @param {HitBoundsTest} hitBoundsTest - A function that tests whether the mouse pointer is within the bounds of the canvas.
	 * @param {boolean} skipWhenDragging - A flag that determines whether to skip the mouse enter event when the user is dragging.
	 * @returns {Observable<boolean>} - An Observable that emits a boolean value when the mouse enters or leaves the canvas.
	 */
	public observeMouseEnter(hitBoundsTest: HitBoundsTest = () => true, skipWhenDragging = false): Observable<boolean> {
		const mouseEnter$ = this.mouseMoveSubject.asObservable().pipe(
			filter(() => !(skipWhenDragging && this.dragging)),
			map(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)),
		);
		const shouldCloseMouseEnter$ = this.observeMouseLeavesCanvas().pipe(map(() => false));
		return merge(mouseEnter$, shouldCloseMouseEnter$).pipe(distinctUntilChanged());
	}

	/**
	 * Returns an observable that emits a value when the mouse leaves the canvas.
	 * @returns {Observable} An observable that emits a value when the mouse leaves the canvas.
	 */
	public observeMouseLeavesCanvas() {
		return this.mouseLeavesCanvasSubject.asObservable();
	}

	/**
	 * Returns an Observable that emits a Point object when the element is clicked within the bounds specified by the hitBoundsTest function.
	 * @param {HitBoundsTest} hitBoundsTest - A function that takes the x and y coordinates of the click event and returns a boolean indicating whether the click is within the desired bounds.
	 * @returns {Observable<Point>} - An Observable that emits a Point object when the element is clicked within the specified bounds.
	 */
	public observeClick(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.clickSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a Point object when a double click event occurs within the bounds of the current point.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that tests if the double click event occurred within the bounds of the current point.
	 * @returns {Observable<Point>} An Observable that emits a Point object when a double click event occurs within the bounds of the current point.
	 */
	public observeDbClick(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.dbClickSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a Point object when a double tap event occurs within the bounds of the current point.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that tests if the double click event occurred within the bounds of the current point.
	 * @returns {Observable<Point>} An Observable that emits a Point object when a double tap event occurs within the bounds of the current point.
	 */
	public observeDbTap(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.dbTapSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits WheelEvent objects when the wheelSubject emits a new value.
	 * The emitted events are filtered by the hitBoundsTest function, which is passed as an optional parameter.
	 * If the hitBoundsTest function is not provided, it defaults to a function that always returns true.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that takes the currentPoint's x and y coordinates as arguments and returns a boolean value.
	 * @returns {Observable<WheelEvent>} - An Observable that emits WheelEvent objects.
	 */
	public observeWheel(hitBoundsTest: HitBoundsTest = () => true): Observable<WheelEvent> {
		return this.wheelSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits TouchEvent when a touchstart event occurs within the bounds of the current point.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that tests if the touch event occurred within the bounds of the current point.
	 * @returns {Observable<TouchEvent>} - An Observable that emits TouchEvent when a touchstart event occurs within the bounds of the current point.
	 */
	public observeTouchStart(hitBoundsTest: HitBoundsTest = () => true): Observable<TouchEvent> {
		return this.touchStartSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits TouchEvent objects when the user moves their finger on the screen.
	 * @param {HitBoundsTest} hitBoundsTest - A function that takes the x and y coordinates of the current touch point and returns a boolean indicating whether the touch is within the desired bounds.
	 * @returns {Observable<TouchEvent>} - An Observable that emits TouchEvent objects when the user moves their finger on the screen within the specified bounds.
	 */
	public observeTouchMove(hitBoundsTest: HitBoundsTest = () => true): Observable<TouchEvent> {
		return this.touchMoveSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a TouchEvent when the touch end event occurs on the document.
	 * The Observable is created from a Subject that is subscribed to the touchEndSubject.
	 * @returns {Observable<TouchEvent>} An Observable that emits a TouchEvent when the touch end event occurs on the document.
	 */
	public observeTouchEndDocument(): Observable<TouchEvent> {
		return this.touchEndSubject.asObservable();
	}

	/**
	 * Returns an Observable that emits a TouchEvent when the touchcancel event is triggered on the document.
	 * @return {Observable<TouchEvent>} An Observable that emits a TouchEvent when the touchcancel event is triggered on the document.
	 */
	public observeTouchCancelDocument(): Observable<TouchEvent> {
		return this.touchCancelSubject.asObservable();
	}

	/**
	 * Returns an Observable that emits the Point object when the mouse button is pressed down within the bounds of the current point.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that tests whether the mouse click is within the bounds of the current point.
	 * @returns {Observable<Point>} - An Observable that emits the Point object when the mouse button is pressed down within the bounds of the current point.
	 */
	public observeMouseDown(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.mouseDownSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits the Point where the mouse button is released,
	 * filtered by the hitBoundsTest function that determines if the currentPoint is within the bounds.
	 * @param {HitBoundsTest} hitBoundsTest - A function that takes the x and y coordinates of the currentPoint and returns a boolean indicating if it is within the bounds.
	 * @returns {Observable<Point>} - An Observable that emits the Point where the mouse button is released, filtered by the hitBoundsTest function.
	 */
	public observeMouseUp(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.mouseUpSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits the Point where the mouse button is released on the document.
	 * @param {HitBoundsTest} hitBoundsTest - A function that returns a boolean indicating whether the mouseup event occurred within the bounds of the element.
	 * @returns {Observable<Point>} - An Observable that emits the Point where the mouse button is released on the document.
	 */
	public observeMouseUpDocument(hitBoundsTest: HitBoundsTest = () => true): Observable<Point> {
		return this.mouseUpDocumentSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a MouseEvent when a context menu event is triggered and the mouse pointer is within the bounds of the element.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that returns a boolean indicating whether the mouse pointer is within the bounds of the element.
	 * @returns {Observable<MouseEvent>} - An Observable that emits a MouseEvent when a context menu event is triggered and the mouse pointer is within the bounds of the element.
	 */
	public observeContextMenu(hitBoundsTest: HitBoundsTest = () => true): Observable<MouseEvent> {
		return this.contextMenuSubject.asObservable().pipe(
			filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)),
			tap(p => p.preventDefault()),
		);
	}

	/**
	 * Returns an Observable that emits a TouchEvent when a long touch start is detected on the current element.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that returns a boolean indicating whether the touch event occurred within the bounds of the current element.
	 * @returns {Observable<TouchEvent>} - An Observable that emits a TouchEvent when a long touch is detected on the current element.
	 */
	public observeLongTouchStart(hitBoundsTest: HitBoundsTest = () => true): Observable<TouchEvent> {
		return this.longTouchStartSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a TouchEvent when a long touch end is detected on the current element.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that returns a boolean indicating whether the touch event occurred within the bounds of the current element.
	 * @returns {Observable<TouchEvent>} - An Observable that emits a TouchEvent when a long touch is detected on the current element.
	 */
	public observeLongTouchEnd(hitBoundsTest: HitBoundsTest = () => true): Observable<TouchEvent> {
		return this.longTouchEndSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a Touch whenever a fast scroll is detected.
	 * Fast scroll happens whenever chart or any other pane were moved faster than usual
	 * The Observable is created from a Subject that is subscribed to by the component's template.
	 * @returns {Observable<TouchEvent>} An Observable that emits a TouchEvent whenever a fast scroll is detected.
	 */
	public observeFastTouchScroll(hitBoundsTest: HitBoundsTest = () => true): Observable<TouchEvent> {
		return this.fastTouchScroll
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns the current point of the object.
	 * @returns {Point} The current point of the object.
	 */
	public getCurrentPoint(): Point {
		return this.currentPoint;
	}
}

export interface Point {
	x: number;
	y: number;
}
