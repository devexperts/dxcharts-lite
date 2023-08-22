import { Drawer, DrawingManager } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { LinkedList, convertArrayToLinkedList } from '../../utils/linkedList.utils';
import { PaneManager } from '../pane/pane-manager.component';
import { DynamicObjectsDrawer } from './dynamic-objects.drawer';
import { DynamicObject, DynamicObjectsModel, PaneId } from './dynamic-objects.model';
import { flatMap } from '../../utils/array.utils';
import { DataSeriesDrawer } from '../../drawers/data-series.drawer';
import { DataSeriesModel } from '../../model/data-series.model';
import { VolumesModel } from '../volumes/volumes.model';
import { ChartComponent } from '../chart/chart.component';
import { VolumesDrawer } from '../volumes/volumes.drawer';
import { FullChartConfig } from '../../chart.config';
import { VolumesComponent } from '../volumes/volumes.component';
import { ScaleModel } from '../../model/scale.model';
import { CandleSeriesModel } from '../../model/candle-series.model';
import { CHART_UUID } from '../../canvas/canvas-bounds-container';

export class DynamicObjectsComponent extends ChartBaseElement {
	model: DynamicObjectsModel<DynamicObject>;
	public objects: Record<PaneId, LinkedList<DynamicObject>>;
	chartComponent: ChartComponent;
	paneManager: PaneManager;
	canvasModel: CanvasModel;
	dataSeriesDrawer: DataSeriesDrawer;
	volumesDrawer: VolumesDrawer;

	constructor(
		canvasModel: CanvasModel,
		drawingManager: DrawingManager,
		paneManager: PaneManager,
		chartComponent: ChartComponent,
		config: FullChartConfig,
		volumesComponent: VolumesComponent,
		scaleModel: ScaleModel,
	) {
		// init
		super();
		this.chartComponent = chartComponent;
		this.paneManager = paneManager;
		this.canvasModel = canvasModel;
		const dataSeriesDrawers = this.chartComponent._dataSeriesDrawers;
		const dataSeriesDrawer = new DataSeriesDrawer(this.paneManager, this.canvasModel, dataSeriesDrawers);
		this.dataSeriesDrawer = dataSeriesDrawer;
		const volumesDrawer = new VolumesDrawer(
			canvasModel,
			config,
			volumesComponent.volumesModel,
			chartComponent.chartModel,
			scaleModel,
			volumesComponent.volumesColorByChartTypeMap,
			() => !config.components.volumes.showSeparately,
		);
		this.volumesDrawer = volumesDrawer;
		const initObjects = this.getObjectsList(
			this.dataSeriesDrawer,
			this.volumesDrawer,
			this.chartComponent.chartModel.mainCandleSeries,
		);
		this.objects = initObjects;

		// model
		const dynamicObjectsModel = new DynamicObjectsModel(this.objects, chartComponent);
		this.model = dynamicObjectsModel;
		this.addChildEntity(dynamicObjectsModel);

		// drawer
		const dynamicObjectsDrawer = new DynamicObjectsDrawer(dynamicObjectsModel, canvasModel);
		drawingManager.addDrawer(dynamicObjectsDrawer, 'DYNAMIC_OBJECTS');
	}

	private getObjectsList(
		dataSeriesDrawer: DataSeriesDrawer,
		volumesDrawer: VolumesDrawer,
		mainCandleSeries: CandleSeriesModel,
	): Record<PaneId, LinkedList<DynamicObject>> {
		const components = flatMap(Object.values(this.paneManager.paneComponents), c => c.yExtentComponents);
		// each pane has it's own order
		// TODO: make volume a data series to avoid a hack which adds it manually
		const objects: Record<PaneId, LinkedList<DynamicObject>> = components.map(c => {
			const componentSeries = components
				.filter(innerC => innerC.paneUuid === c.paneUuid)
				.map(cc => {
					const innerCCObjects: DynamicObject[] = [];
					// add volumes as a dynamic object to the separate volume pane
					if (cc.paneUuid === 'volumes') {
						innerCCObjects.push({ model: mainCandleSeries, drawer: volumesDrawer });
						return convertArrayToLinkedList(innerCCObjects);
					}
					cc.dataSeries.forEach((series: DataSeriesModel) => {
						innerCCObjects.push(this.transformIntoDynamicObject(series, dataSeriesDrawer));
					});
					// add volumes as a dynamic object to the chart pane
					if (cc.paneUuid === CHART_UUID) {
						innerCCObjects.push({ model: mainCandleSeries, drawer: volumesDrawer });
					}
					return convertArrayToLinkedList(innerCCObjects);
				});
			return { [c.paneUuid]: componentSeries[0] };
		})[0];

		console.log(objects);

		return objects;
	}

	private transformIntoDynamicObject(model: DataSeriesModel | VolumesModel | unknown, dataSeriesDrawer: Drawer): any {
		if (model instanceof DataSeriesModel) {
			return {
				model,
				drawer: dataSeriesDrawer,
			};
		}

		// if not dataseries => drawing
		return {};
	}

	protected doActivate() {
		super.doActivate();
		this.chartComponent.chartModel.candlesSetSubject.subscribe(() => {
			const objectsList = this.getObjectsList(
				this.dataSeriesDrawer,
				this.volumesDrawer,
				this.chartComponent.chartModel.mainCandleSeries,
			);
			this.model.setDynamicObjects(objectsList);
		});
	}
}
