/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject } from 'rxjs';
import { ChartBaseElement } from '../../model/chart-base-element';
import { CanvasModel } from '../../model/canvas.model';
import { Point } from '../../inputlisteners/canvas-input-listener.component';
import { HitTestSubscriber, HIT_TEST_ID_RANGE } from '../../model/hit-test-canvas.model';

export class EventsModel extends ChartBaseElement implements HitTestSubscriber {
	events: EventWithId[] = [];
	hoveredEvent = new BehaviorSubject<Required<EventWithId> | null>(null);
	constructor(private canvasModel: CanvasModel) {
		super();
	}

	/**
	 * Sets the events array of the object to the provided array of events after indexing them.
	 * @param {EconomicEvent[]} events - An array of events to be set as the events array of the object.
	 * @returns {void}
	 */
	setEvents(events: EconomicEvent[]) {
		this.events = this.indexEvents(events);
	}

	/**
	 * Private method to index events with unique ids and sort them by timestamp
	 * @param {EconomicEvent[]} events - Array of events to be indexed
	 * @returns {EventWithId[]} - Array of indexed events with unique ids
	 */
	private indexEvents(events: EconomicEvent[]): EventWithId[] {
		const startId = this.getIdRange()[0];
		return events
			.map((event, id) => ({
				...event,
				id: id + startId,
			}))
			.sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Returns an array of two numbers representing the range of IDs for event hit tests.
	 * @returns {Array<number>} An array of two numbers representing the range of IDs for event hit tests.
	 */
	getIdRange(): [number, number] {
		return HIT_TEST_ID_RANGE.EVENTS;
	}

	/**
	 * Returns the event with the specified id.
	 * @param {number} id - The id of the event to look up.
	 * @returns {EventWithId} - The event with the specified id.
	 */
	lookup(id: number): EventWithId {
		return this.events.filter(event => event.id === id)[0];
	}

	/**
	 * Function that handles the hover event on a canvas element.
	 * @param {EventWithId} event - The event that is being hovered.
	 * @param {Point} [point] - The point where the event is being hovered.
	 * @returns {void}
	 */
	onHover(event: Required<EventWithId> | null, point: Point): void {
		const currentValue = this.hoveredEvent.getValue();
		if (currentValue !== event) {
			event && (event.point = point);
			this.hoveredEvent.next(event);
			this.canvasModel.fireDraw();
		}
	}

	/**
	 * Handles the touch start event.
	 *
	 * @param {EventWithId} event - The touch start event.
	 * @param {Point} [point] - The point where the touch started.
	 * @returns {void}
	 */
	onTouchStart(event: Required<EventWithId>, point: Point): void {
		this.onHover(event, point);
	}
}

export type EventType = 'earnings' | 'dividends' | 'splits' | 'conference-calls';

export type EventWithId = EconomicEvent & {
	id: number;
	point?: Point;
};

export interface EconomicEvent {
	type: EventType;
	timestamp: number;
	style: 'rhombus' | 'rhombus-small' | 'rhombus-large';
}
