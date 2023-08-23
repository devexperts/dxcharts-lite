import { Drawer } from '../../drawers/drawing-manager';
import { LinkedList, ListNode } from '../../utils/linkedList.utils';
import { DataSeriesModel } from '../../model/data-series.model';
import { ChartBaseElement } from '../../model/chart-base-element';
import { BehaviorSubject } from 'rxjs';
import { ChartComponent } from '../chart/chart.component';
import { VolumesModel } from '../volumes/volumes.model';

export type PaneId = string;

export interface DynamicObject {
	readonly drawer: Drawer; // DataSeriesDrawer | DrawingsDrawer | VolumesDrawer
	readonly model: DataSeriesModel | VolumesModel | unknown; // DataSeriesModel | DrawingModel | VolumesModel
}

export class DynamicObjectsModel<DynamicObject> extends ChartBaseElement {
	objects: BehaviorSubject<Record<PaneId, LinkedList<DynamicObject>>[]>;
	chartComponent: ChartComponent;

	constructor(objects: Record<PaneId, LinkedList<DynamicObject>>[], chartComponent: ChartComponent) {
		super();
		this.objects = new BehaviorSubject(objects);
		this.chartComponent = chartComponent;
	}

	/**
	 * Adds an object from outside chart-core into model
	 * @param obj
	 * @param paneId
	 */
	addObject(obj: DynamicObject, paneId: PaneId) {
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

	/**
	 * Removes an object from outside chart-core from model
	 * @param obj
	 * @param paneId
	 */
	removeObject(obj: DynamicObject, paneId: PaneId) {
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

	/**
	 * Moves the object inside the drawing order so it's being drawn before the other elements
	 * @param paneId
	 * @param listNode
	 */
	bringToFront(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const objects = this._objects;
		const targetRecord = objects.find(record => Object.keys(record)[0] === paneId);
		if (targetRecord) {
			const targetObj = Object.keys(targetRecord).find(pane => pane === paneId);
			if (targetObj) {
				const targetList = targetRecord[targetObj];
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

	/**
	 * Moves the object inside the drawing order so it's being drawn after the other elements
	 * @param paneId
	 * @param listNode
	 */
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

	/**
	 * Moves the object inside the drawing order so it's being drawn one layer ahead
	 * @param obj
	 * @param paneId
	 */
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

	/**
	 * Moves the object inside the drawing order so it's being drawn one layer closer to the back
	 * @param obj
	 * @param paneId
	 */
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
	/**
	 * Getter for the objects
	 */
	get _objects() {
		return this.objects.getValue();
	}

	/**
	 * Sets the objects
	 * @param objects
	 */
	setDynamicObjects(objects: Record<PaneId, LinkedList<DynamicObject>>[]) {
		this.objects.next(objects);
	}
}
