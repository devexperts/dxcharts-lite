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
		const objects = this.dynamicObjectsModel._objects;
		objects.forEach(paneList => {
			Object.values(paneList).forEach(list => {
				const paneName = Object.keys(paneList)[0];
				const listArr = convertLinkedListToArray(list);
				for (const obj of listArr) {
					const { model, drawer } = obj;
					drawer.draw(model, paneName);
				}
			});
		});
	}

	getCanvasIds(): string[] {
		return [this.canvasModel.canvasId];
	}
}
