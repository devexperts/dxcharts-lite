/*
 * Copyright (C) 2002 - 2023 Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { arrayCompare, arrayRemove2, flat, moveInArrayMutable, reorderArray } from '../utils/array.utils';
import { isMobile } from '../utils/device/browser.utils';
import { FullChartConfig } from '../chart.config';
import { calcTimeLabelBounds } from '../components/navigation_map/navigation-map.model';
import { CanvasModel } from '../model/canvas.model';
import EventBus from '../events/event-bus';
import { ChartResizeHandler, PickedDOMRect } from '../inputhandlers/chart-resize.handler';
import { Point } from '../inputlisteners/canvas-input-listener.component';
import { CandleSeriesModel } from '../model/candle-series.model';
import { Pixel } from '../model/scaling/viewport.model';
import { DateTimeFormatterFactory } from '../model/date-time.formatter';
import { calculateSymbolHeight } from '../utils/canvas/canvas-font-measure-tool.utils';
import { Bounds } from '../model/bounds.model';
import { AtLeastOne } from '../utils/object.utils';
import { YAxisBoundsContainer, YAxisWidths } from './y-axis-bounds.container';

export const CHART_UUID = 'CHART';

export class CanvasElement {
	static CANVAS = 'CANVAS';
	static N_MAP = 'N_MAP';
	static X_AXIS = 'X_AXIS';
	static N_MAP_KNOT_L = 'N_MAP_KNOT_L';
	static N_MAP_KNOT_R = 'N_MAP_KNOT_R';
	static N_MAP_BTN_L = 'N_MAP_BTN_L';
	static N_MAP_BTN_R = 'N_MAP_BTN_R';
	static N_MAP_SLIDER_WINDOW = 'N_MAP_SLIDER_WINDOW';
	static N_MAP_CHART = 'N_MAP_CHART';
	static N_MAP_LABEL_R = 'N_MAP_LABEL_R';
	static N_MAP_LABEL_L = 'N_MAP_LABEL_L';
	static PANE_UUID = (uuid: string) => 'PANE_' + uuid;
	static PANE_UUID_Y_AXIS = (uuid: string, idx: number = 0) => 'PANE_' + uuid + '_Y_AXIS_' + idx;
	static PANE_UUID_RESIZER = (uuid: string) => 'PANE_' + uuid + '_RESIZER';
	static ALL_PANES = 'ALL_PANES';
	static CHART_WITH_Y_AXIS = 'CHART_WITH_Y_AXIS';
	static EVENTS = 'EVENTS';
	/**
	 * @deprecated - use CanvasElement.PANE_UUID(CHART_UUID) instead
	 */
	static CHART = CanvasElement.PANE_UUID(CHART_UUID);
	/**
	 * @deprecated - use CanvasElement.PANE_UUID_Y_AXIS(CHART_UUID) instead
	 */
	static Y_AXIS = CanvasElement.PANE_UUID_Y_AXIS(CHART_UUID);
}

export const DEFAULT_BOUNDS: Bounds = { x: 0, y: 0, pageX: 0, pageY: 0, width: 0, height: 0 };

const DEFAULT_MIN_PANE_HEIGHT = 20;

const N_MAP_H = 35;
const N_MAP_BUTTON_W = 15;
const KNOTS_W_MOBILE_MULTIPLIER = 1.5;
const N_MAP_KNOT_W = isMobile() ? 8 * KNOTS_W_MOBILE_MULTIPLIER : 8;

/**
 * we need to check that: heightRatios - 1 <  0.000001 after calculations between decimals
 */
const PRECISION_DIFFERENCE = 0.000001;

/**
 * This component listens EVENT_DRAW and recalculates bounds of canvas chart elements.
 * {@link getBounds} method will always give actual placement of element you want.
 *
 * NOTE: this class was designed exclusively for {@link getBounds} method
 * 	     please think twice when adding additional logic here (does it affect element bounds? or it's smth else)
 */
export class CanvasBoundsContainer {
	// TODO rework, remove this
	private mainCandleSeries?: CandleSeriesModel;
	// holds all canvas element bounds
	bounds: Record<string, Bounds> = {};
	// position of canvas on the whole page
	canvasOnPageLocation: Bounds = { x: 0, y: 0, pageX: 0, pageY: 0, width: 0, height: 0 };
	// holds ordered "top to bottom" array of panes UUID's (studies in past)
	panesOrder: Array<string> = [];
	panesOrderChangedSubject = new Subject<string[]>();

	// both will be calculated based on font/content size
	xAxisHeight: number | undefined = undefined;
	yAxisWidths: YAxisWidths = {
		right: [0],
		left: [0],
	};

	leftRatio = 0;
	rightRatio = 0;

	private boundsChangedSubject = new Subject<void>();
	public barResizerChangedSubject = new Subject<void>();
	private _graphsHeightRatio: Record<string, number> = { chart: 1 };
	get graphsHeightRatio(): Record<string, number> {
		return this._graphsHeightRatio;
	}
	graphsHeightRatioChangedSubject = new Subject<Record<string, number>>();

	private boundsChangedSubscriptions: Record<string, BehaviorSubject<Bounds>> = {};

	public readonly yAxisBoundsContainer: YAxisBoundsContainer;

	constructor(
		private config: FullChartConfig,
		private eventBus: EventBus,
		private canvasModel: CanvasModel,
		private formatterFactory: DateTimeFormatterFactory,
		chartResizeHandler: ChartResizeHandler,
	) {
		chartResizeHandler.canvasResized.subscribe(bcr => {
			let calculatedBCR = bcr;
			if (!calculatedBCR) {
				calculatedBCR = this.canvasModel.canvas.getBoundingClientRect();
			}
			this.updateCanvasOnPageLocation(calculatedBCR);
			this.recalculateBounds();
		});
		this.yAxisBoundsContainer = new YAxisBoundsContainer(this.config, this.canvasModel);
	}

	public updateYAxisWidths() {
		const widths = this.yAxisBoundsContainer.getYAxisWidths();
		this.setYAxisWidths(widths);
	}

	/**
	 * Adds a pane to the list of panes and recalculates the height ratios of all panes.
	 * @param {string} uuid - The unique identifier of the pane to be added.
	 * @param {number} [order] - The order in which the pane should be added. If not provided, the pane will be added to the end of the list.
	 */
	public addPaneBounds(uuid: string, order?: number) {
		if (this.panesOrder.indexOf(uuid) === -1) {
			this.panesOrder.push(uuid);
			if (order !== undefined) {
				const idx = this.panesOrder.indexOf(uuid);
				moveInArrayMutable(this.panesOrder, idx, order);
			}
			this.recalculatePanesHeightRatios();
			this.panesOrderChangedSubject.next(this.panesOrder);
		}
	}
	/**
     * Overrides the height ratios of the chart with the provided height ratios.
     * @param {Record<string, number>} heightRatios - An object containing the height ratios to be set.
     * @returns {void}
     * @throws {Error} If the sum of the height ratios is not equal to 1.
     
    */
	public overrideChartHeightRatios(heightRatios: Record<string, number>) {
		const resultRatio = {
			...this.graphsHeightRatio,
			...heightRatios,
		};
		const ratioSum = Object.values(resultRatio).reduce((sum, ratio) => sum + ratio, 0);
		if (Math.abs(ratioSum - 1) < PRECISION_DIFFERENCE) {
			this._graphsHeightRatio = resultRatio;
			this.recalculateBounds();
		} else {
			console.error(`Result ratio should be equal 1, but equal ${ratioSum}`);
		}
	}
	/**
	 * Moves a pane up in the panesOrder array.
	 * @param {string} uuid - The unique identifier of the pane to be moved.
	 * @returns {void}
	 */
	public movePaneUp(uuid: string) {
		const idx = this.panesOrder.indexOf(uuid);
		if (idx !== -1) {
			moveInArrayMutable(this.panesOrder, idx, idx - 1);
			this.recalculateBounds();
			this.eventBus.fireDraw();
			this.panesOrderChangedSubject.next(this.panesOrder);
		}
	}
	/**
	 * Moves the pane down in the panesOrder array.
	 * @param {string} uuid - The unique identifier of the pane to be moved.
	 * @returns {void}
	 */
	public movePaneDown(uuid: string) {
		const idx = this.panesOrder.indexOf(uuid);
		if (idx !== -1) {
			moveInArrayMutable(this.panesOrder, idx, idx + 1);
			this.recalculateBounds();
			this.eventBus.fireDraw();
			this.panesOrderChangedSubject.next(this.panesOrder);
		}
	}

	/**
	 * Reorders current panes according to newPanesOrder
	 * if element in newPanesOrder doesn't exist in real panes order - it will ignored
	 * Example:
	 * 	panesOrder: ['1', '2', '3']
	 * 	newPanesOrder: ['3', '1']
	 * 	result: ['3', '2', '1']
	 */
	public reorderPanes(newPanesOrder: string[]) {
		this.panesOrder = reorderArray(this.panesOrder, newPanesOrder);
		this.recalculateBounds();
		this.panesOrderChangedSubject.next(this.panesOrder);
	}

	/**
	 * Removes the bounds of a pane with the given uuid from the canvas element.
	 * @param {string} uuid - The uuid of the pane to remove.
	 * @returns {void}
	 */
	public removedPaneBounds(uuid: string) {
		arrayRemove2(this.panesOrder, uuid);
		delete this.graphsHeightRatio[uuid];
		delete this.bounds[CanvasElement.PANE_UUID(uuid)];
		this.yAxisWidths.left
			.concat(this.yAxisWidths.right)
			.forEach((_, idx) => delete this.bounds[CanvasElement.PANE_UUID_Y_AXIS(uuid, idx)]);
		delete this.bounds[CanvasElement.PANE_UUID_RESIZER(uuid)];
		this.recalculatePanesHeightRatios();
		this.panesOrderChangedSubject.next(this.panesOrder);
	}
	/**
	 * Recalculates the bounds of the chart elements based on the current configuration and canvas size.
	 * The function updates the bounds of the canvas, the main chart, the panes, the y-axis, and the chart with y-axis.
	 * It also updates the navigation map element bounds, all bounds page coordinates, and notifies the bounds subscribers.
	 * @function
	 * @name recalculateBounds
	 * @memberof ChartWidget
	 * @returns {void}
	 */
	recalculateBounds() {
		const canvasW = this.canvasOnPageLocation.width;
		const canvasH = this.canvasOnPageLocation.height;
		const paneResizerHeight = this.config.components.paneResizer.height;
		// whole canvas bounds
		const canvas = this.getBounds(CanvasElement.CANVAS);
		canvas.x = 0;
		canvas.y = 0;
		canvas.width = canvasW;
		canvas.height = canvasH;
		const yAxisWidths = this.getYAxisWidth();
		const nMap = this.getNavMapBounds(canvas);
		const xAxis = this.getXAxisBounds(nMap, canvas);
		const chartHeight = canvasH - xAxis.height - nMap.height;
		const totalYAxisWidthLeft = yAxisWidths.left.reduce((sum, width) => sum + width, 0);
		const totalYAxisWidthRight = yAxisWidths.right.reduce((sum, width) => sum + width, 0);

		// main chart
		const yAxisXLeft = 0;
		const yAxisXRight = canvas.width - totalYAxisWidthRight;
		const paneXStart = yAxisXLeft + totalYAxisWidthLeft;
		const initialY = 0;
		const chartWidth = canvas.width - totalYAxisWidthLeft - totalYAxisWidthRight;
		let nextY = initialY;
		// panes
		this.panesOrder.forEach((uuid, index) => {
			const paneHeightRatio = this.graphsHeightRatio[this.panesOrder[index]];
			const resizerVisible = this.config.components.paneResizer.visible;
			if (resizerVisible) {
				if (index !== 0) {
					upsertBounds(
						this.bounds,
						CanvasElement.PANE_UUID_RESIZER(uuid),
						0,
						nextY,
						canvas.width,
						paneResizerHeight,
						this.canvasOnPageLocation,
					);
				} else {
					upsertBounds(
						this.bounds,
						CanvasElement.PANE_UUID_RESIZER(uuid),
						0,
						0,
						0,
						0,
						this.canvasOnPageLocation,
					);
				}
			}
			const paneBounds = upsertBounds(
				this.bounds,
				CanvasElement.PANE_UUID(uuid),
				paneXStart,
				resizerVisible ? nextY + paneResizerHeight : nextY,
				chartWidth,
				resizerVisible
					? chartHeight * paneHeightRatio - this.config.components.paneResizer.height
					: chartHeight * paneHeightRatio,
				this.canvasOnPageLocation,
			);
			// y axis
			if (this.config.components.yAxis.visible) {
				const extents = this.yAxisBoundsContainer.extentsOrder.get(uuid);
				if (extents === undefined) {
					return;
				}

				const y = resizerVisible ? nextY + paneResizerHeight : nextY;
				const height = resizerVisible
					? chartHeight * paneHeightRatio - paneResizerHeight
					: chartHeight * paneHeightRatio;

				let startXLeft = paneXStart - (yAxisWidths.left[0] ?? 0); // we need to provide right to left order on the left y-axis side
				let startXRight = yAxisXRight;

				extents.left.forEach((extentIdx, i) => {
					upsertBounds(
						this.bounds,
						CanvasElement.PANE_UUID_Y_AXIS(uuid, extentIdx),
						startXLeft,
						y,
						yAxisWidths.left[i],
						height,
						this.canvasOnPageLocation,
					);
					startXLeft -= yAxisWidths.left[i + 1] ?? 0;
				});
				extents.right.forEach((extentIdx, i) => {
					upsertBounds(
						this.bounds,
						CanvasElement.PANE_UUID_Y_AXIS(uuid, extentIdx),
						startXRight,
						y,
						yAxisWidths.right[i],
						height,
						this.canvasOnPageLocation,
					);
					startXRight += yAxisWidths.right[i];
				});
			} else {
				upsertBounds(this.bounds, CanvasElement.PANE_UUID_Y_AXIS(uuid), 0, 0, 0, 0, this.canvasOnPageLocation);
			}
			nextY = paneBounds.y + paneBounds.height;
		});
		const allPanesBounds = this.getBounds(CanvasElement.ALL_PANES);
		allPanesBounds.x = paneXStart;
		allPanesBounds.y = initialY;
		allPanesBounds.width = chartWidth;
		allPanesBounds.height = nextY;
		// chart with Y axis
		const chartWithYAxis = this.getBounds(CanvasElement.CHART_WITH_Y_AXIS);
		const chartBounds = this.getBounds(CanvasElement.PANE_UUID(CHART_UUID));
		this.getEventsBounds(chartBounds);
		this.copyBounds(chartBounds, chartWithYAxis);
		chartWithYAxis.width = canvas.width;
		this.recalculateNavigationMapElementBounds();
		this.updateAllBoundsPageCoordinates();
		this.notifyBoundsSubscribers();
	}

	/**
	 * Updates the canvasOnPageLocation property with the provided PickedDOMRect object.
	 * @param {PickedDOMRect} bcr - The PickedDOMRect object containing the new values for x, y, width, and height.
	 * @private
	 */
	private updateCanvasOnPageLocation(bcr: PickedDOMRect) {
		this.canvasOnPageLocation = {
			...this.canvasOnPageLocation,
			x: bcr.x,
			y: bcr.y,
			width: bcr.width,
			height: bcr.height,
		};
	}

	/**
	 * Updates the page coordinates of all bounds.
	 * @private
	 */
	private updateAllBoundsPageCoordinates() {
		for (const name of Object.keys(this.bounds)) {
			const bound = this.bounds[name];
			bound.pageX = bound.x + this.canvasOnPageLocation.x;
			bound.pageY = bound.y + this.canvasOnPageLocation.y;
		}
	}

	/**
	 * Returns the bounds of the events component.
	 * @private
	 * @param {Bounds} chartPane - The bounds of the chart pane.
	 * @returns {Bounds} - The bounds of the events component.
	 */
	private getEventsBounds(chartPane: Bounds): Bounds {
		const events = this.getBounds(CanvasElement.EVENTS);
		if (this.config.components.events.visible) {
			events.x = 0;
			events.y = chartPane.y + chartPane.height - this.config.components.events.height;
			events.width = chartPane.width;
			events.height = this.config.components.events.height;
		} else {
			this.applyDefaultBounds(events);
		}
		return events;
	}

	/**
	 * Returns the bounds of the navigation map element.
	 * @param {Bounds} canvas - The bounds of the canvas element.
	 * @returns {Bounds} - The bounds of the navigation map element.
	 * @private
	 */
	private getNavMapBounds(canvas: Bounds): Bounds {
		const nMap = this.getBounds(CanvasElement.N_MAP);
		if (this.config.components.navigationMap.visible) {
			nMap.x = 0;
			nMap.y = canvas.height - N_MAP_H;
			nMap.width = canvas.width;
			nMap.height = N_MAP_H;
		} else {
			this.applyDefaultBounds(nMap);
		}
		return nMap;
	}

	/**
	 * Returns the bounds of the X axis based on the provided parameters.
	 * @private
	 * @param {Bounds} nMap - The bounds of the nMap.
	 * @param {Bounds} canvas - The bounds of the canvas.
	 * @returns {Bounds} - The bounds of the X axis.
	 */
	private getXAxisBounds(nMap: Bounds, canvas: Bounds): Bounds {
		const xAxis = this.getBounds(CanvasElement.X_AXIS);
		if (this.config.components.xAxis.visible) {
			xAxis.x = 0;
			xAxis.y = canvas.height - this.getXAxisHeight() - nMap.height;
			xAxis.width = canvas.width;
			xAxis.height = this.getXAxisHeight();
		} else {
			this.applyDefaultBounds(xAxis);
		}
		return xAxis;
	}

	/**
	 * Calculates the height of the X axis based on the font size, font family and padding values.
	 * If the height has already been calculated, it returns the cached value.
	 * @returns {number} The height of the X axis.
	 */
	getXAxisHeight() {
		if (!this.xAxisHeight) {
			const font = this.config.components.xAxis.fontSize + 'px ' + this.config.components.xAxis.fontFamily;
			const fontHeight = calculateSymbolHeight(font, this.canvasModel.ctx);
			this.xAxisHeight =
				fontHeight +
				(this.config.components.xAxis.padding.top ?? 0) +
				(this.config.components.xAxis.padding.bottom ?? 0);
		}
		return this.xAxisHeight;
	}

	/**
	 * Sets the width of the Y axis.
	 *
	 * @param {YAxisWidths} yAxisWidths - The width of the Y axis.
	 * @returns {void}
	 */
	public setYAxisWidths(yAxisWidths: YAxisWidths): void {
		if (
			!arrayCompare(this.yAxisWidths.left, yAxisWidths.left) ||
			!arrayCompare(this.yAxisWidths.right, yAxisWidths.right)
		) {
			this.yAxisWidths = yAxisWidths;
			this.recalculateBounds();
		}
	}

	/**
	 *
	 * Sets the height of the X axis.
	 * @param {number} xAxisHeight - The height of the X axis.
	 * @returns {void}
	 */
	public setXAxisHeight(xAxisHeight: number): void {
		if (xAxisHeight !== this.xAxisHeight) {
			this.xAxisHeight = xAxisHeight;
			this.recalculateBounds();
		}
	}

	/**
	 * Sets the order of the panes.
	 * @param {string[]} panesOrder - An array of strings representing the order of the panes.
	 * @returns {void}
	 */
	public setPanesOrder(panesOrder: string[]): void {
		this.panesOrder = panesOrder;
		this.recalculateBounds();
	}

	/**
	 * Returns the widths of the Y axis if it is visible, otherwise returns [0].
	 * @returns {number} The width of the Y axis.
	 */
	private getYAxisWidth(): YAxisWidths {
		return this.config.components.yAxis.visible
			? this.yAxisWidths
			: {
					right: [0],
					left: [0],
			  };
	}

	/**
	 * Recalculates the height ratios of the panes by calling the calculateGraphsHeightRatios() and recalculateBounds() methods.
	 */
	recalculatePanesHeightRatios() {
		this.calculateGraphsHeightRatios();
		this.recalculateBounds();
	}

	/**
	 * Calculates the height ratios of the graphs in the chart.
	 * It first gets the height ratio of the main chart and then calculates the height ratios of the other graphs.
	 * It then calculates the free space available for the other graphs and distributes it among them based on their previous height ratios.
	 * If there are new graphs added, it calculates their height ratios based on the number of new graphs and the total number of graphs.
	 * @private
	 */
	private calculateGraphsHeightRatios() {
		let chartRatio = this.graphsHeightRatio[CHART_UUID];
		// NOTE: pec stands for panesExceptMainChart
		const pec: Array<string> = [];
		pec.push(...this.panesOrder.filter(p => p !== CHART_UUID));
		this.panesOrder.forEach(pane => {
			if (this.graphsHeightRatio[pane] === 0) {
				delete this.graphsHeightRatio[pane];
			}
		});
		const pecRatios = pec.map(graph =>
			this.graphsHeightRatio[graph] === undefined ? undefined : this.graphsHeightRatio[graph],
		);
		const oldPecNumber = pecRatios.filter(ratio => ratio !== undefined).length;
		const newPecNumber = pecRatios.filter(ratio => ratio === undefined).length;
		let freeRatioForPec = 0;
		let freeRatio = 0;
		let ratioForOldPec = 1;
		let ratioForNewPec = 0;
		if (newPecNumber > 0) {
			[ratioForOldPec, ratioForNewPec] = getHeightRatios(pec.length);
			chartRatio *= ratioForOldPec;
		}
		if (oldPecNumber === 0) {
			chartRatio = 1 - ratioForNewPec * newPecNumber;
		}
		freeRatio = 1 - chartRatio - ratioForNewPec * newPecNumber;
		pecRatios.forEach(ratio => {
			if (ratio) {
				freeRatio -= ratio * ratioForOldPec;
			}
		});
		freeRatioForPec = freeRatio / (pec.length + 1);
		const proportions = pecRatios.map(ratio =>
			ratio ? ratio * ratioForOldPec + freeRatioForPec : ratioForNewPec + freeRatioForPec,
		);
		chartRatio += freeRatioForPec;
		this._graphsHeightRatio = {};
		this.graphsHeightRatio[CHART_UUID] = chartRatio;
		proportions.forEach((ratio, index) => {
			const name = pec[index];
			this.graphsHeightRatio[name] = ratio;
		});
	}

	/**
	 * Recalculates the bounds of the navigation map elements based on the current configuration and viewport.
	 * If the navigation map is visible, it calculates the bounds of the following elements:
	 * - Navigation map
	 * - Time labels
	 * - Left and right buttons
	 * - Knots
	 * - Slider
	 * - Chart
	 *
	 * The bounds of each element are calculated based on the current viewport and configuration values.
	 * If the time labels are visible, it calculates the width of the left and right time labels based on the first and last visible candle timestamps.
	 * The width of the time labels is used to calculate the position and size of the left and right buttons, as well as the position of the knots.
	 * The position and size of the knots are calculated based on the left and right ratios, which represent the position of the knots relative to the left and right buttons.
	 * The position and size of the slider and chart are calculated based on the position and size of the knots and buttons.
	 */
	recalculateNavigationMapElementBounds() {
		if (this.config.components.navigationMap.visible) {
			const nMap = this.getBounds(CanvasElement.N_MAP);
			const { height, width } = this.config.components.navigationMap.knots;
			const knotHeightFromConfig = height ?? 0;
			const knotWidthFromConfig = isMobile() ? width * KNOTS_W_MOBILE_MULTIPLIER : width ?? 0;
			const knotY = !knotHeightFromConfig ? nMap.y : nMap.y + (nMap.height - knotHeightFromConfig) / 2;
			// time labels
			const timeLabelsVisible = this.config.components.navigationMap?.timeLabels?.visible;
			const calcLabelBounds = (timestamp: number): number => {
				return calcTimeLabelBounds(this.canvasModel.ctx, timestamp, this.formatterFactory, this.config)[0];
			};
			const candleSource = flat(this.mainCandleSeries?.getSeriesInViewport() ?? []);
			const leftTimeLabelWidth =
				timeLabelsVisible && candleSource.length ? calcLabelBounds(candleSource[0].candle.timestamp) : 0;
			const rightTimeLabelWidth =
				timeLabelsVisible && candleSource.length
					? calcLabelBounds(candleSource[candleSource.length - 1].candle.timestamp)
					: 0;
			const timeLabelWidth = Math.max(leftTimeLabelWidth, rightTimeLabelWidth);
			if (timeLabelsVisible) {
				const nMapLabelL = this.getBounds(CanvasElement.N_MAP_LABEL_L);
				nMapLabelL.x = nMap.x;
				nMapLabelL.y = nMap.y;
				nMapLabelL.width = timeLabelWidth;
				nMapLabelL.height = nMap.height;
				const nMapLabelR = this.getBounds(CanvasElement.N_MAP_LABEL_R);
				nMapLabelR.x = nMap.x + nMap.width - timeLabelWidth;
				nMapLabelR.y = nMap.y;
				nMapLabelR.width = timeLabelWidth;
				nMapLabelR.height = nMap.height;
			}
			// buttons left and right
			const nMapBtnL = this.getBounds(CanvasElement.N_MAP_BTN_L);
			nMapBtnL.x = nMap.x + timeLabelWidth;
			nMapBtnL.y = nMap.y;
			nMapBtnL.width = N_MAP_BUTTON_W;
			nMapBtnL.height = nMap.height;
			const nMapBtnR = this.getBounds(CanvasElement.N_MAP_BTN_R);
			nMapBtnR.x = nMap.x + nMap.width - N_MAP_BUTTON_W - timeLabelWidth;
			nMapBtnR.y = nMap.y;
			nMapBtnR.width = N_MAP_BUTTON_W;
			nMapBtnR.height = nMap.height;
			// knots
			// Left drag button
			const knotL = this.getBounds(CanvasElement.N_MAP_KNOT_L);
			knotL.x = (nMapBtnR.x - nMapBtnL.x - nMapBtnL.width) * this.leftRatio + nMapBtnL.x + nMapBtnL.width;
			knotL.y = knotY;
			knotL.width = knotWidthFromConfig ?? N_MAP_KNOT_W;
			knotL.height = knotHeightFromConfig ?? nMap.height;
			// Right drag button
			const knotR = this.getBounds(CanvasElement.N_MAP_KNOT_R);
			knotR.x =
				(nMapBtnR.x - nMapBtnL.x - nMapBtnL.width) * this.rightRatio +
				nMapBtnL.x +
				nMapBtnL.width -
				N_MAP_KNOT_W;
			knotR.y = knotY;
			knotR.width = knotWidthFromConfig ?? N_MAP_KNOT_W;
			knotR.height = knotHeightFromConfig ?? nMap.height;
			// slider
			const slider = this.getBounds(CanvasElement.N_MAP_SLIDER_WINDOW);
			slider.x = knotL.x + knotL.width;
			slider.y = nMap.y;
			slider.width = knotR.x - slider.x;
			slider.height = nMap.height;
			// chart
			const nMapChart = this.getBounds(CanvasElement.N_MAP_CHART);
			nMapChart.x = nMapBtnL.x + nMapBtnL.width;
			nMapChart.y = nMap.y;
			nMapChart.width = nMapBtnR.x - nMapChart.x;
			nMapChart.height = nMap.height;
		}
	}

	/**
	 * Checks if the volumes are set to be visible and if they should be shown in a separate pane
	 *
	 * @returns {boolean} - Returns true if the volumes are set to be visible and if they should be shown in a separate pane, otherwise returns false
	 */
	isVolumesInSeparatePane() {
		return this.config.components.volumes.visible && this.config.components.volumes.showSeparately;
	}
	/**
	 * Gets current canvas element bounds.
	 * @param {string} el - CanvasElement.ELEMENT_NAME
	 * @return {Bounds} bounds of element
	 */
	public getBounds(el: string): Bounds {
		if (this.bounds[el] === undefined) {
			this.bounds[el] = this.copyOf(DEFAULT_BOUNDS);
		}
		return this.bounds[el];
	}
	/**
	 * Returns the position of CANVAS on whole page.
	 * Use it to calculate relative coordinates for mouse movement hit test - crosstool for example.
	 */
	public getCanvasOnPageLocation(): Point {
		return this.canvasOnPageLocation;
	}
	/**
	 * Gets current panes bounds.
	 */
	public getBoundsPanes(): Record<string, Bounds> {
		return this.panesOrder.reduce(
			(acc, uuid) => ({
				...acc,
				[uuid]: this.bounds[CanvasElement.PANE_UUID(uuid)],
			}),
			{},
		);
	}
	/**
	 * Gets hit-test fn for canvas element.
	 * @param {string} el - CanvasElement.ELEMENT_NAME
	 * @param {boolean} reverse - reverses the hit test condition
	 * @param {number} extensionX - extended hitBoundsTest in horizontal direction
	 * @param {number} extensionY - extended hitBoundsTest in vertical direction
	 * @param wholePage
	 * @return {HitBoundsTest} hit-test fn
	 */
	getBoundsHitTest(el: string, options: AtLeastOne<HitBoundsTestOptions> = DEFAULT_HIT_TEST_OPTIONS): HitBoundsTest {
		const { extensionX, extensionY, wholePage } = { ...DEFAULT_HIT_TEST_OPTIONS, ...options };
		if (wholePage) {
			return (x, y) => {
				const bounds = this.getBounds(el);
				const hit =
					x > bounds.pageX - extensionX &&
					x < bounds.pageX + bounds.width + extensionX &&
					y > bounds.pageY - extensionY &&
					y < bounds.pageY + bounds.height + extensionY;
				return hit;
			};
		} else {
			return (x, y) => {
				const bounds = this.getBounds(el);
				const hit =
					x > bounds.x - extensionX &&
					x < bounds.x + bounds.width + extensionX &&
					y > bounds.y - extensionY &&
					y < bounds.y + bounds.height + extensionY;
				return hit;
			};
		}
	}

	/**
	 * Returns a function that tests if a given point is inside a given bounds object.
	 * @param {Bounds} bounds - The bounds object to test against.
	 * @param {Object} options - An object containing options for the hit test.
	 * @param {number} [options.extensionX=0] - The amount of extension in the x-axis.
	 * @param {number} [options.extensionY=0] - The amount of extension in the y-axis.
	 * @param {boolean} [options.wholePage=false] - Whether to test against the whole page or just the bounds object.
	 * @returns {HitBoundsTest} - A function that takes in x and y coordinates and returns true if the point is inside the bounds object.
	 */
	static hitTestOf(
		bounds: Bounds,
		options: AtLeastOne<HitBoundsTestOptions> = DEFAULT_HIT_TEST_OPTIONS,
	): HitBoundsTest {
		const { extensionX, extensionY, wholePage } = { ...DEFAULT_HIT_TEST_OPTIONS, ...options };
		if (!wholePage) {
			return (x, y) => {
				const hit =
					x > bounds.x - extensionX &&
					x < bounds.x + bounds.width + extensionX &&
					y > bounds.y - extensionY &&
					y < bounds.y + bounds.height + extensionY;
				return hit;
			};
		} else {
			return (x, y) => {
				const hit =
					x > bounds.pageX - extensionX &&
					x < bounds.pageX + bounds.width + extensionX &&
					y > bounds.pageY - extensionY &&
					y < bounds.pageY + bounds.height + extensionY;
				return hit;
			};
		}
	}

	/**
	 * This method indicates whether it's possible to render the chart, in particular if its width and height > 0.
	 */
	public isChartBoundsAvailable() {
		const canvasBounds = this.getBounds(CanvasElement.CANVAS);
		return canvasBounds.width > 0 && canvasBounds.height > 0;
	}

	/**
	 * Resizes a pane vertically.
	 * @param {string} uuid - The unique identifier of the pane.
	 * @param {number} y - The amount of pixels to resize the pane by.
	 * @returns {void}
	 */
	resizePaneVertically(uuid: string, y: number) {
		const idx = this.panesOrder.indexOf(uuid);
		const bounds = this.getBounds(CanvasElement.PANE_UUID_RESIZER(uuid));
		this.doResizePaneVertically(idx, bounds.y - y);
		this.barResizerChangedSubject.next();
	}

	/**
	 * Resizes a pane vertically based on the provided index and delta in pixels.
	 * @param {number} idx - The index of the pane to be resized.
	 * @param {number} yDeltaPixels - The delta in pixels to resize the pane.
	 * @returns {void}
	 */
	private doResizePaneVertically(idx: number, yDeltaPixels: number): void {
		const prevPaneIdx = idx - 1;
		const allPanesHeight = this.getBounds(CanvasElement.ALL_PANES).height;
		const minAllowedPaneHeight = this.config.components.paneResizer.height + DEFAULT_MIN_PANE_HEIGHT;
		const resultPaneHeight = allPanesHeight * this.graphsHeightRatio[this.panesOrder[idx]];
		const dependResultPaneHeight = allPanesHeight * this.graphsHeightRatio[this.panesOrder[prevPaneIdx]];
		// check if changes fit allowed minimal pane height
		const fitPane = resultPaneHeight + yDeltaPixels > minAllowedPaneHeight;
		const fitDependPane = dependResultPaneHeight - yDeltaPixels > minAllowedPaneHeight;
		if (fitPane && fitDependPane) {
			// convert pixels to percent
			const yDeltaPercent = yDeltaPixels / allPanesHeight;
			this.graphsHeightRatio[this.panesOrder[idx]] += yDeltaPercent;
			this.graphsHeightRatio[this.panesOrder[prevPaneIdx]] -= yDeltaPercent;
			this.recalculateBounds();
		}
	}

	/**
	 * Notifies all subscribers about bounds changes
	 * @function
	 * @name notifyBoundsSubscribers
	 * @returns {void}
	 */
	private notifyBoundsSubscribers() {
		Object.keys(this.boundsChangedSubscriptions).forEach(el => {
			const subject = this.boundsChangedSubscriptions[el];
			subject.next(this.getBounds(el));
		});
		this.boundsChangedSubject.next();
	}

	/**
	 * Subscribe to element bounds changes.
	 * Multiple subscriptions will share the same subject.
	 * @param el - element name
	 */
	public observeBoundsChanged(el: string) {
		let sub = this.boundsChangedSubscriptions[el];
		if (!sub) {
			sub = new BehaviorSubject(this.getBounds(el));
			this.boundsChangedSubscriptions[el] = sub;
		}
		return sub.pipe(
			map(b => this.copyOf(b)),
			distinctUntilChanged((b1, b2) => this.sameBounds(b1, b2)),
		);
	}

	/**
	 * Returns an observable that emits when the bounds of the object change.
	 * @returns {Observable} An observable that emits when the bounds of the object change.
	 */
	public observeAnyBoundsChanged() {
		return this.boundsChangedSubject.asObservable();
	}

	/**
	 * Creates a copy of the provided bounds object.
	 *
	 * @private
	 * @param {Bounds} bounds - The bounds object to be copied.
	 * @returns {Bounds} - A new bounds object with the same properties as the original.
	 */
	private copyOf(bounds: Bounds): Bounds {
		return {
			...bounds,
		};
	}

	/**
	 * Copies the values of the `from` object to the `to` object.
	 * @param {Bounds} from - The object to copy the values from.
	 * @param {Bounds} to - The object to copy the values to.
	 */
	private copyBounds(from: Bounds, to: Bounds) {
		to.x = from.x;
		to.y = from.y;
		to.width = from.width;
		to.height = from.height;
	}

	/**
	 * Checks if two Bounds objects have the same x, y, width and height values.
	 * @param {Bounds} b1 - The first Bounds object to compare.
	 * @param {Bounds} b2 - The second Bounds object to compare.
	 * @returns {boolean} - Returns true if both Bounds objects have the same x, y, width and height values, otherwise returns false.
	 */
	private sameBounds(b1: Bounds, b2: Bounds): boolean {
		return b1.x === b2.x && b1.y === b2.y && b1.width === b2.width && b1.height === b2.height;
	}

	/**
	 * Applies default bounds to the provided bounds object.
	 * @param {Bounds} bounds - The bounds object to apply default bounds to.
	 * @returns {void}
	 * @private
	 */
	private applyDefaultBounds(bounds: Bounds) {
		this.copyBounds(DEFAULT_BOUNDS, bounds);
	}

	/**
	 * Sets the main candle series for the CanvasBoundsContainer.
	 * @param {CandleSeriesModel} candleSeries - The candle series to be set as the main candle series.
	 * @returns {void}
	 * @deprecated This method should be removed as candleSeries is not a part of CanvasBoundsContainer.
	 */
	setMainCandleSeries(candleSeries: CandleSeriesModel) {
		this.mainCandleSeries = candleSeries;
	}
}

// paneCounter=chartHeightRatio: 0=1, 1=0.8, 2=0.6, 3=0.5, 4=0.4, 5=0.4
const DEFAULT_RATIOS: Record<number, number> = {
	0: 1,
	1: 0.8,
	2: 0.6,
	3: 0.5,
	4: 0.4,
	5: 0.2,
};

// NOTE: pec stands for panes except main chart
const getHeightRatios = (pecLength: number): [number, number] => {
	const chartHeightRatio = DEFAULT_RATIOS[pecLength] ?? 0.4;
	const singlePecHeightRatio = (1 - chartHeightRatio) / pecLength;
	return [chartHeightRatio, singlePecHeightRatio];
};

export const isInBounds = (point: Point, bounds: Bounds) =>
	point.x > bounds.x && point.x < bounds.x + bounds.width && point.y > bounds.y && point.y < bounds.y + bounds.height;

export const isInVerticalBounds = (y: number, bounds: Bounds) => y > bounds.y && y < bounds.y + bounds.height;

const upsertBounds = (
	storage: Record<string, Bounds>,
	uuid: string,
	x: number,
	y: number,
	width: number,
	height: number,
	canvasOnPageLocation: Point,
): Bounds => {
	const existing = storage[uuid];
	if (existing) {
		existing.x = x;
		existing.y = y;
		existing.pageX = x + canvasOnPageLocation.x;
		existing.pageY = y + canvasOnPageLocation.y;
		existing.width = width;
		existing.height = height;
		return existing;
	}
	const newly = {
		x,
		y,
		pageX: x + canvasOnPageLocation.x,
		pageY: y + canvasOnPageLocation.y,
		width,
		height,
	};
	storage[uuid] = newly;
	return newly;
};

export const limitYToBounds = (y: Pixel, bounds: Bounds) => Math.min(Math.max(y, bounds.y), bounds.y + bounds.height);

export interface HitBoundsTest {
	(x: number, y: number): boolean;
}

export interface HitBoundsTestOptions {
	extensionX: number;
	extensionY: number;
	wholePage: boolean;
}

export type HitBoundsTestOptionsPartial = AtLeastOne<HitBoundsTestOptions>;

export const DEFAULT_HIT_TEST_OPTIONS: HitBoundsTestOptions = {
	extensionX: 0,
	extensionY: 0,
	wholePage: false,
};

export const areBoundsChanged = (prev: Bounds, next: Bounds) => {
	return prev.width === next.width && prev.height === next.height;
};
