/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Drawer } from './drawing-manager';
import { findKeyFromValue } from '../utils/object.utils';
import { flat } from '../utils/array.utils';

/**
 * Container for grouping multiple drawers.
 * Try to keep simple, not overkill with sorting.
 */
export class CompositeDrawer<D extends Drawer = Drawer> implements Drawer {
	private readonly drawers: Map<string, D>;
	constructor(drawers?: Map<string, D>) {
		this.drawers = drawers ?? new Map();
	}

	draw(): void {
		this.drawers.forEach(d => d.draw());
	}

	addDrawer(drawer: D, drawerName?: string) {
		const name = drawerName ?? 'drawer' + this.drawers.size;
		this.drawers.set(name, drawer);
	}

	// TODO rework, move to specific candle composite drawer maybe
	drawLastBar() {
		this.drawers.forEach(d => d.drawLastBar && d.drawLastBar());
	}

	removeDrawer(drawer: D) {
		const name = findKeyFromValue(this.drawers, drawer);
		if (name) {
			this.drawers.delete(name);
		} else {
			console.warn(`Couldn't find drawer type`);
		}
	}

	removeDrawerByName(drawerName: string) {
		this.drawers.delete(drawerName);
	}

	getDrawer(drawerName: string): D | undefined {
		return this.drawers.get(drawerName);
	}

	moveTop(drawer: D) {
		const name = findKeyFromValue(this.drawers, drawer);
		if (name) {
			this.moveTopByName(name);
		} else {
			console.warn(`Couldn't find drawer type`);
		}
	}

	moveTopByName(drawerName: string) {
		if (this.drawers.size === 1) {
			return;
		}
		const drawerInMap = this.drawers.get(drawerName);
		this.drawers.delete(drawerName);
		if (drawerInMap) {
			this.drawers.set(drawerName, drawerInMap);
		}
	}

	getSize() {
		return this.drawers.size;
	}

	getAll() {
		return this.drawers;
	}

	getCanvasIds(): Array<string> {
		const canvasIds = flat(Array.from(this.drawers).map(([, d]) => d.getCanvasIds()));
		const distinctedCanvasIds = new Set([...canvasIds]);
		return Array.from(distinctedCanvasIds);
	}
}
