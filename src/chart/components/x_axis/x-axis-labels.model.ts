/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { ChartBaseElement } from '../../model/chart-base-element';
import EventBus from '../../events/event-bus';
import { LabelAlign } from './x-axis-draw.functions';
import { EVENT_DRAW } from '../../events/events';
import { uuid } from '../../utils/uuid.utils';

export interface XAxisLabel {
	text: string;
	x: number;
	color: string;
	alignType?: LabelAlign;
	subGroupId?: number;
}

/***
 * If you want to define a new Labels Provider for X Axis, you must extend this interface.
 */
export interface XAxisLabelsProvider {
	readonly getUnorderedLabels: () => XAxisLabel[];
}

/**
 * Custom labels on X axis.
 */
export class XAxisLabelsModel extends ChartBaseElement {
	private _labels: XAxisLabel[] = [];
	private labelProviders: Map<string, XAxisLabelsProvider> = new Map();

	constructor(public eventBus: EventBus) {
		super();
	}

	protected doActivate(): void {
		super.doActivate();
		this.initModel();
		/**
		 * TODO refactor this, should NOT be recalculated on each DRAW, rather coordinates should be updated in drawer
		 * @doc-tags refactor
		 */
		this.addSubscription(this.eventBus.on(EVENT_DRAW, () => this.recalculateLabels()));
	}

	get labels(): XAxisLabel[] {
		return this._labels;
	}

	/**
	 * Registers a new label provider.
	 * @param {XAxisLabelsProvider} provider
	 * @param {string} id
	 * @returns {string}
	 */
	public registerLabelProvider(provider: XAxisLabelsProvider, id: string = uuid()): string {
		this.labelProviders.set(id, provider);
		this.initModel();

		return id;
	}

	/**
	 * Unregisters a label provider.
	 * @param {string} id
	 * @returns {void}
	 */
	public unregisterLabelProvider(id: string): void {
		this.labelProviders.delete(id);
		this.initModel();
	}

	/**
	 * Initializes the model by recalculating the labels.
	 */
	private initModel() {
		this.recalculateLabels();
	}

	/**
	 * Recalculates the labels by clearing the existing labels and adding new labels from the label providers.
	 * @returns {void}
	 */
	public recalculateLabels(): void {
		this._labels = [];
		for (const [, provider] of this.labelProviders) {
			this.labels.push(...provider.getUnorderedLabels());
		}
	}
}
