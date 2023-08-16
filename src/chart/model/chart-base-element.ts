/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Subscription } from 'rxjs/internal/Subscription';
import { Unsubscriber } from '../utils/function.utils';

export type ChartEntityState = 'initial' | 'active' | 'deactivated' | 'disabled';

/**
 * Chart entity has the following lifecycle: initial -> active <=> deactivated -> disposed.
 * Methods of chart entity allows to transit entity between its states.
 */
export interface ChartEntity {
	/** Make entity active. Next allowed stated: deactivated,disposed */
	activate(): void;
	/** Make entity inactive. Next allowed states: active,disposed. */
	deactivate(): void;
	/** Make entity disabled & inactive, cannot activate it */
	disable(): void;
	/** Make entity enabled & active */
	enable(): void;
	/** Get current state of chart entity */
	getState(): ChartEntityState;
}

/**
 * Base class for chart elements. Contains lifecycle support, utility methods.
 *
 * Chart entity state transition: INITIAL -> ACTIVE <-> DEACTIVATED -> DISPOSED
 */
export abstract class ChartBaseElement implements ChartEntity {
	private subscriptions: Array<() => void> = [];
	private _state: ChartEntityState = 'initial';
	// substitute entities which cascade activate/deactivate
	private entities: Array<ChartEntity> = [];

	/**
	 * This method is used to activate a protected feature.
	 * It does not take any arguments and does not return anything.
	 */
	protected doActivate(): void {}

	/**
	 * This method is used to unsubscribe from all events.
	 * It clears the subscriptions array.
	 * @returns {void}
	 */
	protected doDeactivate(): void {
		// Unsubscribe from all events
		this.subscriptions.forEach(unsub => unsub());
		this.subscriptions = [];
	}

	/**
	 * Enables the functionality of an object.
	 * If the object is not currently active, it sets the state to 'deactivated' and activates it.
	 * @returns {void}
	 */
	enable(): void {
		if (this._state !== 'active') {
			this._state = 'deactivated';
			this.activate();
		}
	}

	/**
	 * Disables the current object if it is not already disabled.
	 * If the object is not disabled, it will be deactivated and its state will be set to 'disabled'.
	 * @returns {void}
	 */
	disable(): void {
		if (this._state !== 'disabled') {
			this.deactivate();
			this._state = 'disabled';
		}
	}

	/**
	 * Activates the entity and all its child entities.
	 * If the entity is already active, it does nothing.
	 * If the entity is disabled, it does nothing.
	 * @returns {void}
	 */
	activate(): void {
		if (this._state === 'disabled') {
			return;
		}
		if (this._state !== 'active') {
			this.doActivate();
			this._state = 'active';
		}
		this.entities.forEach(comp => comp.activate());
	}

	/**
	 * Deactivates the entity and all its child entities.
	 * If the entity is already disabled, it does nothing.
	 * If the entity is not yet deactivated, it calls the doDeactivate method and sets the state to 'deactivated'.
	 * Finally, it deactivates all child entities.
	 * @returns {void}
	 */
	deactivate(): void {
		if (this._state === 'disabled') {
			return;
		}
		if (this._state !== 'deactivated') {
			this.doDeactivate();
			this._state = 'deactivated';
		}
		this.entities.forEach(comp => comp.deactivate());
	}

	/**
	 * Returns the current state of the ChartEnitity instance.
	 * @returns {ChartEntityState} The current state of the ChartEnitity instance.
	 */
	getState(): ChartEntityState {
		return this._state;
	}

	/**
	 * Adds default subscription
	 * @param fn - an unsubscriber function
	 * @protected
	 */
	public addSubscription(fn: Unsubscriber) {
		this.subscriptions.push(fn);
	}

	/**
	 * Adds rxjs subscription
	 * @param subscription
	 * @protected
	 */
	protected addRxSubscription(subscription?: Subscription) {
		if (subscription) {
			this.subscriptions.push(subscription.unsubscribe.bind(subscription));
		}
	}

	/**
	 * Adds a new entity to the entities array and activates it if the parent entity is active.
	 *
	 * @param {Entity} entity - The entity to be added to the entities array.
	 * @returns {void}
	 */
	addChildEntity(entity: ChartEntity) {
		this.entities.push(entity);
		if (this._state === 'active') {
			entity.activate();
		}
	}

	/**
	 * Removes a entity from the entities array.
	 *
	 * @param {ChartEntity} entity - The entity to be removed.
	 * @returns {void}
	 */
	removeChildEntity(entity: ChartEntity) {
		this.entities = this.entities.filter(c => c !== entity);
	}
}
