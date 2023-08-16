/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { FullChartConfig } from '../../chart.config';
import EventBus from '../../events/event-bus';
import { CanvasModel } from '../../model/canvas.model';
import { ScaleModel } from '../../model/scale.model';
import { Timestamp, unitToPixels } from '../../model/scaling/viewport.model';
import { TimeZoneModel } from '../../model/time-zone.model';
import VisualCandle from '../../model/visual-candle';
import { cloneUnsafe, typedEntries_UNSAFE } from '../../utils/object.utils';
import { ChartModel } from '../chart/chart.model';
import { fakeVisualCandle } from '../chart/fake-candles';
import { NumericAxisLabel } from '../labels_generator/numeric-axis-labels.generator';
import { TimeFormatMatcher } from './time/parser/time-formats-matchers.functions';
import { parseTimeFormatsFromKey } from './time/parser/time-formats-parser.functions';
import { TimeFormatWithDuration } from './time/parser/time-formats.model';
import {
	filterMapGroupedLabelsByCoverUpLevel,
	getWeightFromTimeFormat,
	groupLabelsByWeight,
	overlappingPredicate,
} from './time/x-axis-weights.functions';
import {
	WeightedPoint,
	generateWeightsMapForConfig,
	mapCandlesToWeightedPoints,
} from './time/x-axis-weights.generator';

export interface XAxisLabelsGenerator {
	/**
	 * Generates x-axis labels from scratch. Heavy operation.
	 */
	generateLabels(): void;
	/**
	 * Updates current labels state (x-position). Lightweight operation.
	 */
	recalculateLabels(): void;

	labels: NumericAxisLabel[];
	/**
	 * Updates new appeared candle's label
	 */
	updateLastLabel?(candle: VisualCandle): void;

	/**
	 * Updates history candle's labels
	 */
	updateHistoryLabels?(candles: VisualCandle[]): void;
}

/**
 * Model for base labels on X axis.
 * Generates and stored the time labels.
 */
export interface XAxisLabelWeighted extends NumericAxisLabel {
	// timestamp: 1401203921
	time: Timestamp;
	weight: number;
	idx: number;
}

type FilterFunction = (coverUpLevel: number) => boolean;

export class XAxisTimeLabelsGenerator implements XAxisLabelsGenerator {
	private labelsGroupedByWeight: Record<number, XAxisLabelWeighted[]> = {};
	private weightedCache?: { labels: XAxisLabelWeighted[]; coverUpLevel: number };
	private levelsCache: Record<number, XAxisLabelWeighted[]> = {};

	get labels(): XAxisLabelWeighted[] {
		return this.getLabelsFromChartType();
	}

	private formatsByWeightMap: Record<TimeFormatWithDuration, string>;

	private weightToTimeFormatMatcherArray: [number, TimeFormatMatcher][] = [];
	private weightToTimeFormatsDict: Record<number, string> = {};

	private extendedLabelsFilterConfig: Partial<Record<TimeFormatWithDuration, FilterFunction>> = {
		minute_1: (coverUpLevel: number) => coverUpLevel >= 2,
	};

	constructor(
		private eventBus: EventBus,
		private config: FullChartConfig,
		private chartModel: ChartModel,
		private scaleModel: ScaleModel,
		private timeZoneModel: TimeZoneModel,
		private canvasModel: CanvasModel,
	) {
		this.formatsByWeightMap = config.components.xAxis.formatsForLabelsConfig;
		const { weightToTimeFormatsDict, weightToTimeFormatMatcherDict } = generateWeightsMapForConfig(
			this.formatsByWeightMap,
		);
		this.weightToTimeFormatMatcherArray = Object.entries(weightToTimeFormatMatcherDict)
			.map<[number, TimeFormatMatcher]>(([k, v]) => [parseInt(k, 10), v])
			.sort(([a], [b]) => b - a);
		this.weightToTimeFormatsDict = weightToTimeFormatsDict;
	}

	private getLabelsFromChartType() {
		const labels = this.weightedCache?.labels ?? [];
		//@ts-ignore
		if (this.config.components.chart.type === 'equivolume') {
			return this.postProcessing(labels);
		} else {
			return labels;
		}
	}

	/**
	 * Make a prediction(750) about how many candles we need to fake to fill all X axis by labels
	 */
	private getAllCandlesWithFake() {
		const visualCandles = this.chartModel.mainCandleSeries.visualPoints;
		if (visualCandles.length === 0) {
			return [];
		}
		const fakeCandlesForSides = Array.from({ length: 750 });
		const appendFakeCandle = fakeCandlesForSides.map((_, idx) =>
			fakeVisualCandle(
				this.chartModel.mainCandleSeries.dataPoints,
				this.chartModel.mainCandleSeries.visualPoints,
				this.chartModel.mainCandleSeries.meanCandleWidth,
				visualCandles.length + idx,
				this.chartModel.getPeriod(),
			),
		);

		return [...visualCandles, ...appendFakeCandle];
	}

	/**
	 * Maps an array of weighted points to an array of XAxisLabelWeighted objects.
	 * @param {WeightedPoint[]} weightedPoints - An array of weighted points to be mapped.
	 * @param {VisualCandle[]} allCandlesWithFake - An array of visual candles to be used for formatting the labels.
	 * @returns {XAxisLabelWeighted[]} An array of XAxisLabelWeighted objects.
	 */
	private mapWeightedPointsToLabels(
		weightedPoints: WeightedPoint[],
		allCandlesWithFake: VisualCandle[],
	): XAxisLabelWeighted[] {
		const arr = new Array(weightedPoints.length);
		weightedPoints.forEach((point, index) => {
			const visualCandle = allCandlesWithFake[index];
			const labelFormat = this.weightToTimeFormatsDict[point.weight];
			const formattedLabel = this.timeZoneModel.getDateTimeFormatter(labelFormat)(visualCandle.candle.timestamp);

			arr[index] = {
				weight: point.weight,
				idx: visualCandle.candle.idx ?? 0,
				value: visualCandle.centerUnit,
				time: visualCandle.candle.timestamp,
				text: formattedLabel,
			};
		});
		return arr;
	}

	/**
	 * Sets the formats for labels configuration.
	 * @param {Record<TimeFormatWithDuration, string>} newFormatsByWeightMap - The new formats by weight map.
	 * @returns {void}
	 */
	public setFormatsForLabelsConfig(newFormatsByWeightMap: Record<TimeFormatWithDuration, string>) {
		const { weightToTimeFormatsDict, weightToTimeFormatMatcherDict } =
			generateWeightsMapForConfig(newFormatsByWeightMap);
		this.formatsByWeightMap = newFormatsByWeightMap;

		this.weightToTimeFormatMatcherArray = Object.entries(weightToTimeFormatMatcherDict)
			.map<[number, TimeFormatMatcher]>(([k, v]) => [parseInt(k, 10), v])
			.sort(([a], [b]) => b - a);
		this.weightToTimeFormatsDict = weightToTimeFormatsDict;
		this.generateWeightedLabels();
	}

	/**
	 * Generates weighted labels based on allCandlesWithFake, weightToTimeFormatMatcherDict and timeZoneModel.
	 * @private
	 * @function
	 * @returns {void}
	 */
	private generateWeightedLabels() {
		const allCandlesWithFake = this.getAllCandlesWithFake();
		const weightedPoints = mapCandlesToWeightedPoints(
			allCandlesWithFake,
			this.weightToTimeFormatMatcherArray,
			this.timeZoneModel.tzOffset(this.config.timezone),
		);
		const weightedLabels = this.mapWeightedPointsToLabels(weightedPoints, allCandlesWithFake);
		this.labelsGroupedByWeight = groupLabelsByWeight(weightedLabels);
		this.weightedCache = undefined;
		this.levelsCache = {};
		this.recalculateCachedLabels();
	}

	/**
	 * Retrieves the labels from the cache for a given coverUpLevel.
	 * @param {number} coverUpLevel - The coverUpLevel to retrieve the labels from the cache.
	 * @returns {Array<string>|undefined} - The labels for the given coverUpLevel if they exist in the cache, otherwise undefined.
	 */
	private getLabelsFromCache(coverUpLevel: number) {
		if (this.levelsCache[coverUpLevel]) {
			return this.levelsCache[coverUpLevel];
		}
		return undefined;
	}

	/**
	 * Updates label of new appeared candle
	 * @param {VisualCandle} candle - new updated candle
	 * @returns {void}
	 */
	public updateLastLabel(candle: VisualCandle) {
		const prevCandle =
			this.chartModel.mainCandleSeries.visualPoints[this.chartModel.mainCandleSeries.visualPoints.length - 2];
		if (prevCandle) {
			const newCandleWithprevious = [prevCandle, candle];

			const weightedPoints = mapCandlesToWeightedPoints(
				newCandleWithprevious,
				this.weightToTimeFormatMatcherArray,
				this.timeZoneModel.tzOffset(this.config.timezone),
			);
			const weightedLabels = this.mapWeightedPointsToLabels([weightedPoints[1]], [candle]);
			const [newWeightedLabel] = weightedLabels;

			this.labelsGroupedByWeight = Object.entries(this.labelsGroupedByWeight).reduce<
				Record<string, XAxisLabelWeighted[]>
			>((acc, [weight, labels]) => {
				const isLabelFoundHere = labels.findIndex(item => item.idx === newWeightedLabel.idx);
				let filteredLabels = labels;
				// we need to check it bsc the array from which we delete and the array into which we insert the value will most likely not be the same array
				if (isLabelFoundHere !== -1) {
					filteredLabels = labels.filter(item => item.idx !== newWeightedLabel.idx);
				}
				if (parseInt(weight, 10) === newWeightedLabel.weight) {
					const idx = filteredLabels.findIndex(item => item.idx > newWeightedLabel.idx);

					if (idx !== -1) {
						filteredLabels = [
							...filteredLabels.slice(0, idx),
							newWeightedLabel,
							...filteredLabels.slice(idx),
						];
					} else {
						filteredLabels.push(newWeightedLabel);
					}
				}

				acc[weight] = filteredLabels;
				return acc;
			}, {});

			this.weightedCache = undefined;
			this.levelsCache = {};
			this.recalculateCachedLabels();
		}
	}

	/**
	 * Creates labels for history candles and merge it with existing
	 * @param {VisualCandle} candle - new history candles
	 * @returns {void}
	 */
	public updateHistoryLabels(candles: VisualCandle[]) {
		const candlesPlusOne = candles.concat(this.chartModel.mainCandleSeries.visualPoints[candles.length]);
		const weightedPoints = mapCandlesToWeightedPoints(
			candlesPlusOne,
			this.weightToTimeFormatMatcherArray,
			this.timeZoneModel.tzOffset(this.config.timezone),
		);
		const weightedLabels = this.mapWeightedPointsToLabels(weightedPoints, candlesPlusOne);
		const historyLabelsByWeight = groupLabelsByWeight(weightedLabels);

		const copyOfNewGroupedLabels = cloneUnsafe(historyLabelsByWeight);
		for (const weight in this.labelsGroupedByWeight) {
			if (copyOfNewGroupedLabels[weight] === undefined) {
				copyOfNewGroupedLabels[weight] = this.labelsGroupedByWeight[weight];
			}
		}
		const lastCandle = this.chartModel.mainCandleSeries.visualPoints[candles.length - 1];
		const allLabelsByWeight = Object.entries(copyOfNewGroupedLabels)
			.sort(([a], [b]) => parseInt(b, 10) - parseInt(a, 10))
			.reduce<Record<string, XAxisLabelWeighted[]>>((acc, [weight, labels]) => {
				const parsedWeight = parseInt(weight, 10);
				const existingLabels = this.labelsGroupedByWeight[parsedWeight];
				if (parsedWeight === this.weightToTimeFormatMatcherArray[0][0]) {
					//we need to delete last label in old labels array
					// this is label from the array with biggest weight, so that's why we use sorting
					existingLabels.shift();
				}

				if (existingLabels) {
					const restLabels = existingLabels.map(label => {
						label.idx = label.idx + candles.length;
						label.value = lastCandle.startUnit + lastCandle.width + label.value;
						return label;
					});

					if (historyLabelsByWeight[parsedWeight]) {
						acc[weight] = labels.concat(restLabels);
					} else {
						acc[weight] = restLabels;
					}
				} else {
					acc[weight] = labels;
				}
				return acc;
			}, {});

		this.labelsGroupedByWeight = allLabelsByWeight;
		this.weightedCache = undefined;
		this.levelsCache = {};
		this.recalculateCachedLabels();
	}

	/**
	 * Calls the method generateWeightedLabels to generate labels.
	 * @returns {void}
	 */
	public generateLabels(): void {
		this.generateWeightedLabels();
	}

	/**
	 * Recalculates the labels by calling the method recalculateCachedLabels.
	 * @returns {void}
	 */
	public recalculateLabels(): void {
		this.recalculateCachedLabels();
	}

	/**
	 * Recalculates cached labels based on the current configuration and zoom level.
	 * If there are no grouped labels, the cache is not set.
	 * Calculates the maximum label width based on the font size and the maximum format length.
	 * Calculates the cover up level based on the maximum label width and the mean candle width.
	 * If the cover up level is negative, the cache is not updated.
	 * If the cover up level has not changed, the cached labels are returned.
	 * Otherwise, the labels are filtered by extended rules and grouped by cover up level.
	 * The filtered labels are then cached and returned.
	 */
	private recalculateCachedLabels() {
		// skip cache setting if we don't have grouped labels
		if (Object.getOwnPropertyNames(this.labelsGroupedByWeight).length === 0) {
			return;
		}

		const fontSize = this.config.components.xAxis.fontSize;
		const maxFormatLength = Object.values(this.formatsByWeightMap).reduce((max, item) => {
			return Math.max(item.length, max);
		}, 1);
		const maxLabelWidth = fontSize * maxFormatLength;
		const meanCandleWidthPx = unitToPixels(this.chartModel.mainCandleSeries.meanCandleWidth, this.scaleModel.zoomX);

		const coverUpLevel = Math.round(maxLabelWidth / meanCandleWidthPx);

		// for some reason sometimes `this.scaleModel.zoomX` is negative so we dont want to update labels
		if (coverUpLevel < 0 && !isFinite(meanCandleWidthPx)) {
			return;
		}

		if (this.weightedCache === undefined || coverUpLevel !== this.weightedCache.coverUpLevel) {
			const labelsFromCache = this.getLabelsFromCache(coverUpLevel);
			if (labelsFromCache) {
				this.weightedCache = {
					labels: labelsFromCache,
					coverUpLevel,
				};
				return;
			}

			const labelsToCache = filterMapGroupedLabelsByCoverUpLevel(
				this.filterLabelsByExtendedRules(this.labelsGroupedByWeight, coverUpLevel),
				coverUpLevel,
			);
			this.levelsCache[coverUpLevel] = labelsToCache;
			this.weightedCache = {
				labels: labelsToCache,
				coverUpLevel,
			};
			this.eventBus.fireDraw();
		}
	}

	/**
	 * Post filtering for equivolume case
	 * {@link overlappingPredicate} is used
	 * @param {XAxisLabelWeighted[]} labels - array of labels filtered by weights algorithm
	 * @returns {XAxisLabelWeighted[]} - array of filtered labels by overlaping predicate
	 */
	private postProcessing(labels: XAxisLabelWeighted[]) {
		const filteredLabels = [];
		// tricky double-iterator to check multiple consequent overlapping labels
		let i = 0;
		let j = 1;
		while (j <= labels.length - 1) {
			const label = labels[i];
			const nextLabel = labels[j];

			const overlappingCondition = overlappingPredicate(
				this.canvasModel.ctx,
				this.config,
				label,
				nextLabel,
				this.scaleModel,
				30,
			);
			if (overlappingCondition) {
				if ((nextLabel.weight ?? 0) > (label.weight ?? 0)) {
					i = j;
				}
			} else {
				filteredLabels.push(label);
				i = j;
				if (j === labels.length - 1) {
					filteredLabels.push(nextLabel);
				}
			}
			j++;
		}
		return filteredLabels;
	}

	/**
	 * Filters the labels by extended rules.
	 * @private
	 *
	 * @param {Record<number, XAxisLabelWeighted[]>} labelsGroupedByWeight - Object containing the labels grouped by weight.
	 * @param {number} coverUpLevel - The cover up level.
	 *
	 * @returns {Record<number, XAxisLabelWeighted[]>} - Object containing the filtered labels grouped by weight.
	 */
	private filterLabelsByExtendedRules(
		labelsGroupedByWeight: Record<number, XAxisLabelWeighted[]>,
		coverUpLevel: number,
	) {
		// transform {minute_1: () => boolean} to {215: () => boolean}
		const mappedExtendedFilterConfig = typedEntries_UNSAFE(this.extendedLabelsFilterConfig).reduce<
			Record<number, FilterFunction>
		>((acc, item) => {
			if (!item) {
				return acc;
			}
			const [timeFormat, filterFn] = item;
			if (filterFn) {
				const parsedTimeFormat = parseTimeFormatsFromKey(timeFormat);
				if (parsedTimeFormat) {
					const weightFromValue = getWeightFromTimeFormat(parsedTimeFormat);
					acc[weightFromValue] = filterFn;
				}
			}
			return acc;
		}, {});

		// filter by cover up level
		return typedEntries_UNSAFE(labelsGroupedByWeight).reduce<Record<number, XAxisLabelWeighted[]>>(
			(acc, [weight, labels]) => {
				if (mappedExtendedFilterConfig[weight] && mappedExtendedFilterConfig[weight](coverUpLevel)) {
					return acc;
				}
				acc[weight] = labels;
				return acc;
			},
			{},
		);
	}
}
