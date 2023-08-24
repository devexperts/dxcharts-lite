import { DynamicObject, DynamicObjectsModel } from './dynamic-objects.model';
import { CanvasModel } from '../../model/canvas.model';

export interface DynamicModelDrawer<T> {
	draw(model: T, paneUUID?: string): void;
}

export class DynamicObjectsDrawer<T> implements DynamicModelDrawer<T> {
	private dynamicObjectsModel: DynamicObjectsModel<DynamicObject<T>>;
	private canvasModel: CanvasModel;
	constructor(dynamicObjectsModel: DynamicObjectsModel<DynamicObject<T>>, canvasModel: CanvasModel) {
		this.dynamicObjectsModel = dynamicObjectsModel;
		this.canvasModel = canvasModel;
	}

	draw() {
		const objects = this.dynamicObjectsModel._objects;
		objects.forEach(paneList => {
			Object.values(paneList).forEach(list => {
				const paneName = Object.keys(paneList)[0];
				for (const obj of [...list]) {
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
