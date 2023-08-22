import { Drawer } from '../../drawers/drawing-manager';
import { LinkedList, ListNode } from '../../utils/linkedList.utils';
import { DataSeriesModel } from '../../model/data-series.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { BehaviorSubject } from 'rxjs';
import { ChartComponent } from '../chart/chart.component';

export type PaneId = string;

export interface DynamicObject {
	drawer: Drawer; // DataSeriesDrawer | DrawingsDrawer | VolumesDrawer
	model: DataSeriesModel; // DataSeriesModel | DrawingModel | VolumesModel
}

export class DynamicObjectsModel<DynamicObject> extends ChartBaseElement {
	objects: BehaviorSubject<Record<PaneId, LinkedList<DynamicObject>>>;
	chartComponent: ChartComponent;
	// objectsMap: Map<DataSeriesModel | unknown, ListNode<T>>;

	constructor(objects: Record<PaneId, LinkedList<DynamicObject>>, chartComponent: ChartComponent) {
		super();
		this.objects = new BehaviorSubject(objects);
		this.chartComponent = chartComponent;
		// this.objectsMap = objectsMap;
	}

	// is needed to add drawings or some other entity which should be a dynamic object but outside of chart-core scope
	// addObject(obj: DynamicObject) {
	// }

	// being at front means the element should be the last node, because the last canvas element is before the others
	bringToFront(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetObj = Object.keys(objects).find(pane => pane === paneId);

		if (targetObj) {
			const targetList = objects[targetObj];
			const targetPos = targetList.getNodePosition(listNode);
			if (targetPos >= 0 && targetPos < targetList.size()) {
				const nodeToReplace = targetList.removeAt(targetPos);
				if (nodeToReplace) {
					targetList.insertAtEnd(nodeToReplace.data);
				}
			}
			objects[targetObj] = targetList;
			this.setDynamicObjects(objects);
		}
	}

	// being at back means the element should be the first node, because the first canvas element is after the others
	bringToBack(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetObj = Object.keys(objects).find(pane => pane === paneId);

		if (targetObj) {
			const targetList = objects[targetObj];
			const targetPos = targetList.getNodePosition(listNode);
			if (targetPos > 0 && targetPos <= targetList.size()) {
				const nodeToReplace = targetList.removeAt(targetPos);
				if (nodeToReplace) {
					targetList.insertAt(0, nodeToReplace?.data);
				}
			}
			objects[targetObj] = targetList;
			this.setDynamicObjects(objects);
		}
	}

	moveForward(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetObj = Object.keys(objects).find(pane => pane === paneId);

		if (targetObj) {
			const targetList = objects[targetObj];
			const targetPos = targetList.getNodePosition(listNode);
			if (targetPos >= 0 && targetPos < targetList.size()) {
				const nodeToReplace = targetList.removeAt(targetPos);
				if (nodeToReplace) {
					targetList.insertAt(targetPos + 1, nodeToReplace.data);
				}
			}
			objects[targetObj] = targetList;
			this.setDynamicObjects(objects);
		}
	}

	sendBackward(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetObj = Object.keys(objects).find(pane => pane === paneId);

		if (targetObj) {
			const targetList = objects[targetObj];
			const targetPos = targetList.getNodePosition(listNode);
			if (targetPos > 0 && targetPos <= targetList.size()) {
				const nodeToReplace = targetList.removeAt(targetPos);
				if (nodeToReplace) {
					targetList.insertAt(targetPos - 1, nodeToReplace?.data);
				}
			}
			objects[targetObj] = targetList;
			this.setDynamicObjects(objects);
		}
	}

	get _objects() {
		return this.objects.getValue();
	}

	setDynamicObjects(objects: Record<PaneId, LinkedList<DynamicObject>>) {
		this.objects.next(objects);
	}
}
