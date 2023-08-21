import { Drawer } from '../../drawers/drawing-manager';
import { LinkedList, ListNode } from '../../utils/linkedList.utils';
import { DataSeriesModel } from '../../model/data-series.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { BehaviorSubject } from 'rxjs';
import { ChartComponent } from '../chart/chart.component';

export interface DynamicObject {
	drawer: Drawer; // DataSeriesDrawer | DrawingsDrawer | VolumesDrawer
	model: DataSeriesModel; // DataSeriesModel | DrawingModel | VolumesModel
}

export class DynamicObjectsModel<DynamicObject> extends ChartBaseElement {
	objects: BehaviorSubject<LinkedList<DynamicObject>>;
	chartComponent: ChartComponent;
	// objectsMap: Map<DataSeriesModel | unknown, ListNode<T>>;

	constructor(objects: LinkedList<DynamicObject>, chartComponent: ChartComponent) {
		super();
		this.objects = new BehaviorSubject(objects);
		this.chartComponent = chartComponent;
		// this.objectsMap = objectsMap;
	}

	// is needed to add drawings
	// addObject(obj: DynamicObject) {
	// }

	// being at front means the element should be the last node, because the last canvas element is before the others
	bringToFront(listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetPos = objects.getNodePosition(listNode);
		if (targetPos >= 0 && targetPos < objects.size()) {
			const nodeToReplace = objects.removeAt(targetPos);
			if (nodeToReplace) {
				objects.insertAtEnd(nodeToReplace?.data);
			}
		}
		this.setDynamicObjects(objects);
	}

	// being at back means the element should be the first node, because the first canvas element is after the others
	bringToBack(listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetPos = objects.getNodePosition(listNode);
		if (targetPos > 0 && targetPos <= objects.size()) {
			const nodeToReplace = objects.removeAt(targetPos);
			if (nodeToReplace) {
				objects.insertAt(0, nodeToReplace?.data);
			}
		}
		this.setDynamicObjects(objects);
	}

	moveForward(listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetPos = objects.getNodePosition(listNode);
		if (targetPos >= 0 && targetPos < objects.size()) {
			const nodeToReplace = objects.removeAt(targetPos);
			if (nodeToReplace) {
				objects.insertAt(targetPos + 1, nodeToReplace?.data);
			}
		}
		this.setDynamicObjects(objects);
	}

	sendBackward(listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetPos = objects.getNodePosition(listNode);
		if (targetPos > 0 && targetPos <= objects.size()) {
			const nodeToReplace = objects.removeAt(targetPos);
			if (nodeToReplace) {
				objects.insertAt(targetPos - 1, nodeToReplace?.data);
			}
		}
		this.setDynamicObjects(objects);
	}

	get _objects() {
		return this.objects.getValue();
	}

	setDynamicObjects(objects: LinkedList<DynamicObject>) {
		this.objects.next(objects);
	}
}
