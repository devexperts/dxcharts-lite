import { Drawer, DrawingManager } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { LinkedList, convertArrayToLinkedList, convertLinkedListToArray } from '../../utils/linkedList.utils';
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
import { merge } from 'rxjs';

export class DynamicObjectsComponent extends ChartBaseElement {
	public model: DynamicObjectsModel<DynamicObject>;
	public objects: Record<PaneId, LinkedList<DynamicObject>>[];
	private chartComponent: ChartComponent;
	private paneManager: PaneManager;
	private dataSeriesDrawer: DataSeriesDrawer;
	private volumesDrawer: VolumesDrawer;

	constructor(
		canvasModel: CanvasModel,
		drawingManager: DrawingManager,
		paneManager: PaneManager,
		chartComponent: ChartComponent,
		config: FullChartConfig,
		volumesComponent: VolumesComponent,
		scaleModel: ScaleModel,
	) {
		super();
		this.chartComponent = chartComponent;
		this.paneManager = paneManager;

		const dataSeriesDrawers = this.chartComponent._dataSeriesDrawers;
		const dataSeriesDrawer = new DataSeriesDrawer(this.paneManager, canvasModel, dataSeriesDrawers);
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
		const initObjects = this.getDynamicObjects(
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

	/**
	 * Takes panes models of dataseries and transform them into linked list of dynamic objects (each pane has separate list)
	 * Also combines with outer dynamic objects (only drawings so far)
	 * @param dataSeriesDrawer
	 * @param volumesDrawer
	 * @param mainCandleSeries
	 */
	private getDynamicObjects(
		dataSeriesDrawer: DataSeriesDrawer,
		volumesDrawer: VolumesDrawer,
		mainCandleSeries: CandleSeriesModel,
	): Record<PaneId, LinkedList<DynamicObject>>[] {
		const yExtendComponents = flatMap(Object.values(this.paneManager.paneComponents), c => c.yExtentComponents);
		// TODO: make volume a data series to avoid a hack which adds it manually
		const objects: Record<PaneId, LinkedList<DynamicObject>>[] = yExtendComponents.map(comp => {
			const componentPaneObjects = yExtendComponents
				.filter(innerComp => innerComp.paneUuid === comp.paneUuid)
				.map(_innerComp => {
					const compObjects: DynamicObject[] = [];
					// add volumes as a dynamic object to the separate volume pane
					if (_innerComp.paneUuid === 'volumes') {
						compObjects.push({ model: mainCandleSeries, drawer: volumesDrawer });
						if (this.model) {
							const combinedObjects = this.combineWithOuterObjects(
								compObjects,
								this.model,
								_innerComp.paneUuid,
							);
							return convertArrayToLinkedList(combinedObjects);
						}
						return convertArrayToLinkedList(compObjects);
					}

					_innerComp.dataSeries.forEach((series: DataSeriesModel) => {
						compObjects.push(this.transformIntoDynamicObject(series, dataSeriesDrawer));
					});
					// add volumes as a dynamic object to the chart pane
					if (_innerComp.paneUuid === CHART_UUID) {
						compObjects.push({ model: mainCandleSeries, drawer: volumesDrawer });
					}
					if (this.model) {
						const combinedObjects = this.combineWithOuterObjects(
							compObjects,
							this.model,
							_innerComp.paneUuid,
						);
						return convertArrayToLinkedList(combinedObjects);
					}
					return convertArrayToLinkedList(compObjects);
				});
			return { [comp.paneUuid]: componentPaneObjects[0] };
		});
		return objects;
	}

	/**
	 * Combines pane objects with the ones from outside chart-core
	 * @param initObjects
	 * @param model
	 * @param paneId
	 */
	private combineWithOuterObjects(
		initObjects: DynamicObject[],
		model: DynamicObjectsModel<DynamicObject>,
		paneId: PaneId,
	) {
		const additionalObjPane = model._objects.find(el => Object.keys(el)[0] === paneId);
		if (additionalObjPane) {
			const additionalObjects: DynamicObject[] = convertLinkedListToArray(additionalObjPane[`${paneId}`]).filter(
				(o: DynamicObject) => o.drawer !== this.dataSeriesDrawer && o.drawer !== this.volumesDrawer,
			);
			const combined = initObjects.concat(additionalObjects);
			return combined;
		}
		return initObjects;
	}

	/**
	 * Takes model and it's corresponding drawer and makes it as a single object
	 * @param model
	 * @param drawer
	 */
	public transformIntoDynamicObject(model: DataSeriesModel | VolumesModel | unknown, drawer: Drawer): DynamicObject {
		return {
			model,
			drawer,
		};
	}

	protected doActivate() {
		super.doActivate();
		// update dynamic objects when data series are added/removed
		this.addRxSubscription(
			merge(
				this.chartComponent.chartModel.candlesSetSubject,
				this.paneManager.dataSeriesChangedSubject,
			).subscribe(() => {
				const objects = this.getDynamicObjects(
					this.dataSeriesDrawer,
					this.volumesDrawer,
					this.chartComponent.chartModel.mainCandleSeries,
				);
				this.model.setDynamicObjects(objects);
			}),
		);
	}
}
