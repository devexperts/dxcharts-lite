/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { merge, Observable, Subject } from 'rxjs';
import { CanvasBoundsContainer, CanvasElement, CHART_UUID } from '../../../canvas/canvas-bounds-container';
import { ChartConfigComponentsYAxis, FullChartConfig, YAxisLabelMode } from '../../../chart.config';
import EventBus from '../../../events/event-bus';
import { Bounds } from '../../../model/bounds.model';
import { CanvasModel } from '../../../model/canvas.model';
import { ChartBaseElement } from '../../../model/chart-base-element';
import { Unit } from '../../../model/scaling/viewport.model';
import { animationFrameThrottledPrior } from '../../../utils/perfomance/request-animation-frame-throttle.utils';
import { uuid } from '../../../utils/uuid.utils';
import { ChartModel } from '../../chart/chart.model';
import { YAxisLabelDrawConfig } from '../y-axis-labels.drawer';
import { calcLabelsYCoordinates } from './labels-positions-calculator';
import { flat } from '../../../utils/array.utils';

export type YAxisVisualLabelType = 'badge' | 'rectangle' | 'plain';

export interface VisualYAxisLabel extends YAxisLabelDrawConfig {
	// this property is used for y label and line by default, if two labels intersects
	// the Y will be recalculated to fill available space
	y: Unit;
	labelText: string;
	mode?: YAxisLabelMode;
	labelType?: YAxisVisualLabelType;
	// this prop is used to specify y line position for label overriding Y recalculation algorithm
	lineY?: number;
	// we may have a lot labels with the same value and we have several cases
	// when we need to define the order of the labels, that's why the labelWeight was introduced.
	// If you're not sure about label weight just set Number.POSITIVE_INFINITY,
	labelWeight?: number;
	description?: string;
	subGroupId?: number; // used to identify linked labels
}

export interface LabelGroup {
	labels: VisualYAxisLabel[];
	bounds?: Bounds;
	axisState?: ChartConfigComponentsYAxis;
}

export type ProviderGroups = Record<string, YAxisLabelsProvider[]>;

export const LabelsGroups = {
	MAIN: 'MAIN',
} as const;

/**
 * Different labels on Y axis:
 * - last candle price
 * - bid/ask
 * - countdown
 * - prev.day price
 * - high low in viewport
 * - drawings
 * - studies
 * - ...
 * Anything but the base labels which are generated in other component {@link YAxisBaseLabelsModel}
 */
export class YAxisLabelsModel extends ChartBaseElement {
	public orderedLabels: LabelGroup[] = [];
	/**
	 * an easier way to manage custom y-axis labels, than y-axis labels providers, but doesn't support overlapping avoidance
	 */
	public readonly customLabels: Record<string, VisualYAxisLabel> = {};
	private labelsProviders: Record<string, Record<string, YAxisLabelsProvider>> = {};
	private labelsPositionRecalculatedSubject: Subject<void> = new Subject();
	private animFrameId = `anim_cache_${uuid()}`;

	constructor(
		public eventBus: EventBus,
		private chartModel: ChartModel,
		private canvasBoundsContainer: CanvasBoundsContainer,
		private config: FullChartConfig,
		private canvasModel: CanvasModel,
		private updateYAxisWidth: () => void,
	) {
		super();
		this.initModel();
	}

	/**
	 * This method is used to activate the chart and subscribe to the observables that will trigger the update of the labels.
	 * It calls the parent method doActivate() and adds a new Rx subscription to the merge of the following observables:
	 * - chartModel.observeCandlesChanged()
	 * - canvasBoundsContainer.observeBoundsChanged(CanvasElement.CHART)
	 * - chartModel.nextCandleTimeStampSubject
	 * - canvasBoundsContainer.barResizerChangedSubject
	 * - chartModel.scaleModel.changed
	 * When any of these observables emit a new value, the updateLabels() method is called.
	 * @protected
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			merge(
				this.chartModel.observeCandlesChanged(),
				this.canvasBoundsContainer.observeBoundsChanged(CanvasElement.PANE_UUID(CHART_UUID)),
				this.chartModel.nextCandleTimeStampSubject,
				this.canvasBoundsContainer.barResizerChangedSubject,
				this.chartModel.scaleModel.changed,
			).subscribe(() => {
				this.updateLabels();
			}),
		);
	}

	/**
	 * Initializes the model by calling the methods to initialize the label groups and recalculate the labels.
	 * Then, it fires the draw event on the canvas model.
	 * @private
	 */
	private initModel() {
		this.initLabelsGroups();
		this.recalculateLabels();
		this.canvasModel.fireDraw();
	}

	/**
	 * Initializes the labels groups.
	 * If there are labels providers, it creates a group for each one and adds the providers to their respective groups.
	 * @returns {void}
	 */
	private initLabelsGroups(): void {
		if (Object.keys(this.labelsProviders).length !== 0) {
			for (const groupName of Object.keys(this.labelsProviders)) {
				this.createGroup(groupName);
				Object.entries(this.labelsProviders[groupName]).forEach(([id, provider]) => {
					this.addToGroup(provider, groupName, id);
				});
			}
		}
	}

	/**
	 * Updates YAxis ordered labels.
	 * @param adjustYAxisWidth - provide "true", if you need to adjust width after new labels will be calculated.
	 */
	public updateLabels(adjustYAxisWidth: boolean = false) {
		// Updating labels is an expensive operation, and depends on chart data.
		// Animation frame is needed here, because recalculation can be proceeded while rendering, and make render process fregmented.
		this.recalculateLabels();
		animationFrameThrottledPrior(this.animFrameId, () => {
			adjustYAxisWidth && this.updateYAxisWidth();
			this.canvasModel.fireDraw();
		});
	}

	/**
	 * Recalculates the labels based on the current configuration and label providers.
	 * It generates label groups and calculates their coordinates based on their weight and the label height.
	 * The coordinates are generated in the order they were passed to the generator.
	 * The ordered labels are then updated with the new coordinates and reversed.
	 * @returns {void}
	 */
	public recalculateLabels(): void {
		this.orderedLabels = [];
		const labelHeight =
			this.config.components.yAxis.fontSize +
			(this.config.components.yAxis.labelBoxMargin.top ?? 0) +
			(this.config.components.yAxis.labelBoxMargin.bottom ?? 0);

		for (const providers of Object.values(this.labelsProviders)) {
			// generated label groups
			const labelGroups = flat(Object.values(providers).map(c => c.getUnorderedLabels()));
			const labelsPointsAndWeight = flat(labelGroups.map(g => g.labels)).map(label => ({
				y: label.y,
				weight: label.labelWeight ?? Number.POSITIVE_INFINITY,
			}));
			// coordinates are generated in order they were passed to generator
			const updatedCoordinates = calcLabelsYCoordinates(labelsPointsAndWeight, labelHeight);
			labelGroups.forEach(labelGroup => {
				const points = updatedCoordinates.splice(0, labelGroup.labels.length);
				this.orderedLabels.push(this.updateLabelsCoordinates(labelGroup, points));
			});
		}
		this.orderedLabels = this.orderedLabels.reverse();
	}
	/**
	 * Creates a new group with the given name if it doesn't exist yet.
	 * @param {string} groupName - The name of the group to be created.
	 * @returns {void}
	 */
	private createGroup(groupName: string): void {
		!this.labelsProviders[groupName] && (this.labelsProviders[groupName] = {});
	}
	/**
	 * Adds a YAxisLabelsProvider component to a group.
	 *
	 * @param {YAxisLabelsProvider} component - The component to add to the group.
	 * @param {string} groupName - The name of the group to add the component to.
	 * @param {string} id - The id of the component to add to the group.
	 * @returns {void}
	 */
	private addToGroup(component: YAxisLabelsProvider, groupName: string, id: string): void {
		if (this.labelsProviders[groupName]) {
			if (!Object.values(this.labelsProviders[groupName]).includes(component)) {
				this.labelsProviders[groupName][id] = component;
			}
		}
	}

	/**
	 * Updates the coordinates of the labels in a LabelGroup object based on an array of points.
	 * @param {LabelGroup} labels - The LabelGroup object containing the labels to be updated.
	 * @param {number[]} points - An array of points to be used to update the y-coordinate of each label.
	 * @returns {LabelGroup} - A new LabelGroup object with updated label coordinates.
	 */
	private updateLabelsCoordinates(labels: LabelGroup, points: number[]): LabelGroup {
		return {
			...labels,
			labels: labels.labels.map((label, idx) => ({
				...label,
				// save original y
				lineY: label.y,
				y: points[idx],
			})),
		};
	}

	/**
	 * Returns an Observable that emits a void value whenever the labels position is recalculated.
	 * The Observable is created from the labelsPositionRecalculatedSubject Subject.
	 * @returns {Observable<void>} An Observable that emits a void value whenever the labels position is recalculated.
	 */
	public observeLabelsPositionsRecalculated(): Observable<void> {
		return this.labelsPositionRecalculatedSubject.asObservable();
	}

	/**
	 * Registers a Y axis labels provider for a given group name and ID.
	 *
	 * @param {string} groupName - The name of the group to which the provider belongs.
	 * @param {YAxisLabelsProvider} provider - The provider to be registered.
	 * @param {string} id - The ID of the provider to be registered.
	 * @returns {void}
	 */
	public registerYAxisLabelsProvider(groupName: string, provider: YAxisLabelsProvider, id: string) {
		const providers = this.labelsProviders[groupName] ?? {};
		providers[id] = provider;
		this.labelsProviders[groupName] = providers;
		this.initModel();
	}

	/**
	 * Unregisters a Y axis labels provider.
	 *
	 * @param {string} groupName - The name of the group to which the provider belongs.
	 * @param {string} id - The ID of the provider to unregister.
	 *
	 * @returns {void}
	 */
	public unregisterYAxisLabelsProvider(groupName: string, id: string) {
		const providers = this.labelsProviders[groupName] ?? {};
		delete providers[id];

		// if group is empty, delete it too
		if (this.labelsProviders[groupName] && Object.keys(this.labelsProviders[groupName]).length === 0) {
			delete this.labelsProviders[groupName];
		}
		this.initModel();
	}
}

/**
 * YAxisLabelsProvider interface used to write price labels providers
 * for YAxisLabelsModel.
 * Under the hood, YAxisLabelsModel calls Provider.getUnorderedLabels method
 * on each provider, and generates Y coordinates for each label
 * according to non-overlapping condition
 * Then, with the info which was got from the Providers and Y coordinates
 * follows the draw cycle of labels
 */
export interface YAxisLabelsProvider {
	readonly getUnorderedLabels: () => LabelGroup[];
}
