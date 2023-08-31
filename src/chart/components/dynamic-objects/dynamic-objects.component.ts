import { DrawingManager } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { DynamicObjectsDrawer } from './dynamic-objects.drawer';
import { DynamicObjectsModel } from './dynamic-objects.model';

export class DynamicObjectsComponent extends ChartBaseElement {
	public model: DynamicObjectsModel;

	constructor(canvasModel: CanvasModel, drawingManager: DrawingManager) {
		super();

		// model
		const dynamicObjectsModel = new DynamicObjectsModel();
		this.model = dynamicObjectsModel;
		this.addChildEntity(dynamicObjectsModel);

		// drawer
		const dynamicObjectsDrawer = new DynamicObjectsDrawer(dynamicObjectsModel, canvasModel);
		drawingManager.addDrawer(dynamicObjectsDrawer, 'DYNAMIC_OBJECTS');
	}
}
