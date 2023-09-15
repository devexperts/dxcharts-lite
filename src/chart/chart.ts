import ChartBootstrap from './bootstrap';
import { BarType, PartialChartConfig } from './chart.config';
import { CandleSeries } from './components/chart/chart.component';
import { PaneComponent, YExtentFormatters } from './components/pane/pane.component';

/**
 * New shiny chart wrapper
 */
export class Chart extends ChartBootstrap {
	public yAxis = this.yAxisComponent;
	public xAxis = this.xAxisComponent;
	public watermark = this.watermarkComponent;
	public highlights = this.highlightsComponent;
	public events = this.eventsComponent;
	public snapshot = this.snapshotComponent;
	public crosshair = this.crossToolComponent;
	public navigationMap = this.navigationMapComponent;
	public volumes = this.volumesComponent;
	public cursors = this.cursorHandler;
	public data = this.chartComponent;
	public scale = this.scaleModel;
	public panning = this.chartPanComponent;
	public bounds = this.canvasBoundsContainer;
	public hover = this.hoverProducer;

	constructor(element: HTMLElement, config: PartialChartConfig = {}) {
		super(element, config);
	}

	/**
	 * Registers number formatters for pane
	 * @param uuid - pane's id
	 * @param formatters - object, that contains 3 fileds: 'regular', 'percent', 'logarithmic'.
	 * Each filed must have it's own formatter.
	 * If 'percent' and 'logarithmic' formatters did not provided, 'regular' will be applied.
	 */
	public registerPaneFormatters(uuid: string, formatters: YExtentFormatters) {
		this.paneManager.panes[uuid]?.setPaneValueFormatters(formatters);
	}

	/**
	 * Contains tear-down logic for chart
	 * Use when you want to unmount the chart from the host app
	 */
	public destroy() {
		this.bus.setMuted(true);
		this.chartComponents.forEach(c => c.disable());
		this.parentElement.childNodes.forEach(n => n.remove());
		this.parentElement.style.width = '';
		this.parentElement.style.height = '';
	}

	/**
	 * Sets the visibility of the volumes separately and updates the yAxis width.
	 * @param {boolean} separate - A boolean value indicating whether to show the volumes separately or not. Default value is false.
	 */
	public showSeparateVolumes(separate: boolean = false) {
		if (this.volumes) {
			this.volumes.setShowVolumesSeparatly(separate);
			this.bounds.updateYAxisWidths();
		}
	}

	public setData(data: CandleSeries | CandleSeries[]) {
		if (Array.isArray(data)) {
			if (data.length === 0) {
				return;
			}
			const [mainSeries, ...restSeries] = data;
			this.chartComponent.setAllSeries(mainSeries, restSeries);
		} else {
			this.chartComponent.setMainSeries(data);
		}
	}

	public updateData(data: CandleSeries | CandleSeries[]) {
		if (Array.isArray(data)) {
			if (data.length === 0) {
				return;
			}
			const [mainSeries, ...restSeries] = data;
			this.chartComponent.updateAllSeries(mainSeries, restSeries);
		} else {
			this.chartComponent.updateAllSeries(data);
		}
	}

	/**
	 * Sets the auto scale property of the scale model.
	 * @param {boolean} auto - A boolean value indicating whether the auto scale is enabled or not. Default value is true.
	 */
	public setAutoScale(auto: boolean = true) {
		this.scale.autoScale(auto);
	}

	/**
	 * Sets the right-to-left (RTL) configuration of the component.
	 *
	 * @param {boolean} rtl - A boolean value indicating whether the component should be displayed in RTL mode.
	 * @returns {void}
	 */
	public setRtl(rtl: boolean) {
		this.config.rtl = rtl;
		this.bus.fireDraw();
	}

	public setChartType(type: BarType): void {
		this.chartComponent.setChartType(type);
	}

	public createPane(): PaneComponent {
		return this.paneManager.createPane();
	}
}
