import { Drawer } from '../../drawers/drawing-manager';
import { CanvasModel } from '../../model/canvas.model';
import { DynamicObjectsModel } from './dynamic-objects.model';

export interface DynamicModelDrawer<T> {
	draw(canvasModel: CanvasModel, model: T, paneUUID?: string): void;
}

export class DynamicObjectsDrawer implements Drawer {
	private canvasModel: CanvasModel;

	constructor(private dynamicObjectsModel: DynamicObjectsModel, canvasModel: CanvasModel) {
		this.dynamicObjectsModel = dynamicObjectsModel;
		this.canvasModel = canvasModel;
	}

	draw() {
		const objects = this.dynamicObjectsModel.objects;
		Object.entries(objects).forEach(([paneUUID, list]) => {
			for (const obj of list) {
				const { model, drawer } = obj;
				drawer.draw(this.canvasModel, model, paneUUID);
			}
		});
	}

	getCanvasIds(): string[] {
		return [this.canvasModel.canvasId];
	}
}
