import { DynamicObject, DynamicObjectsModel } from './dynamic-objects.model';
import { Drawer } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { convertLinkedListToArray } from '../../utils/linkedList.utils';

export class DynamicObjectsDrawer implements Drawer {
	private dynamicObjectsModel: DynamicObjectsModel<DynamicObject>;
	private canvasModel: CanvasModel;
	constructor(dynamicObjectsModel: DynamicObjectsModel<DynamicObject>, canvasModel: CanvasModel) {
		this.dynamicObjectsModel = dynamicObjectsModel;
		this.canvasModel = canvasModel;
	}

	draw() {
		const objects = convertLinkedListToArray(this.dynamicObjectsModel._objects);
		console.log('objects', objects);
		for (const obj of objects) {
			const { model, drawer } = obj;
			console.log('model', model);
			drawer.draw(model);
		}
	}

	getCanvasIds(): string[] {
		return [this.canvasModel.canvasId];
	}
}
