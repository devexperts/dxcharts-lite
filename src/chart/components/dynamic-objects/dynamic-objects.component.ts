import { Drawer, DrawingManager } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { LinkedList, convertArrayToLinkedList } from '../../utils/linkedList.utils';
import { PaneManager } from '../pane/pane-manager.component';
import { DynamicObjectsDrawer } from './dynamic-objects.drawer';
import { DynamicObject, DynamicObjectsModel } from './dynamic-objects.model';
import { flatMap } from '../../utils/array.utils';
import { DataSeriesDrawer } from '../../drawers/data-series.drawer';
import { DataSeriesModel } from '../../model/data-series.model';
import { VolumesModel } from '../volumes/volumes.model';
import { ChartComponent } from '../chart/chart.component';
import { VolumesDrawer } from '../volumes/volumes.drawer';

export class DynamicObjectsComponent extends ChartBaseElement {
	model: DynamicObjectsModel<DynamicObject>;
	public objects: LinkedList<DynamicObject>;
	chartComponent: ChartComponent;
	paneManager: PaneManager;
	canvasModel: CanvasModel;
	dataSeriesDrawer: DataSeriesDrawer;

	constructor(
		canvasModel: CanvasModel,
		drawingManager: DrawingManager,
		paneManager: PaneManager,
		chartComponent: ChartComponent,
	) {
		super();
		this.chartComponent = chartComponent;
		this.paneManager = paneManager;
		this.canvasModel = canvasModel;
		// init
		const dataSeriesDrawers = this.chartComponent._dataSeriesDrawers;
		const dataSeriesDrawer = new DataSeriesDrawer(this.paneManager, this.canvasModel, dataSeriesDrawers);
		// const volumesDrawer = new VolumesDrawer(
		// 	canvasModel,
		// 	config,
		// 	volumesModel,
		// 	chartComponent.chartModel,
		// 	scaleModel,
		// 	this.volumesColorByChartTypeMap,
		// 	() => !config.components.volumes.showSeparately,
		// );
		// drawingManager.addDrawer(volumesDrawer, 'VOLUMES');
		this.dataSeriesDrawer = dataSeriesDrawer;
		const initObjects = this.getObjectsList(this.dataSeriesDrawer);
		this.objects = initObjects;

		// model
		const dynamicObjectsModel = new DynamicObjectsModel(this.objects, chartComponent);
		this.model = dynamicObjectsModel;
		this.addChildEntity(dynamicObjectsModel);

		// drawer
		const dynamicObjectsDrawer = new DynamicObjectsDrawer(dynamicObjectsModel, canvasModel);
		drawingManager.addDrawer(dynamicObjectsDrawer, 'DYNAMIC_OBJECTS');
	}

	private getObjectsList(dataSeriesDrawer: DataSeriesDrawer) {
		const series = flatMap(Object.values(this.paneManager.paneComponents), c => c.yExtentComponents).map(comp => {
			return comp.dataSeries;
		});
		const seriesModels = [...series[0]];
		const dynamicObjects: DynamicObject[] = seriesModels.map(model =>
			this.transformIntoDynamicObject(model, dataSeriesDrawer),
		);
		const dynamicObjLinkedList = convertArrayToLinkedList(dynamicObjects);
		return dynamicObjLinkedList;
	}

	private transformIntoDynamicObject(model: DataSeriesModel | VolumesModel | unknown, dataSeriesDrawer: Drawer): any {
		if (model instanceof DataSeriesModel) {
			return {
				model,
				drawer: dataSeriesDrawer,
			};
		}

		if (model instanceof VolumesModel) {
			return {
				model,
				drawer: 'VOLUMES',
			};
		}
		// if not volume or dataseries => drawing
		return {};
	}

	protected doActivate() {
		super.doActivate();
		this.chartComponent.chartModel.candlesSetSubject.subscribe(() => {
			const objectsList = this.getObjectsList(this.dataSeriesDrawer);
			this.model.setDynamicObjects(objectsList);
		});
	}
}
