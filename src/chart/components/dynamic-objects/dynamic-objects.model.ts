import { Drawer } from '../../drawers/drawing-manager';
import { LinkedList, ListNode } from '../../utils/linkedList.utils';
import { DataSeriesModel } from '../../model/data-series.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { BehaviorSubject } from 'rxjs';
import { ChartComponent } from '../chart/chart.component';
import { VolumesModel } from '../volumes/volumes.model';

export type PaneId = string;

export interface DynamicObject {
	drawer: Drawer; // DataSeriesDrawer | DrawingsDrawer | VolumesDrawer
	model: DataSeriesModel | VolumesModel | unknown; // DataSeriesModel | DrawingModel | VolumesModel
}

export class DynamicObjectsModel<DynamicObject> extends ChartBaseElement {
	objects: BehaviorSubject<Record<PaneId, LinkedList<DynamicObject>>[]>;
	chartComponent: ChartComponent;
	// objectsMap: Map<DataSeriesModel | unknown, ListNode<T>>;

	constructor(objects: Record<PaneId, LinkedList<DynamicObject>>[], chartComponent: ChartComponent) {
		super();
		this.objects = new BehaviorSubject(objects);
		this.chartComponent = chartComponent;
		// this.objectsMap = objectsMap;
	}

	// is needed to add drawings or some other entity which should be a dynamic object but outside of chart-core scope
	addObject(obj: DynamicObject, paneId: string) {
		const objects = this._objects;
		const targetRecord = objects.find(record => Object.keys(record)[0] === paneId);
		if (targetRecord) {
			const targetObj = Object.keys(targetRecord).find(pane => pane === paneId);
			if (targetObj) {
				const targetList = targetRecord[targetObj];
				targetList.insertAtEnd(obj);
				this.setDynamicObjects(objects);
			}
		}
	}

	// is needed to remove drawings or some other entity which should be a dynamic object but outside of chart-core scope
	removeObject(obj: DynamicObject, paneId: string) {
		const objects = this._objects;
		const targetRecord = objects.find(record => Object.keys(record)[0] === paneId);
		if (targetRecord) {
			const targetObj = Object.keys(targetRecord).find(pane => pane === paneId);
			if (targetObj) {
				const targetList = targetRecord[targetObj];

				const targetPos = targetList.getNodePosition(new ListNode(obj));
				targetList.removeAt(targetPos);
				this.setDynamicObjects(objects);
			}
		}
	}

	// being at front means the element should be the last node, because the last canvas element is before the others
	bringToFront(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetRecord = objects.find(record => Object.keys(record)[0] === paneId);
		if (targetRecord) {
			const targetObj = Object.keys(targetRecord).find(pane => pane === paneId);
			if (targetObj) {
				const targetList = targetRecord[targetObj];
				//TODO remove later
				// const testObj = targetList._head; // remove later
				//TODO change to listNode later
				const targetPos = targetList.getNodePosition(listNode);
				if (targetPos >= 0 && targetPos < targetList.size()) {
					const nodeToReplace = targetList.removeAt(targetPos);
					if (nodeToReplace) {
						targetList.insertAtEnd(nodeToReplace.data);
					}
				}
				targetRecord[targetObj] = targetList;
				this.setDynamicObjects(objects);
			}
		}
	}

	// being at back means the element should be the first node, because the first canvas element is after the others
	bringToBack(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetRecord = objects.find(record => Object.keys(record)[0] === paneId);
		if (targetRecord) {
			const targetObj = Object.keys(targetRecord).find(pane => pane === paneId);
			if (targetObj) {
				const targetList = targetRecord[targetObj];
				const targetPos = targetList.getNodePosition(listNode);
				if (targetPos > 0 && targetPos <= targetList.size()) {
					const nodeToReplace = targetList.removeAt(targetPos);
					if (nodeToReplace) {
						targetList.insertAt(0, nodeToReplace?.data);
					}
				}
				targetRecord[targetObj] = targetList;
				this.setDynamicObjects(objects);
			}
		}
	}

	moveForward(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetRecord = objects.find(record => Object.keys(record)[0] === paneId);
		if (targetRecord) {
			const targetObj = Object.keys(objects).find(pane => pane === paneId);

			if (targetObj) {
				const targetList = targetRecord[targetObj];
				const targetPos = targetList.getNodePosition(listNode);
				if (targetPos >= 0 && targetPos < targetList.size()) {
					const nodeToReplace = targetList.removeAt(targetPos);
					if (nodeToReplace) {
						targetList.insertAt(targetPos + 1, nodeToReplace.data);
					}
				}
				targetRecord[targetObj] = targetList;
				this.setDynamicObjects(objects);
			}
		}
	}

	sendBackward(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetRecord = objects.find(record => Object.keys(record)[0] === paneId);
		if (targetRecord) {
			const targetObj = Object.keys(objects).find(pane => pane === paneId);

			if (targetObj) {
				const targetList = targetRecord[targetObj];
				const targetPos = targetList.getNodePosition(listNode);
				if (targetPos > 0 && targetPos <= targetList.size()) {
					const nodeToReplace = targetList.removeAt(targetPos);
					if (nodeToReplace) {
						targetList.insertAt(targetPos - 1, nodeToReplace?.data);
					}
				}
				targetRecord[targetObj] = targetList;
				this.setDynamicObjects(objects);
			}
		}
	}

	get _objects() {
		return this.objects.getValue();
	}

	setDynamicObjects(objects: Record<PaneId, LinkedList<DynamicObject>>[]) {
		this.objects.next(objects);
	}
}
