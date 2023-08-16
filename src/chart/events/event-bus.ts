/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Observable, Subject } from 'rxjs';
import { arrayRemove } from '../utils/array.utils';
import { EVENT_DRAW, EVENT_RESIZED } from './events';

export interface EventBusFireAsync {
	(type: typeof EVENT_RESIZED, event?: ClientRect | DOMRect): number | void;
	(type: string, event?: string): number | void;
	(type: string, event?: string): number | void;
}

export interface EventBusFire {
	(type: typeof EVENT_RESIZED, event?: ClientRect | DOMRect): number | void;
	(type: string, ...args: unknown[]): void;
}

export interface EventBusOn {
	(type: typeof EVENT_RESIZED, fn: (bcr?: DOMRect) => void): () => void;
	(type: typeof EVENT_DRAW, fn: (canvasIds: Array<string>) => void): () => void;
	(type: string, fn: (...args: unknown[]) => void): () => void;
}

/**
 * Event bus for chart.
 * @doc-tags core-components
 */
export default class EventBus {
	private UNKNOWN_ARR: unknown[] = [];

	/** Registered event handlers. */
	private handlers: Partial<Record<string, ((...args: readonly unknown[]) => void)[]>> = {};

	/** State which can enable / disable events processing. */
	private muted = false;

	constructor() {}

	/**
	 * Triggers the draw event for the specified canvas IDs.
	 * @param {Array<string>} canvasIds - An optional array of canvas IDs to trigger the draw event for.
	 */
	fireDraw(canvasIds?: Array<string>) {
		this.fire(EVENT_DRAW, canvasIds);
	}

	unsub = (type: string, fn: (...args: any[]) => void) => {
		const handler = this.handlers[type];
		handler !== undefined && arrayRemove.call(handler, fn);
	};

	add = (method: (...args: unknown[]) => void, type: string, fn: (...args: any[]) => void) => {
		if (type in this.handlers) {
			method.call(this.handlers[type], fn);
		} else {
			this.handlers[type] = [fn];
		}
		return this.unsub.bind(this, type, fn);
	};

	on: EventBusOn = (type: string, fn: (...args: any[]) => void) => this.add(this.UNKNOWN_ARR.push, type, fn);

	observe = (type: string): Observable<any> => {
		const result = new Subject();
		const subjectFn = result.next.bind(result);
		const originalUnsubscribe = result.unsubscribe.bind(result);
		this.on(type, subjectFn);
		result.unsubscribe = () => {
			this.unsub(type, subjectFn);
			originalUnsubscribe();
		};

		return result.asObservable();
	};

	onPrior = (type: string, fn: (...args: any[]) => void) => this.add(this.UNKNOWN_ARR.unshift, type, fn);

	off = this.unsub;

	fire: EventBusFire = (type: string, ...args: any[]) => {
		if (!this.muted) {
			const arr = this.handlers[type] ?? [];
			let i;
			for (i = 0, arr.length; i < arr.length; i++) {
				// call each handler with arguments
				const fn = arr[i];
				fn.apply(null, args);
			}
		}
	};

	fireAsync: EventBusFireAsync = (type: string, event: unknown) => {
		if (!this.muted) {
			return window.setTimeout(this.fire.bind(this, type, event), 0);
		}
	};

	setMuted = (val: boolean) => {
		this.muted = val;
	};

	clear = () => {
		this.handlers = {};
	};
}
