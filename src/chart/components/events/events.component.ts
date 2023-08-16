/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable } from 'rxjs';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { CursorHandler } from '../../canvas/cursor.handler';
import { ChartBaseElement } from '../../model/chart-base-element';
import { FullChartConfig } from '../../chart.config';
import { CanvasModel } from '../../model/canvas.model';
import { DrawingManager } from '../../drawers/drawing-manager';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';
import { DateTimeFormatter, DateTimeFormatterFactory, recalculateXFormatter } from '../../model/date-time.formatter';
import { merge } from '../../utils/merge.utils';
import { ChartModel } from '../chart/chart.model';
import { EventsHitTestDrawer } from './events-hit-test.drawer';
import { EventsDrawer } from './events.drawer';
import { EconomicEvent, EventType, EventWithId, EventsModel } from './events.model';

export class EventsComponent extends ChartBaseElement {
	eventsModel: EventsModel;
	private eventsXAxisLabelFormatterProvider: () => DateTimeFormatter;

	constructor(
		private config: FullChartConfig,
		private canvasModel: CanvasModel,
		hitTestCanvasModel: HitTestCanvasModel,
		chartModel: ChartModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private drawingManager: DrawingManager,
		private formatterFactory: DateTimeFormatterFactory,
		cursorHandler: CursorHandler,
		backgroundCanvasModel: CanvasModel,
	) {
		super();
		this.eventsXAxisLabelFormatterProvider = () =>
			recalculateXFormatter(
				this.config.components.events.xAxisLabelFormat,
				chartModel.getPeriod(),
				this.formatterFactory,
			);
		const eventsModel = new EventsModel(canvasModel);
		this.eventsModel = eventsModel;
		this.addChildEntity(eventsModel);
		hitTestCanvasModel.addSubscriber(eventsModel);

		const eventsDrawer = new EventsDrawer(
			backgroundCanvasModel,
			canvasModel,
			chartModel,
			config,
			canvasBoundsContainer,
			eventsModel,
			this.eventsXAxisLabelFormatterProvider,
		);
		this.drawingManager.addDrawer(eventsDrawer, 'EVENTS');

		const eventsHitTestDrawer = new EventsHitTestDrawer(
			hitTestCanvasModel,
			chartModel,
			config,
			canvasBoundsContainer,
			eventsModel,
		);
		this.drawingManager.addDrawerBefore(eventsHitTestDrawer, 'HIT_TEST_EVENTS', 'HIT_TEST_DRAWINGS');
		cursorHandler.setCursorForCanvasEl(CanvasElement.EVENTS, config.components.events.cursor);
	}

	/**
	 * Sets the new event list.
	 * @param events
	 */
	public setEvents(events: EconomicEvent[]) {
		this.eventsModel.setEvents(events);
		this.canvasModel.fireDraw();
	}

	/**
	 * Changes the component visibility.
	 * @param visible
	 */
	public setVisible(visible: boolean) {
		this.config.components.events.visible = visible;
		this.canvasBoundsContainer.recalculateBounds();
		this.canvasModel.fireDraw();
	}

	/**
	 * Changes visibility for the specific event type.
	 * For example, to turn off dividends visibility you can call this method with { dividends: false } argument
	 */
	public setEventTypeVisible(eventsVisibility: Partial<Record<EventType, boolean>>) {
		merge(this.config.components.events.eventsVisibility, eventsVisibility, {
			overrideExisting: true,
			addIfMissing: false,
		});
		this.canvasModel.fireDraw();
	}

	/**
	 * Observes hovered event when mouse moves in, and provides null when mouse moves out.
	 */
	public observeEventHovered(): Observable<EventWithId | null> {
		return this.eventsModel.hoveredEvent.asObservable();
	}
}
