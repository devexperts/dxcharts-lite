/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Index, Unit, ViewportModel, ViewportModelState } from './viewport.model';

/**
 * Provides the high and low values. Used for series in auto-scale calculation.
 */
export interface HighLowProvider {
	isHighLowActive: () => boolean;
	/**
	 * Calculates the Y high and low.
	 * @param state - (optional) used to calculate over some state in future
	 */
	calculateHighLow: (state?: ViewportModelState) => HighLow;
}

export interface HighLow {
	high: Unit;
	low: Unit;
	highIdx?: Index;
	lowIdx?: Index;
}

type HighLowPostProcessor = (highLow: HighLow) => HighLow;

/**
 * Auxiliary sub-model to apply X,Y auto-scaling feature.
 * Transforms the original ViewportModel.
 * @doc-tags auto-scale,viewport,scaling
 */
export class AutoScaleViewportSubModel {
	// local state, used for pane X dragging
	auto: boolean = true;
	// providers of high-low extrems for viewport calculation
	highLowProviders: Record<string, HighLowProvider>;
	// post processors can apply some changes to high low before applying it
	highLowPostPorcessor: Record<string, HighLowPostProcessor> = {};

	constructor(private delegate: ViewportModel, highLowProviders?: Record<string, HighLowProvider>) {
		this.highLowProviders = highLowProviders ?? {};
	}

	/**
	 * Sets a HighLowProvider for a given name.
	 * @param {string} name - The name of the HighLowProvider.
	 * @param {HighLowProvider} provider - The HighLowProvider to be set.
	 */
	setHighLowProvider(name: string, provider: HighLowProvider) {
		this.highLowProviders[name] = provider;
	}

	/**
	 * Deletes a high-low provider from the list of high-low providers.
	 * @param {string} name - The name of the high-low provider to be deleted.
	 */
	deleteHighLowProvider(name: string) {
		delete this.highLowProviders[name];
	}

	/**
	 * Sets a HighLowPostProcessor for a given name.
	 *
	 * @param {string} name - The name of the HighLowPostProcessor.
	 * @param {HighLowPostProcessor} processor - The HighLowPostProcessor to be set.
	 * @returns {void}
	 */
	setHighLowPostProcessor(name: string, processor: HighLowPostProcessor) {
		this.highLowPostPorcessor[name] = processor;
	}

	/**
	 * Sets the auto and recalculates the state of the viewport model.
	 * @param {ViewportModelState} state - The state of the viewport model.
	 * @param {boolean} auto - The auto value to set.
	 * @returns {void}
	 */
	setAutoAndRecalculateState(state: ViewportModelState, auto: boolean) {
		this.auto = auto;
		if (auto) {
			autoScaleYViewportTransformer(
				this.delegate,
				state,
				Object.values(this.highLowProviders),
				Object.values(this.highLowPostPorcessor),
			);
		}
	}
}

/**
 * Y auto-scale viewport transformer. Calculates highLow for all chart visuals and recalculates the Y scale.
 * @param vm
 * @param state
 * @param highLowProviders
 * @param highLowPostProcessors
 */
export const autoScaleYViewportTransformer = (
	vm: ViewportModel,
	state: ViewportModelState,
	highLowProviders: HighLowProvider[],
	highLowPostProcessors: HighLowPostProcessor[],
) => {
	const highLowList = highLowProviders
		.filter(provider => provider.isHighLowActive())
		.map(provider => provider.calculateHighLow(state));
	const highLow = mergeHighLow(highLowList);
	const postProcessedHighLow = highLowPostProcessors.reduce(
		(prevResult, postProcessor) => postProcessor(prevResult),
		highLow,
	);

	state.yStart = postProcessedHighLow.low;
	state.yEnd = postProcessedHighLow.high;
	state.zoomY = vm.calculateZoomY(state.yStart, state.yEnd);
};

/**
 * Merges an array of HighLow objects into a single HighLow object.
 * @param {HighLow[]} input - The array of HighLow objects to be merged.
 * @returns {HighLow} - The merged HighLow object.
 
*/
export function mergeHighLow(input: HighLow[]): HighLow {
	if (input.length === 0) {
		return getDefaultHighLow();
	}

	let max: number = input[0].high;
	let min: number = input[0].low;

	input.forEach(highLow => {
		if (isFinite(highLow.high) && highLow.high >= max) {
			max = highLow.high;
		}
		if (isFinite(highLow.low) && highLow.low <= min) {
			min = highLow.low;
		}
	});

	return { low: min, high: max };
}

export const getDefaultHighLow = (): HighLow => {
	return {
		high: Number.MIN_SAFE_INTEGER,
		low: Number.MAX_SAFE_INTEGER,
	};
};
