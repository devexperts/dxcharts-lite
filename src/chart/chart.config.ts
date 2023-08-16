/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { PriceAxisType } from './components/labels_generator/numeric-axis-labels.generator';
import { MagnetTarget } from './components/cross_tool/cross-tool.component';
import { CrossToolType } from './components/cross_tool/cross-tool.model';
import { EventType } from './components/events/events.model';
import { HighlightType } from './components/highlights/highlights.model';
import { WaterMarkPositionType } from './components/watermark/water-mark.drawer';
import { TimeFormatWithDuration } from './components/x_axis/time/parser/time-formats.model';
import { DrawerType } from './drawers/drawing-manager';
import { DateTimeFormatter, TimeFormatterConfig } from './model/date-time.formatter';
import { DEFAULT_MERGE_OPTIONS, merge, MergeOptions } from './utils/merge.utils';
import { DeepPartial } from './utils/object.utils';

export const MAIN_FONT = 'Open Sans Semibold, sans-serif';

export interface DateTimeFormatConfig {
	format: string;
	showWhen?: {
		periodLessThen?: number;
		periodMoreThen?: number;
	};
	customFormatter?: DateTimeFormatter;
}

export interface BarTypes {
	candle: unknown;
	bar: unknown;
	line: unknown;
	area: unknown;
	scatterPlot: unknown;
	hollow: unknown;
	histogram: unknown;
	baseline: unknown;
	trend: unknown;
}

export type BarType = keyof BarTypes;

export const LastBarRedrawableBarTypes: BarType[] = ['candle', 'bar', 'scatterPlot', 'trend', 'hollow', 'histogram'];

export const availableBarTypes: BarType[] = [
	'candle',
	'line',
	'area',
	'bar',
	'scatterPlot',
	'trend',
	'hollow',
	'histogram',
	'baseline',
];

export const isLastBarRedrawAvailable = (type: BarType): boolean =>
	LastBarRedrawableBarTypes.find(t => t === type) !== undefined;

/**
 * Full chart-core default config.
 * @doc-tags chart-core,default-config
 * @doc-tags-name getDefaultConfig=xl
 */
export const getDefaultConfig = (): FullChartConfig => ({
	devexpertsPromoLink: true,
	useUTCTimeOverride: false,
	shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	rtl: false,
	scale: {
		keepZoomXOnYAxisChange: true,
		auto: true,
		zoomToCursor: false,
		lockPriceToBarRatio: false,
		autoScaleOnCandles: true,
		autoScaleDisableOnDrag: {
			enabled: true,
			edgeAngle: Math.PI / 15,
			yDiff: 80,
		},
		inverse: false,
		zoomSensitivity: 0.25,
		defaultViewportItems: 100,
	},
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // local timezone
	components: {
		chart: {
			type: 'candle',
			showCandlesBorder: true,
			showActiveCandlesBorder: true,
			showWicks: true,
			candleLineWidth: 1,
			lineWidth: 1,
			areaLineWidth: 1,
			barLineWidth: 1,
			minWidth: 0.5, // minimum candle width in canvas units - not real pixels! for mac with DPR=2 it will be equal 1 pixel
			minCandles: 10,
			candlePaddingPercent: 0.25,
			highlightActiveCandle: true,
			cursor: 'default',
			selectedWidth: 3,
			minCandlesOffset: 2,
			defaultZoomCandleWidth: 7,
			zoomStep: 0,
			histogram: {
				barCapSize: 1,
			},
		},
		yAxis: {
			type: 'regular',
			visible: true,
			labelHeight: 23,
			zeroPercentLine: true,
			customScale: true,
			customScaleDblClick: true,
			align: 'right',
			fontSize: 12,
			fontFamily: MAIN_FONT,
			cursor: 'ns-resize',
			resizeDisabledCursor: 'default',
			labelBoxMargin: {
				top: 4,
				bottom: 4,
				end: 8,
				start: 10,
			},
			typeConfig: {
				badge: {
					rounded: true,
					paddings: {
						top: 4,
						bottom: 4,
						end: 4,
						start: 4,
					},
				},
				plain: {},
				rectangle: {
					rounded: false,
					paddings: {
						top: 4,
						bottom: 4,
						end: 4,
						start: 4,
					},
				},
			},
			labels: {
				descriptions: false,
				settings: {
					lastPrice: {
						mode: 'label',
						type: 'badge',
					},
					countdownToBarClose: {
						mode: 'none',
						type: 'rectangle',
					},
				},
			},
		},
		xAxis: {
			visible: true,
			formatsForLabelsConfig: {
				lessThanSecond: 'HH:mm:ss',
				second_1: 'HH:mm:ss',
				minute_1: 'HH:mm',
				minute_5: 'HH:mm',
				minute_30: 'HH:mm',
				hour_1: 'HH:mm',
				day_1: 'dd.MM',
				month_1: 'MMM',
				year_1: 'YYYY',
			},
			fontSize: 12,
			fontFamily: MAIN_FONT,
			cursor: 'ew-resize',
			padding: {
				top: 8,
				bottom: 16,
			},
			fontStyle: '',
		},
		events: {
			visible: false,
			eventsVisibility: {
				'conference-calls': true,
				dividends: true,
				splits: true,
				earnings: true,
			},
			height: 20,
			cursor: 'default',
			xAxisLabelFormat: [
				{
					format: 'd MMM',
				},
			],
			icons: {
				earnings: {
					normal: '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.06066 6.5L6.5 1.06066L11.9393 6.5L6.5 11.9393L1.06066 6.5Z" stroke="#D92C40" stroke-width="1.5"/></svg>',
					hover: '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.06066 6.5L6.5 1.06066L11.9393 6.5L6.5 11.9393L1.06066 6.5Z" fill="#D92C40" stroke="#D92C40" stroke-width="1.5"/></svg>',
				},
			},
		},
		offsets: {
			visible: true,
			right: 10,
			top: 10,
			bottom: 20,
			left: 0,
		},
		waterMark: {
			visible: false,
			fontFamily: 'Open Sans, sans-serif',
			firstRowFontSize: 80,
			firstRowBottomPadding: 10,
			secondRowFontSize: 40,
			secondRowBottomPadding: 25,
			thirdRowFontSize: 40,
			thirdRowBottomPadding: 15,
			position: 'center',
			offsetX: 20,
			offsetY: 20,
			logoWidth: 20,
			logoHeight: 20,
		},
		highLow: { visible: false, font: '12px sans-serif' },
		highlights: {
			visible: false,
			fontFamily: 'Open Sans',
			fontSize: 13,
			border: {
				width: 1,
				dash: [8, 4],
			},
		},
		crossTool: {
			type: 'cross-and-labels',
			discrete: false,
			magnetTarget: 'none',
			lineDash: [4, 6],
			xAxisLabelFormat: [
				{
					format: 'dd.MM.YYYY',
					showWhen: {
						periodMoreThen: 84600000,
					},
				},
				{
					format: 'dd.MM.YYYY HH:mm',
					showWhen: {
						periodLessThen: 84600000,
						periodMoreThen: 6000,
					},
				},
				{
					format: 'dd.MM.YYYY HH:mm:ss',
					showWhen: {
						periodLessThen: 6000,
					},
				},
			],
			xLabel: {
				padding: {
					top: 4,
					bottom: 4,
					right: 8,
					left: 8,
				},
				margin: {
					top: 4,
				},
			},
			yLabel: {
				padding: {
					top: 4,
					bottom: 4,
					end: 4,
					start: 4,
				},
				type: 'badge',
			},
		},
		grid: {
			visible: true,
			horizontal: false,
			vertical: true,
			width: 1,
			dash: [0, 0],
			color: '#FFFFFF',
		},
		volumes: {
			visible: true,
			showSeparately: false,
			valueLines: 15,
			barCapSize: 1,
			volumeBarSpace: 0,
			volumeFillColor: '#FFFFFF',
		},
		navigationMap: {
			visible: false,
			allCandlesHistory: true,
			timeLabels: {
				visible: false,
				dateFormat: 'dd.MM.YYYY HH:mm',
				fontFamily: 'Open Sans',
				fontSize: 13,
				padding: {
					x: 10,
					y: 1,
				},
			},
			minSliderWindowWidth: 10,
			cursors: {
				chart: 'default',
				buttonLeft: 'pointer',
				buttonRight: 'pointer',
				leftResizer: 'ew-resize',
				rightResizer: 'ew-resize',
				slider: 'grab',
			},
			knots: {
				height: 35,
				width: 7,
				border: 0,
				lineWidth: 1,
			},
		},
		baseline: {
			cursor: 'ns-resize',
			dragZone: 3,
			height: 1,
		},
		paneResizer: {
			cursor: 'ns-resize',
			height: 1,
			visible: true,
			fixedMode: false,
			dragZone: 3,
		},
	},
	colors: {
		candleTheme: {
			upColor: 'rgba(77,153,83,1)',
			downColor: 'rgba(217,44,64,1)',
			noneColor: 'rgba(255,255,255,1)',
			upWickColor: 'rgba(77,153,83,1)',
			downWickColor: 'rgba(217,44,64,1)',
			noneWickColor: 'rgba(255,255,255,1)',
			borderOpacity: 1,
		},
		barTheme: { upColor: 'rgba(77,153,83,1)', downColor: 'rgba(217,44,64,1)', noneColor: 'rgba(255,255,255,1)' },
		lineTheme: { upColor: 'rgba(77,153,83,1)', downColor: 'rgba(217,44,64,1)', noneColor: 'rgba(255,255,255,1)' },
		chartAreaTheme: {
			backgroundMode: 'regular',
			backgroundColor: 'rgba(20,20,19,1)',
			backgroundGradientTopColor: 'red',
			backgroundGradientBottomColor: 'blue',
			axisColor: 'rgba(128,128,128,1)',
			gridColor: 'rgba(37,37,36,1)',
		},
		scatterPlot: { mainColor: 'rgba(255,255,255,1)' },
		areaTheme: {
			lineColor: 'rgba(127,120,214,1)',
			startColor: 'rgba(169,38,251,1)',
			stopColor: 'rgba(169,38,251,0.8)',
		},
		baseLineTheme: {
			lowerSectionStrokeColor: 'rgba(217,44,64,1)',
			upperSectionStrokeColor: 'rgba(77,153,83,1)',
			lowerSectionFillColor: 'rgba(217, 44, 64, 0.07)',
			upperSectionFillColor: 'rgba(77, 153, 83, 0.07)',
			baselineColor: 'rgba(55,55,54,1)',
		},
		histogram: {
			upCap: 'rgba(77,153,83,1)',
			upBottom: 'rgba(77,153,83,0.1)',
			upBright: 'rgba(77,153,83,0.4)',
			downCap: 'rgba(217,44,64,1)',
			downBottom: 'rgba(217,44,64,0.1)',
			downBright: 'rgba(217,44,64,0.4)',
			noneCap: 'rgba(255,255,255,1)',
			noneBottom: 'rgba(255,255,255,0.1)',
			noneBright: 'rgba(255,255,255,0.4)',
		},
		crossTool: {
			lineColor: 'rgba(107,96,86,1)',
			labelBoxColor: 'rgba(107,96,86,1)',
			labelTextColor: 'rgba(255,255,255,1)',
		},
		waterMarkTheme: {
			firstRowColor: 'rgba(255,255,255,0.2)',
			secondRowColor: 'rgba(255,255,255,0.2)',
			thirdRowColor: 'rgba(255,255,255,0.2)',
		},
		highlights: {
			NO_TRADING: { border: 'rgba(107,96,86,1)', background: 'transparent', label: 'transparent' },
			AFTER_MARKET: { border: 'rgba(107,96,86,1)', background: 'rgba(38, 251, 149, 0.05)', label: 'transparent' },
			PRE_MARKET: { border: 'rgba(107,96,86,1)', background: 'rgba(255, 170, 0, 0.05)', label: 'transparent' },
			REGULAR: { border: 'rgba(107,96,86,1)', background: 'transparent', label: 'transparent' },
		},
		activeCandleTheme: {
			upColor: 'rgba(98,201,93,1)',
			downColor: 'rgba(255,47,47,1)',
			noneColor: 'rgba(255,255,255,1)',
			upWickColor: 'rgba(98,201,93,1)',
			downWickColor: 'rgba(255,47,47,1)',
			noneWickColor: 'rgba(255,255,255,1)',
			borderOpacity: 0.5,
		},
		volume: {
			downBarColor: 'rgba(99,30,37,1)',
			upBarColor: 'rgba(42,72,44,1)',
			noneBarColor: 'rgba(255,255,255,0.4)',
			upCapColor: 'rgba(42,72,44,1)',
			downCapColor: 'rgba(99,30,37,1)',
			noneCapColor: 'rgba(255,255,255,0.4)',
		},
		highLowTheme: { highColor: 'rgba(223,222,223,1)', lowColor: 'rgba(223,222,223,1)' },
		instrumentInfo: { textColor: '#aeb1b3' },
		paneResizer: {
			lineColor: 'rgba(55,55,54,1)',
			bgColor: 'rgba(20,20,19,1)',
			bgHoverColor: 'rgba(55,55,54,0.6)',
		},
		events: {
			earnings: { color: 'rgba(217,44,64,1)' },
			dividends: { color: 'rgba(169,38,251,1)' },
			splits: { color: 'rgba(244,187,63,1)' },
			'conference-calls': { color: 'rgba(48,194,97,1)' },
		},
		secondaryChartTheme: [
			{
				lineTheme: {
					upColor: 'rgba(226,61,25,1)',
					downColor: 'rgba(226,61,25,1)',
					noneColor: 'rgba(226,61,25,1)',
				},
				areaTheme: {
					lineColor: 'rgba(226,61,25,1)',
					startColor: 'rgba(226,61,25,0.8)',
					stopColor: 'rgba(226,61,25,0)',
				},
			},
			{
				lineTheme: {
					upColor: 'rgba(250,191,64,1)',
					downColor: 'rgba(250,191,64,1)',
					noneColor: 'rgba(250,191,64,1)',
				},
				areaTheme: {
					lineColor: 'rgba(250,191,64,1)',
					startColor: 'rgba(250,191,64,0.8)',
					stopColor: 'rgba(250,191,64,0)',
				},
			},
			{
				lineTheme: {
					upColor: 'rgba(169,38,251,1)',
					downColor: 'rgba(169,38,251,1)',
					noneColor: 'rgba(169,38,251,1)',
				},
				areaTheme: {
					lineColor: 'rgba(169,38,251,1)',
					startColor: 'rgba(169,38,251,0.8)',
					stopColor: 'rgba(169,38,251,0)',
				},
			},
			{
				lineTheme: {
					upColor: 'rgba(77,211,240,1)',
					downColor: 'rgba(77,211,240,1)',
					noneColor: 'rgba(77,211,240,1)',
				},
				areaTheme: {
					lineColor: 'rgba(77,211,240,1)',
					startColor: 'rgba(77,211,240,0.8)',
					stopColor: 'rgba(77,211,240,0)',
				},
			},
			{
				lineTheme: {
					upColor: 'rgba(59,203,91,1)',
					downColor: 'rgba(59,203,91,1)',
					noneColor: 'rgba(59,203,91,1)',
				},
				areaTheme: {
					lineColor: 'rgba(59,203,91,1)',
					startColor: 'rgba(59,203,91,0.8)',
					stopColor: 'rgba(59,203,91,0)',
				},
			},
		],
		yAxis: {
			backgroundColor: 'transparent',
			backgroundHoverColor: 'rgba(20,20,19,1)',
			labelBoxColor: 'rgba(20,20,19,1)',
			labelTextColor: 'rgba(128,128,128,1)',
			labelInvertedTextColor: 'rgba(20,20,19,1)',
			rectLabelTextColor: 'rgba(255,255,255,1)',
			rectLabelInvertedTextColor: 'rgba(20,20,19,1)',
			zeroPercentLine: 'rgba(55,55,54,1)',
		},
		labels: {
			lastPrice: {
				textNegative: 'rgba(255,255,255,1)',
				textPositive: 'rgba(255,255,255,1)',
				textSelected: 'rgba(0,0,0,1)',
				boxNegative: 'rgba(217,44,64,1)',
				boxPositive: 'rgba(77,153,83,1)',
				boxSelected: 'rgba(255,255,255,1)',
			},
			countdownToBarClose: {
				textNegative: 'rgba(255,255,255,1)',
				textPositive: 'rgba(255,255,255,1)',
				textSelected: 'rgba(255,255,255,1)',
				boxNegative: 'rgba(217,44,64,1)',
				boxPositive: 'rgba(77,153,83,1)',
				boxSelected: 'rgba(255,255,255,1)',
			},
			highLow: {
				high: { boxColor: 'rgba(107,96,86,1)', textColor: 'rgba(255,255,255,1)', descriptionText: 'High' },
				low: { boxColor: 'rgba(107,96,86,1)', textColor: 'rgba(255,255,255,1)', descriptionText: 'Low' },
			},
			bidAsk: {
				bid: { boxColor: 'rgba(77,153,83,1)', textColor: 'rgba(255,255,255,1)', descriptionText: 'Bid' },
				ask: { boxColor: 'rgba(217,44,64,1)', textColor: 'rgba(255,255,255,1)', descriptionText: 'Ask' },
			},
			prePostMarket: {
				post: { boxColor: 'rgba(38,251,149,1)', textColor: 'rgba(20,20,19,1)', descriptionText: 'Post' },
				pre: { boxColor: 'rgba(255,170,0,1)', textColor: 'rgba(20,20,19,1)', descriptionText: 'Pre' },
			},
			prevDayClose: { boxColor: 'rgba(107,96,86,1)', textColor: 'rgba(255,255,255,1)' },
		},
		xAxis: {
			backgroundColor: 'transparent',
			labelTextColor: 'rgba(128,128,128,1)',
		},
		navigationMap: {
			backgroundColor: 'transparent',
			buttonColor: 'rgba(255,255,255,0.1)',
			buttonArrowColor: 'rgba(212,212,211,1)',
			knotColor: 'rgba(255,255,255,0.1)',
			knotLineColor: 'rgba(212,212,211,1)',
			sliderColor: 'rgba(255,255,255,0.08)',
			knotBorderColor: '#0b0d1a',
			timeLabelsTextColor: 'rgba(128,128,128,1)',
			mapColor: 'rgba(255,255,255,0.1)',
			mapFillColor: 'rgba(255,255,255,0.1)',
			mapGradientTopColor: 'rgba(255,255,255,0.1)',
			mapGradientBottomColor: 'rgba(255,255,255,0.1)',
		},
	},
	animation: {
		moveDuration: 1000,
		candleDuration: 200,
		paneResizer: {
			bgMode: true,
			enabled: true,
			duration: 40,
		},
		yAxis: {
			background: {
				enabled: false,
				duration: 40,
			},
		},
	},
	drawingOrder: [
		'OVER_SERIES_CLEAR',
		'MAIN_CLEAR',
		'SERIES_CLEAR',
		'GRID',
		'X_AXIS',
		'Y_AXIS',
		'UNDERLAY_VOLUMES_AREA',
		'VOLUMES',
		'DATA_SERIES',
		'DRAWINGS',
		'WATERMARK',
		'N_MAP_CHART',
		'EVENTS',
	],
});

/**
 * Merges a partial chart configuration object with a default chart configuration object.
 * @param {PartialChartConfig} config - The partial chart configuration object to merge.
 * @param {FullChartConfig} defaultConfig - The default chart configuration object to merge with.
 * @returns {FullChartConfig} - The merged chart configuration object.
 */
export function mergeWithDefaultConfig(
	config: PartialChartConfig,
	defaultConfig: FullChartConfig = getDefaultConfig(),
): FullChartConfig {
	merge(config, defaultConfig, DEFAULT_MERGE_OPTIONS);
	// eslint-disable-next-line no-restricted-syntax
	return config as FullChartConfig;
}

/**
 * Merges a partial chart configuration object with the default configuration object and returns a new object with the merged values.
 * @param {PartialChartConfig} config - The partial chart configuration object to merge with the default configuration object.
 * @param {FullChartConfig} defaultConfig - The default chart configuration object to merge with the partial configuration object. If not provided, the default configuration object will be retrieved using getDefaultConfig() function.
 * @returns {FullChartConfig} - A new object with the merged values of the partial and default configuration objects.
 * @todo Implement deep copy of the partial configuration object before merging.
 */
export function mergeWithDefaultConfigCopy(
	config: PartialChartConfig,
	defaultConfig = getDefaultConfig(),
): FullChartConfig {
	// TODO deep copy
	// @ts-ignore
	const result: FullChartConfig = {
		...config,
	};
	merge(result, defaultConfig, DEFAULT_MERGE_OPTIONS);
	return result;
}

/**
 * This function rewrites the properties of an object with the properties of another object.
 * @param {object} current - The object to be rewritten.
 * @param {object} newObj - The object containing the new properties.
 * @returns {void}
 */
export function rewrite(current: Record<string, any>, newObj: Record<string, any>) {
	Object.keys(current).forEach(key => delete current[key]);
	Object.keys(newObj).forEach(key => (current[key] = newObj[key]));
}

/**
 * Checks if a value is a non-null object.
 * @param {unknown} value - The value to check.
 * @returns {boolean} - True if the value is a non-null object, false otherwise.
 */
function isNonNullObject(value: unknown): value is Record<string, any> {
	return typeof value === 'object' && value !== null;
}

/**
 * Creates a new array with the same elements as the provided array.
 *
 * @param {unknown[]} arr - The array to be copied.
 * @param {MergeOptions} options - The options to be used when cloning the elements of the array.
 * @returns {unknown[]} A new array with the same elements as the provided array.
 */
function copyArray(arr: unknown[], options: MergeOptions): unknown[] {
	const arrWithoutHoles = [...arr]; // destructuring converts holes to undefined
	return arrWithoutHoles.map(item => clone(item, options));
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

/**
 * Clones an object or array using the provided options.
 *
 * @param {unknown} value - The value to clone.
 * @param {MergeOptions} options - The options to use when cloning.
 * @returns {unknown} - The cloned object or array.
 */
function clone(value: unknown, options: MergeOptions): unknown {
	if (!isNonNullObject(value)) {
		return value;
	}
	if (isArray(value)) {
		return copyArray(value, options);
	} else {
		const copy = immutableMerge({}, value, options);
		Object.setPrototypeOf(copy, Object.getPrototypeOf(value));

		return copy;
	}
}

/**
 * This function is intended to be used for merging config objects
 * Current chart architecture with passing references to same config between different parts of the system makes this function unusable
 * TODO: Think about replacing direct references in constructor argument with functions that returns config.
 * E.g. ChartBootstrap passes direct reference to config to ChartDrawer
 * Once reference updated in ChartBootstrap, it's not updated in ChartDrawer, it's still pointing to the previous version of config
 */
export function immutableMerge<T>(base: Partial<T>, override: Partial<T>, options: MergeOptions): T;

/**
 * This function performs an immutable merge of two objects, `base` and `override`, and returns a new object with the merged properties. If `base` is not a non-null object, it returns either `override` or `base`, depending on the value of `options.overrideExisting`. If both `base` and `override` are arrays, it returns a new array with the merged elements. If `base` and `override` are objects, it creates a new object with the prototype of `base` and copies all properties of `base` to the new object. Then, it iterates over all properties of `override` and performs a recursive merge of the corresponding properties in `base` and `override`. If a property exists only in `override` and `options.addIfMissing` is true, it adds the property to the new object. The function uses the `clone` and `copyArray` functions to create copies of objects and arrays, respectively.
 *
 * @param {object} base - The base object to merge.
 * @param {object} override - The object to merge into `base`.
 * @param {object} options - An object with options for the merge operation.
 * @param {boolean} options.overrideExisting - If true, override existing properties in `base`. If false, keep the properties in `base`.
 * @param {boolean} options.addIfMissing - If true, add properties from `override` that do not exist in `base`.
 * @returns {object} - A new object with the merged properties.
 */
export function immutableMerge(
	base: Record<string, any>,
	override: Record<string, any>,
	options: MergeOptions,
): Record<string, any> {
	if (!isNonNullObject(base)) {
		return options.overrideExisting ? override : base;
	}

	if (Array.isArray(base) && Array.isArray(override)) {
		const arr = options.overrideExisting ? override : base;
		return copyArray(arr, options);
	}

	const result: Record<string, any> = Object.create(Object.getPrototypeOf(base));
	Object.keys(base).forEach(key => (result[key] = clone(base[key], options)));

	Object.keys(override).forEach(key => {
		if (key in base) {
			result[key] = immutableMerge(base[key], override[key], options);
		} else if (options.addIfMissing) {
			result[key] = clone(override[key], options);
		}
	});

	return result;
}
export interface DateFormat {
	format: string;
	super: string;
}

export interface DateFormats {
	minute: DateFormat;
	day: DateFormat;
}

export interface FullChartColors {
	candleTheme: CandleTheme;
	activeCandleTheme: CandleTheme;
	barTheme: LineStyleTheme;
	lineTheme: LineStyleTheme;
	areaTheme: AreaStyleTheme;
	chartAreaTheme: ChartAreaTheme;
	scatterPlot: ScatterPlotStyle;
	baseLineTheme: BaselineStyleTheme;
	histogram: HistogramColors;
	highlights: Record<HighlightType, HighlightsColors>;
	volume: VolumeColors;
	secondaryChartTheme: SecondaryChartTheme[];
	waterMarkTheme: {
		firstRowColor: string;
		secondRowColor: string;
		thirdRowColor: string;
	};
	highLowTheme: {
		highColor: string;
		lowColor: string;
	};
	yAxis: {
		backgroundColor: string;
		backgroundHoverColor: string;
		zeroPercentLine: string;
		labelTextColor: string;
		labelInvertedTextColor: string;
		labelBoxColor: string;
		rectLabelTextColor: string;
		rectLabelInvertedTextColor: string;
	};
	xAxis: {
		backgroundColor: string;
		labelTextColor: string;
	};
	crossTool: {
		lineColor: string;
		labelBoxColor: string;
		labelTextColor: string;
	};
	events: {
		earnings: EventColors;
		dividends: EventColors;
		splits: EventColors;
		'conference-calls': EventColors;
	};
	navigationMap: {
		buttonColor: string;
		knotColor: string;
		sliderColor: string;
		backgroundColor: string;
		buttonArrowColor: string;
		knotLineColor: string;
		knotBorderColor: string;
		timeLabelsTextColor: string;
		mapFillColor: string;
		mapGradientTopColor?: string;
		mapGradientBottomColor?: string;
		mapColor: string;
	};
	instrumentInfo: {
		textColor: string;
	};
	paneResizer: {
		lineColor: string;
		bgColor: string;
		bgHoverColor: string;
	};
	labels: YAxisLabelsColors;
}

export interface DateFormatter {
	applyPattern?: (pattern: string) => string;
	createFormatterFunction?: (pattern: string) => DateTimeFormatter;
	utcTimeOverride?: {
		pattern?: string;
		test?: (pattern: string) => void;
	};
}

/**
 * The main configuration file for chart-core.
 * Includes all components' configurations, global configs like dateFormatter, and colors.
 */
export interface FullChartConfig extends TimeFormatterConfig {
	/**
	 * Controls how chart series are positioned horizontally and vertically.
	 * Other configurations like: inverse, lockRatio etc.
	 */
	scale: ChartScale;
	/**
	 * Group of component configurations. Chart component is a single visual object on chart.
	 * Examples: chart itself, events, x-axis, highlights, cross tool.
	 */
	components: ChartComponents;
	/**
	 * All colors in chart-core are configured here.
	 */
	colors: FullChartColors;
	/**
	 * Date and time formatting configuration.
	 */
	dateFormatter?: DateFormatter;
	/**
	 * Timezone to use on chart X axis labels and any other timestamps.
	 * Examples: Africa/Accra, Europe/Moscow, Asia/Tehran.
	 */
	timezone: string;
	/**
	 * If set - chart canvas will have fixed size always.
	 */
	fixedSize?: {
		width: number;
		height: number;
	};
	/**
	 * Right to left mode. Used in drawings (like text drawing) calculation.
	 */
	rtl: boolean;
	/**
	 * Initial visual order of chart drawers. Reorder to put volumes on top of candles for example.
	 */
	drawingOrder: DrawerType[];
	useUTCTimeOverride: boolean;
	animation: AnimationConfig;
	devexpertsPromoLink: boolean;
}

// use this to merge partial config with existing
export type PartialChartConfig = DeepPartial<FullChartConfig>;

export interface ChartScale {
	/**
	 * Auto scale will always fit whole chart series in viewport.
	 */
	auto: boolean;
	/**
	 * True - will zoom to cursor on mouse wheel. False - zoom to last candle.
	 */
	zoomToCursor: boolean;
	/**
	 * Locks the ratio between price/time, so when zooming it will feel like google maps.
	 */
	lockPriceToBarRatio: boolean;
	/**
	 * Inverses the Y scale vertically. TODO move to components.yAxis.
	 */
	inverse: boolean;
	/**
	 * Do auto scale (even if it's not enabled in config) after instrument change.
	 */
	autoScaleOnCandles: boolean;
	/**
	 * When dragging chart under specific angle - will automatically disable auto-scale.
	 */
	autoScaleDisableOnDrag: AutoScaleDisableOnDrag;
	/**
	 * 0..1 ratio of full viewport; 0.5 = middle, 0.75 = 3/4 of viewport
	 */
	zoomSensitivity: number;
	/**
	 * Defines how much items (candles) will be in viewport when chart applies basic scale
	 */
	defaultViewportItems: number;
	/**
	 * Adjust x viewport when y-axis width is changed, so x zoom remains the same
	 */
	keepZoomXOnYAxisChange: boolean;
}

export interface AutoScaleDisableOnDrag {
	enabled: boolean;
	/**
	 * The angle of mouse movement. Default - Math.PI / 9.
	 */
	edgeAngle: number;
	/**
	 * Distance that mouse should travel vertically in px. Default - 80.
	 */
	yDiff: number;
}

export interface ChartComponents {
	chart: ChartConfigComponentsChart;
	xAxis: ChartConfigComponentsXAxis;
	yAxis: ChartConfigComponentsYAxis;
	grid: GridComponentConfig;
	volumes: ChartConfigComponentsVolumes;
	offsets: ChartConfigComponentsOffsets;
	waterMark: ChartConfigComponentsWaterMark;
	events: ChartConfigComponentsEvents;
	highLow: ChartConfigComponentsHighLow;
	crossTool: ChartConfigComponentsCrossTool;
	highlights: ChartConfigComponentsHighlights;
	navigationMap: ChartConfigComponentsNavigationMap;
	baseline: ChartConfigComponentsBaseline;
	/**
	 * Horizontal resizer between panes
	 */
	paneResizer: ChartConfigComponentsPaneResizer;
}

export interface ChartConfigComponentsChart {
	/**
	 * The type of chart. Candle, bar, area and others.
	 */
	type: BarType;
	/**
	 * Shows the border of candle. Useful for hollow-candles and to increase contrast on thin candles.
	 */
	showCandlesBorder: boolean;
	/**
	 * Shows the border for active candle (tapped by finger on mobile devices).
	 */
	showActiveCandlesBorder: boolean;
	/**
	 * Shows candle wicks - high and low.
	 */
	showWicks: boolean;
	candleLineWidth: number;
	barLineWidth: number;
	lineWidth: number;
	areaLineWidth: number;
	/**
	 * The minimum amount of candles in viewport. It will not be possible to make fewer than that by using zoom.
	 */
	minCandles: number;
	defaultZoomCandleWidth: number;
	minWidth: number;
	zoomStep: number;
	candlePaddingPercent: number;
	highlightActiveCandle: boolean;
	cursor: CursorType;
	selectedWidth: number;
	minCandlesOffset: number;
	histogram: ChartConfigComponentsHistogram;
}

export interface ChartConfigComponentsEvents {
	/**
	 * Toggle events visibility.
	 */
	visible: boolean;
	/**
	 * Toggle specific event type visibility (for example: dividends, splits, earnings).
	 */
	eventsVisibility: Record<EventType, boolean>;
	/**
	 * Height of events area in pixels
	 */
	height: number;
	/**
	 * Configure events cursor type.
	 */
	cursor: CursorType;
	/**
	 * Configure x axis labels
	 */
	xAxisLabelFormat: Array<DateTimeFormatConfig>;
	/**
	 * Configure icons, the format is string which contains svg tag, for example:
	 * '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
	 * 		<path d="M1.06066 6.5L6.5 1.06066L11.9393 6.5L6.5 11.9393L1.06066 6.5Z" stroke="#D92C40" stroke-width="1.5"/>
	 * 	</svg>'
	 */
	icons?: ChartConfigComponentsEventsIcons;
}

export interface DateTimeFormatConfig {
	format: string;
	showWhen?: {
		periodLessThen?: number;
		periodMoreThen?: number;
	};
	customFormatter?: DateTimeFormatter;
}

export interface ChartConfigComponentsXAxis {
	visible: boolean;
	cursor: CursorType;
	formatsForLabelsConfig: Record<TimeFormatWithDuration, string>;
	padding: {
		top?: number;
		bottom?: number;
	};
	fontSize: number;
	fontFamily: string;
	fontStyle: string;
}

export type YAxisAlign = 'left' | 'right';

export interface ChartConfigComponentsYAxis {
	visible: boolean;
	/**
	 * Type of Y axis. Currently supported 'regular', 'percent', 'logarithmic'.
	 */
	type: PriceAxisType;
	/**
	 * Align Y axis left or right.
	 */
	align: YAxisAlign;
	/**
	 * Configures the labels on Y axis.
	 */
	labels: YAxisLabels;
	/**
	 * Override appearance of different label types. Useful to change all labels of the same type.
	 */
	typeConfig: YAxisTypeConfig;
	/**
	 * The height of the single label in pixels.
	 * Used during calculation step between labels.
	 * You can make it smaller to fit more labels on Y axis. Or less to fit less labels.
	 */
	labelHeight: number;
	/**
	 * Always show zero line for percent scale.
	 */
	zeroPercentLine: boolean;
	/**
	 * Allow to scale chart vertically by dragging Y axis with mouse.
	 */
	customScale: boolean;
	/**
	 * Allows to double-click on Y axis to turn on auto-scale.
	 */
	customScaleDblClick: boolean;
	cursor: CursorType;
	resizeDisabledCursor: CursorType;
	labelBoxMargin: {
		top: number;
		bottom: number;
		end: number;
		start: number;
	};
	fontSize: number;
	fontFamily: string;
}

export interface ChartConfigComponentsOffsets {
	visible: boolean;
	/**
	 * Top offset, measured in percents of chart height.
	 */
	top: number;
	/**
	 * Left offset, measured in amount of candles.
	 */
	left: number;
	/**
	 * Right offset, measured in amount of candles.
	 */
	right: number;
	/**
	 * Bottom offset, measured in percents of chart height.
	 */
	bottom: number;
}

export interface ChartConfigComponentsWaterMark {
	visible: boolean;
	/**
	 * Position on the screen.
	 */
	position: WaterMarkPositionType;
	offsetX: number;
	offsetY: number;
	logoWidth: number;
	logoHeight: number;
	fontFamily: string;
	/**
	 * Font size for first text line.
	 */
	firstRowFontSize: number;
	/**
	 * Padding after first text line.
	 */
	firstRowBottomPadding: number;
	/**
	 * Font size for second text line.
	 */
	secondRowFontSize: number;
	/**
	 * Padding after second text line.
	 */
	secondRowBottomPadding: number;
	/**
	 * Font size for third text line.
	 */
	thirdRowFontSize: number;
	/**
	 * Padding after third text line.
	 */
	thirdRowBottomPadding: number;
}

export interface ChartConfigComponentsHighLow {
	visible: boolean;
	/**
	 * Font config of high/low labels.
	 */
	font: string;
}
export interface ChartConfigComponentsCrossTool {
	/**
	 * The type of cross tool.  Visibility is also contolled by type, set 'none' to hide the cross tool.
	 */
	type: CrossToolType;
	/**
	 * Line dash for cross tool.
	 */
	lineDash: Array<number>;
	/**
	 * When discrete is ON - the cross tool X coordinate will always be at the middle of candle.
	 */
	discrete: boolean;
	/**
	 * Cross tool Y coordinate can magnet to OHLC values of candle.
	 */
	magnetTarget: MagnetTarget;
	/**
	 * Format of X label config for different periods.
	 */
	xAxisLabelFormat: Array<DateTimeFormatConfig>;
	/**
	 * X label appearance.
	 */
	xLabel: {
		padding: {
			top: number;
			bottom: number;
			right: number;
			left: number;
		};
		margin: {
			top: number;
			bottom?: number; // TODO remove
		};
	};
	/**
	 * X label appearance.
	 */
	yLabel: {
		padding: {
			top: number;
			bottom: number;
			end: number;
			start: number;
		};
		type: YAxisLabelAppearanceType;
	};
}

export interface ChartConfigComponentsHighlights {
	visible: boolean;
	/**
	 * Border of highlights (session breaks for example).
	 */
	border: {
		width: number;
		dash: [number, number];
	};
	fontFamily: string;
	fontSize: number;
}

export interface ChartConfigComponentsVolumes {
	visible: boolean;
	/**
	 * Show volumes in overlaying mode or as sub-chart like a study.
	 */
	showSeparately: boolean;
	volumeFillColor: string;
	valueLines: number;
	barCapSize: number;
	volumeBarSpace: number;
}

export interface ChartConfigComponentsHistogram {
	barCapSize: number;
}

export interface GridComponentConfig {
	visible: boolean;
	/**
	 * Shows vertical grid lines.
	 */
	vertical: boolean;
	/**
	 * Shows horizontal grid lines.
	 */
	horizontal: boolean;
	/**
	 * Width of grid lines in pixels.
	 */
	width: number;
	/**
	 * Line dash configuration like [1,2].
	 */
	dash: Array<number>;
	color?: string;
}

export interface ChartConfigComponentsNavigationMap {
	visible: boolean;
	allCandlesHistory: boolean;
	timeLabels: {
		visible: boolean;
		dateFormat: string;
		fontFamily: string;
		fontSize: number;
		padding: {
			x: number;
			y: number;
		};
	};
	cursors: {
		chart: CursorType;
		buttonLeft: CursorType;
		buttonRight: CursorType;
		leftResizer: CursorType;
		rightResizer: CursorType;
		slider: CursorType;
	};
	knots: {
		height: number;
		width: number;
		border: number;
		lineWidth: number;
	};
	minSliderWindowWidth: number; // Distance between left edges of slider window drag buttons
}

export interface ChartConfigComponentsBaseline {
	cursor: CursorType;
	dragZone: number;
	height: number;
}

export interface ChartConfigComponentsPaneResizer {
	visible: boolean;
	/**
	 * Height of resizer in pixels.
	 */
	height: number;
	/**
	 * Make the horizontal line fixed and disable resizing.
	 */
	fixedMode: boolean;
	/**
	 * Hover area of resizer in pixels.
	 */
	dragZone: number;
	cursor: string;
}

export interface AnimationConfig {
	moveDuration: number;
	candleDuration: number;
	paneResizer: {
		bgMode: boolean;
		enabled: boolean;
		duration: number;
	};
	yAxis: {
		/**
		 * Deprecated. Old hover animation on Y axis.
		 */
		background: {
			enabled: boolean;
			duration: number;
		};
	};
}

export interface CandleTheme {
	upColor: string;
	downColor: string;
	noneColor: string;
	upWickColor: string;
	downWickColor: string;
	noneWickColor: string;
	borderOpacity?: number;
}

export interface HighlightsColors {
	border: string;
	background: string;
	label: string;
}

export interface EventColors {
	color: string;
}

export interface HistogramColors {
	upCap: string;
	upBottom: string;
	upBright: string;
	downCap: string;
	downBottom: string;
	downBright: string;
	noneCap: string;
	noneBottom: string;
	noneBright: string;
}

export interface VolumeColors {
	downCapColor: string;
	upCapColor: string;
	noneCapColor: string;
	downBarColor: string;
	upBarColor: string;
	noneBarColor: string;
}

export interface LineStyleTheme {
	upColor: string;
	downColor: string;
	noneColor: string;
}

export interface ScatterPlotStyle {
	mainColor: string;
}

export interface AreaStyleTheme {
	lineColor: string;
	startColor?: string;
	stopColor?: string;
}

export interface BaselineStyleTheme {
	upperSectionStrokeColor: string;
	lowerSectionStrokeColor: string;
	upperSectionFillColor: string;
	lowerSectionFillColor: string;
	baselineColor: string;
}

export interface SecondaryChartTheme {
	lineTheme: LineStyleTheme;
	areaTheme: AreaStyleTheme;
}

export interface ChartAreaTheme {
	backgroundMode: 'regular' | 'gradient';
	backgroundColor: string;
	backgroundGradientTopColor: string;
	backgroundGradientBottomColor: string;
	axisColor: string;
	gridColor: string;
}

export type ChartColors = DeepPartial<FullChartColors>;

export type YAxisLabelType = string;

export type YAxisLabelMode = 'none' | 'line' | 'line-label' | 'label';
export type YAxisLabelAppearanceType = 'badge' | 'rectangle' | 'plain';

export interface YAxisLabelConfig {
	mode: YAxisLabelMode;
	type: YAxisLabelAppearanceType;
}

export interface YAxisLabelColorConfig {
	boxColor: string;
	textColor?: string;
	descriptionText?: string;
}

export interface YAxisLastPriceLabelColorConfig {
	boxSelected: string;
	boxPositive: string;
	boxNegative: string;
	textSelected: string;
	textNegative: string;
	textPositive: string;
}

export interface YAxisBidAskLabelColorConfig {
	bid: YAxisLabelColorConfig;
	ask: YAxisLabelColorConfig;
}

export interface YAxisHighLowLabelColorConfig {
	high: YAxisLabelColorConfig;
	low: YAxisLabelColorConfig;
}

export interface YAxisPrePostMarketLabelColorConfig {
	pre: YAxisLabelColorConfig;
	post: YAxisLabelColorConfig;
}

export interface YAxisLabels {
	descriptions: boolean;
	/**
	 * Settings contains required labels ('lastPrice', 'countDownToBarClose')
	 * and optional labels ('bidAsk', 'highLow', 'prevDayClose', 'prePostMarket').
	 */
	settings: Record<YAxisLabelType, YAxisLabelConfig>;
}

export interface YAxisTypeConfigProps {
	rounded?: boolean;
	paddings?: {
		top: number;
		bottom: number;
		start: number;
		end: number;
	};
}

export type YAxisTypeConfig = Record<YAxisLabelAppearanceType, YAxisTypeConfigProps>;

export interface YAxisLabelsColors extends Record<YAxisLabelType, Record<string, any>> {
	lastPrice: YAxisLastPriceLabelColorConfig;
	bidAsk: YAxisBidAskLabelColorConfig;
	highLow: YAxisHighLowLabelColorConfig;
	prePostMarket: YAxisPrePostMarketLabelColorConfig;
	prevDayClose: YAxisLabelColorConfig;
}
//#endregion

export interface CustomIcon {
	normal: string;
	hover: string;
}

export interface ChartConfigComponentsEventsIcons {
	earnings?: CustomIcon;
	dividends?: CustomIcon;
	splits?: CustomIcon;
	conferenceCalls?: CustomIcon;
}

export type CursorType = string;

export const getFontFromConfig = (config: ChartConfigComponentsYAxis) => `${config.fontSize}px ${config.fontFamily}`;
