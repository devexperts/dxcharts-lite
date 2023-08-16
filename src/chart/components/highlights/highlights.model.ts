/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable } from 'rxjs/internal/Observable';
import { Subject } from 'rxjs';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ChartModel } from '../chart/chart.model';
import { getElementsInRange } from '../../utils/array.utils';

export type HighlightTextPlacement = 'left-left' | 'left-right' | 'right-left' | 'right-right';

export const HIGHLIGHTS_TYPES = ['AFTER_MARKET', 'PRE_MARKET', 'NO_TRADING', 'REGULAR'] as const;

export type HighlightType = typeof HIGHLIGHTS_TYPES[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export type VisualHighlights = Partial<Record<HighlightType, Highlight[]>>;
export interface Highlight {
	type: HighlightType;
	from: number;
	to: number;
	border?: HighlightBorder;
	label?: {
		text?: string;
		placement?: HighlightTextPlacement;
	};
}
export interface HighlightBorder {
	right?: boolean;
	left?: boolean;
}

export class HighlightsModel extends ChartBaseElement {
	private highlights: Highlight[] = [];
	private visualHighlights: VisualHighlights = {};
	private highlightsUpdatedSubject = new Subject<Highlight[]>();
	constructor(private chartModel: ChartModel) {
		super();
	}

	/**
	 * Activates the chart by subscribing to the xChanged event of the scaleModel.
	 * If there are highlights, it recalculates the visual highlights.
	 */
	activate() {
		this.addRxSubscription(
			this.chartModel.scaleModel.xChanged.subscribe(
				() => this.highlights.length && this.recalculateVisualHighlights(),
			),
		);
	}

	/**
	 * Returns an array of Highlight objects.
	 * @returns {Highlight[]} - An array of Highlight objects.
	 */
	public getHighlights(): Highlight[] {
		return this.highlights;
	}

	/**
	 * Returns the visual highlights object.
	 *
	 * @returns {VisualHighlights} The visual highlights object.
	 */
	public getVisualHighlights(): VisualHighlights {
		return this.visualHighlights;
	}

	/**
	 * Recalculates the visual highlights based on the current chart model and highlights.
	 * @private
	 * @returns {void}
	 */
	private recalculateVisualHighlights(): void {
		this.visualHighlights = {};
		const firstTimestamp = this.chartModel.getFirstTimestamp();
		const lastTimestamp = this.chartModel.getLastTimestamp() + DAY_MS;
		const highlightsInRange = getElementsInRange(
			this.highlights,
			firstTimestamp,
			lastTimestamp,
			highlightTransformFunc,
		);
		highlightsInRange.forEach(h => {
			if (!this.visualHighlights[h.type]) {
				this.visualHighlights[h.type] = [];
			}
			this.visualHighlights[h.type]?.push(h);
		});
	}

	/**
	 * Sets the highlights of the component and updates the visual highlights accordingly.
	 * @param {Highlight[]} highlights - An array of Highlight objects to be set as the new highlights.
	 * @returns {void}
	 */
	public setHighlights(highlights: Highlight[]): void {
		this.highlights = highlights;
		this.highlights.sort((a, b) => a.to - b.to);
		this.highlightsUpdatedSubject.next(this.highlights);
		this.highlights.length ? this.recalculateVisualHighlights() : (this.visualHighlights = {});
	}

	/**
	 * Returns an Observable that emits an array of Highlight objects whenever the highlightsUpdatedSubject emits a new value.
	 * @returns {Observable<Highlight[]>} An Observable that emits an array of Highlight objects.
	 */
	public observeHighlightsUpdated(): Observable<Highlight[]> {
		return this.highlightsUpdatedSubject.asObservable();
	}
}

const highlightTransformFunc = (item: Highlight): number => {
	return item.to;
};
