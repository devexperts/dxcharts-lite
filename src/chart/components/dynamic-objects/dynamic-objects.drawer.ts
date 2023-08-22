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
		const objectListsModel = this.dynamicObjectsModel._objects;
		console.log(objectListsModel);
		Object.values(objectListsModel).forEach(list => {
			const listArr = convertLinkedListToArray(list);
			for (const obj of listArr) {
				const { model, drawer } = obj;
				drawer.draw(model);
			}
		});
	}

	getCanvasIds(): string[] {
		return [this.canvasModel.canvasId];
	}
}
