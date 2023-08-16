/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import EventBus from './events/event-bus';
import { FullChartConfig } from './chart.config';
import { CanvasInputListenerComponent } from './inputlisteners/canvas-input-listener.component';
import { CanvasBoundsContainer } from './canvas/canvas-bounds-container';

/**
 * Abstraction over ChartBootstrap and PL chart.
 */
export default interface ChartContainer {
	bus: EventBus;
	config: FullChartConfig;
	canvasInputListener: CanvasInputListenerComponent;
	canvasBoundsContainer: CanvasBoundsContainer;
}
