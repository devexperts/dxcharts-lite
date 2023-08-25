import { BehaviorSubject } from 'rxjs';
import { ChartBaseElement } from '../../model/chart-base-element';
import { LinkedList, ListNode } from '../../utils/linkedList.utils';
import { DynamicModelDrawer } from './dynamic-objects.drawer';

export type PaneId = string;

export interface DynamicObject<T = unknown> {
	readonly drawer: DynamicModelDrawer<T>;
	readonly model: T;
}

export class DynamicObjectsModel extends ChartBaseElement {
	private _objects: BehaviorSubject<Record<PaneId, LinkedList<DynamicObject>>>;
	public modelToObjectMap: Map<unknown, DynamicObject> = new Map();

	constructor() {
		super();
		this._objects = new BehaviorSubject({});
	}

	/**
	 * Adds an object from outside chart-core into model
	 * @param obj
	 * @param paneId
	 */
	addObject(obj: DynamicObject, paneId: PaneId) {
		const objects = this.objects;
		const targetList = objects[paneId] ?? new LinkedList();
		objects[paneId] = targetList;
		targetList.insertAtEnd(obj);
		this.modelToObjectMap.set(obj.model, obj);
		this.setDynamicObjects(objects);
	}

	/**
	 * Removes an object from model
	 * @param model
	 * @param paneId
	 */
	removeObject(model: unknown, paneId: PaneId) {
		const objects = this.objects;
		const targetList = objects[paneId];
		const obj = this.modelToObjectMap.get(model);
		if (targetList && obj) {
			const targetNode = new ListNode(obj);
			const targetPos = targetList.getNodePosition(targetNode);
			targetList.removeAt(targetPos);
			this.modelToObjectMap.delete(model);
			if (targetList.size() === 0) {
				delete objects[paneId];
			}
			this.setDynamicObjects(objects);
		}
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn before the other elements
	 * @param paneId
	 * @param listNode
	 */
	bringToFront(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const list = this.objects[paneId];
		if (list) {
			const targetPos = list.getNodePosition(listNode);
			if (targetPos >= 0 && targetPos < list.size()) {
				const nodeToReplace = list.removeAt(targetPos);
				if (nodeToReplace) {
					list.insertAtEnd(nodeToReplace.data);
				}
			}
			this.setDynamicObjects(this.objects);
		}
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn after the other elements
	 * @param paneId
	 * @param listNode
	 */
	bringToBack(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const list = this.objects[paneId];
		if (list) {
			const targetPos = list.getNodePosition(listNode);
			if (targetPos > 0 && targetPos <= list.size()) {
				const nodeToReplace = list.removeAt(targetPos);
				if (nodeToReplace) {
					list.insertAt(0, nodeToReplace?.data);
				}
			}
			this.setDynamicObjects(this.objects);
		}
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn one layer ahead
	 * @param obj
	 * @param paneId
	 */
	moveForward(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const list = this.objects[paneId];
		if (list) {
			const targetPos = list.getNodePosition(listNode);
			if (targetPos >= 0 && targetPos < list.size()) {
				const nodeToReplace = list.removeAt(targetPos);
				if (nodeToReplace) {
					list.insertAt(targetPos + 1, nodeToReplace.data);
				}
			}
			this.setDynamicObjects(this.objects);
		}
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn one layer closer to the back
	 * @param obj
	 * @param paneId
	 */
	sendBackward(paneId: PaneId, listNode: ListNode<DynamicObject>) {
		const list = this.objects[paneId];
		if (list) {
			const targetPos = list.getNodePosition(listNode);
			if (targetPos > 0 && targetPos <= list.size()) {
				const nodeToReplace = list.removeAt(targetPos);
				if (nodeToReplace) {
					list.insertAt(targetPos - 1, nodeToReplace?.data);
				}
			}
			this.setDynamicObjects(this.objects);
		}
	}
	/**
	 * Getter for the objects
	 */
	get objects() {
		return this._objects.getValue();
	}

	/**
	 * Sets the objects
	 * @param objects
	 */
	setDynamicObjects(objects: Record<PaneId, LinkedList<DynamicObject>>) {
		this._objects.next(objects);
	}
}
