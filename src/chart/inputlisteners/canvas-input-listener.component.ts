/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { subscribeListener } from '../utils/dom.utils';
import EventBus from '../events/event-bus';
import { merge, Observable, Subject } from 'rxjs';
import { ChartBaseElement } from '../model/chart-base-element';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { EVENT_RESIZED } from '../events/events';
import { deviceDetector } from '../utils/device/device-detector.utils';
import { HitBoundsTest } from '../canvas/canvas-bounds-container';
import { touchpadDetector } from '../utils/device/touchpad.utils';
import { Bounds } from '../model/bounds.model';

type CustomMouseEvent = MouseEvent | TouchEvent;
enum MouseButton {
	left = 0,
	middle = 1,
	right = 2,
}

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

	private mouseDownSubject = new Subject<Point>();
	private mouseUpSubject = new Subject<Point>();
	private mouseUpDocumentSubject = new Subject<Point>();

	private wheelSubject = new Subject<WheelEvent>();

	private touchStartSubject = new Subject<TouchEvent>();
	private touchMoveSubject = new Subject<TouchEvent>();
	private touchEndSubject = new Subject<TouchEvent>();
	private touchCancelSubject = new Subject<TouchEvent>();

	private contextMenuSubject = new Subject<MouseEvent>();
	private longTouchSubject = new Subject<TouchEvent>();

	private pinchSubject = new Subject<WheelEvent>();
	private scrollGestureSubject = new Subject<WheelEvent>();

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
	constructor(private eventBus: EventBus, private element: HTMLElement) {
		super();
	}

	private documentDragListeners: Array<() => void> = [];

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
			this.documentDragListeners.forEach(unsub => unsub());
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
		this.documentDragListeners.forEach(unsub => unsub());
		this.xDragEndSubject.next();
		this.yDragEndSubject.next();
	};

	private clickHandler = () => this.clickSubject.next(this.currentPoint);

	/**
	 * Prevents text selection inside chart-core canvas. TODO Do we need it?
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

		this.addSubscription(subscribeListener(this.element, this.clickHandler, 'click'));

		const clickDocumentListener = (e: Event) => {
			this.clickDocumentSubject.next(e);
		};
		this.addSubscription(subscribeListener(document, clickDocumentListener, 'click'));

		const device = deviceDetector();
		if (device === 'apple' || device === 'mobile') {
			// workaround to handle double taps for iOS
			const doubleTapListenerProducer = () => {
				let timeoutId: number | null = null;
				return () => {
					if (timeoutId) {
						this.dbClickSubject.next(this.currentPoint);
						clearTimeout(timeoutId);
						timeoutId = null;
					} else {
						timeoutId = window.setTimeout(() => {
							timeoutId = null;
						}, 250);
					}
				};
			};
			const doubleTapListener = doubleTapListenerProducer();
			this.addSubscription(subscribeListener(this.element, doubleTapListener, 'touchend'));
		}

		const longTouchListener = (e: TouchEvent, delay = 500, pixelsForMoveReset = 2) => {
			e.preventDefault();
			let timer: ReturnType<typeof setTimeout> | null = null;
			const initialCoords = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			let coords = { x: 0, y: 0 };

			const touchMoveHandler = (e: TouchEvent) => {
				coords = { x: e.touches[0].clientX, y: e.touches[0].clientY };
				if (
					Math.sqrt(Math.pow(coords.x - initialCoords.x, 2) + Math.pow(coords.y - initialCoords.y, 2)) >
						pixelsForMoveReset ||
					e.touches.length > 1
				) {
					touchEnd();
				}
			};

			const touchEnd = () => {
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}

				this.element.removeEventListener('touchend', touchEnd);
				this.element.removeEventListener('touchmove', touchMoveHandler);
			};

			timer = setTimeout(() => this.longTouchSubject.next(e), delay);

			this.element.addEventListener('touchmove', touchMoveHandler, { passive: true });
			this.element.addEventListener('touchend', touchEnd);
		};

		this.addSubscription(subscribeListener(this.element, (e: TouchEvent) => longTouchListener(e), 'touchstart'));

		this.addSubscription(
			subscribeListener(this.element, () => this.dbClickSubject.next(this.currentPoint), 'dblclick'),
		);

		this.addSubscription(
			subscribeListener(this.element, (e: TouchEvent) => this.touchStartSubject.next(e), 'touchstart'),
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
					// pinch gesture, we needs the same behaviour as mouse wheel
					if (e.ctrlKey) {
						this.pinchSubject.next(e);
					} else {
						// mouse wheel or scroll gesture
						const isTouchpad = touchpadDetector(e);
						if (isTouchpad) {
							this.scrollGestureSubject.next(e);
						} else {
							this.wheelSubject.next(e);
						}
					}
					e.preventDefault(); // to disable the scroll over the document, if for example chart is used as widget
				},
				'wheel',
			),
		);

		this.addSubscription(
			subscribeListener(this.element, (e: MouseEvent) => this.contextMenuSubject.next(e), 'contextmenu'),
		);

		this.addSubscription(
			subscribeListener(this.element, () => this.mouseDownSubject.next(this.currentPoint), 'mousedown'),
		);

		this.addSubscription(
			subscribeListener(this.element, () => this.mouseUpSubject.next(this.currentPoint), 'mouseup'),
		);
		this.addSubscription(
			subscribeListener(document, () => this.mouseUpDocumentSubject.next(this.currentPoint), 'mouseup'),
		);

		this.addRxSubscription(
			this.eventBus.observe(EVENT_RESIZED).subscribe(() => {
				const bcr = this.element.getBoundingClientRect();
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
	 * @param {CustomMouseEvent} e - The CustomMouseEvent object containing the mouse/touch coordinates.
	 * @returns {void}
	 * @private
	 */
	private updateCurrentMousePoint(e: CustomMouseEvent) {
		// this is a bad solution because BCR causes reflow
		// it's ok while document is not changed, styles and layout
		// but it's faster to cache BCR and recalculate when it's needed
		const rect = this.element.getBoundingClientRect();
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
	 * Returns an Observable that emits WheelEvent when a pinch event occurs and the hitBoundsTest function returns true for the current point.
	 * @param {HitBoundsTest} hitBoundsTest - A function that takes the current point's x and y coordinates as arguments and returns a boolean indicating whether the point is within the desired bounds.
	 * @returns {Observable<WheelEvent>} - An Observable that emits WheelEvent when a pinch event occurs and the hitBoundsTest function returns true for the current point.
	 */
	public observePinch(hitBoundsTest: HitBoundsTest = () => true): Observable<WheelEvent> {
		return this.pinchSubject
			.asObservable()
			.pipe(filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)));
	}

	/**
	 * Returns an Observable that emits a WheelEvent whenever a scroll gesture is detected.
	 * The Observable is created from a Subject that is subscribed to by the component's template.
	 * @returns {Observable<WheelEvent>} An Observable that emits a WheelEvent whenever a scroll gesture is detected.
	 */
	public observeScrollGesture(): Observable<WheelEvent> {
		return this.scrollGestureSubject.asObservable();
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
	 * Returns an Observable that emits a TouchEvent when a long touch is detected on the current element.
	 * @param {HitBoundsTest} [hitBoundsTest=() => true] - A function that returns a boolean indicating whether the touch event occurred within the bounds of the current element.
	 * @returns {Observable<TouchEvent>} - An Observable that emits a TouchEvent when a long touch is detected on the current element.
	 */
	public observeLongTouch(hitBoundsTest: HitBoundsTest = () => true): Observable<TouchEvent> {
		return this.longTouchSubject.asObservable().pipe(
			filter(() => hitBoundsTest(this.currentPoint.x, this.currentPoint.y)),
			tap(p => p.preventDefault()),
		);
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
