import { BehaviorSubject } from 'rxjs';
import { ChartBaseElement } from '../../model/chart-base-element';
import { LinkedList, ListNode } from '../../utils/linkedList.utils';
import { DynamicModelDrawer } from './dynamic-objects.drawer';

export type PaneId = string;
type DynamicObjectId = string | number;

export interface DynamicObject<T = unknown> {
	readonly id: DynamicObjectId;
	readonly drawer: DynamicModelDrawer<T>;
	readonly paneId: PaneId;
	readonly model?: T;
}

export class DynamicObjectsModel extends ChartBaseElement {
	private _objects: BehaviorSubject<Record<PaneId, LinkedList<DynamicObject>>>;
	private modelIdToObjectMap: Map<DynamicObjectId, DynamicObject> = new Map();

	constructor() {
		super();
		this._objects = new BehaviorSubject({});
	}

	/**
	 * @returns the `DynamicObject` itself and pane `LinkedList` where the object is stored.
	 *
	 */
	private getObjectInfoById(id: DynamicObjectId): [DynamicObject, LinkedList<DynamicObject>] | undefined {
		const obj = this.modelIdToObjectMap.get(id);

		if (!obj) {
			return undefined;
		}

		const paneId = obj.paneId;
		const objects = this.objects;
		const paneList = objects[paneId];

		if (!paneList) {
			return undefined;
		}

		return [obj, paneList];
	}

	/**
	 * Adds an object from outside chart-core into model
	 * @param obj
	 * @param paneId
	 */
	addObject(obj: DynamicObject) {
		const paneId = obj.paneId;
		const objects = this.objects;
		const paneList = objects[paneId] ?? new LinkedList();
		if (!Object.keys(objects).find(pane => pane === paneId)) {
			objects[paneId] = paneList;
		}
		paneList.insertAtEnd(obj);
		this.modelIdToObjectMap.set(obj.id, obj);
		this.setDynamicObjects(objects);
	}

	/**
	 * Removes an object from model
	 * @param model
	 * @param paneId
	 */
	removeObject(id: DynamicObjectId) {
		const objInfo = this.getObjectInfoById(id);

		if (!objInfo) {
			return;
		}

		const [obj, paneList] = objInfo;
		const targetNode = new ListNode(obj);
		const targetPos = paneList.getNodePosition(targetNode);
		paneList.removeAt(targetPos);
		this.modelIdToObjectMap.delete(id);
		if (paneList.size() === 0) {
			delete this.objects[obj.paneId];
		}
		this.setDynamicObjects(this.objects);
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn before the other elements
	 * @param paneId
	 * @param listNode
	 */
	bringToFront(id: DynamicObjectId) {
		const objInfo = this.getObjectInfoById(id);

		if (!objInfo) {
			return;
		}

		const [obj, paneList] = objInfo;
		const targetNode = new ListNode(obj);
		const targetPos = paneList.getNodePosition(targetNode);
		if (targetPos >= 0 && targetPos < paneList.size()) {
			const nodeToReplace = paneList.removeAt(targetPos);
			if (nodeToReplace) {
				paneList.insertAtEnd(nodeToReplace.data);
			}
		}
		this.setDynamicObjects(this.objects);
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn after the other elements
	 * @param paneId
	 * @param listNode
	 */
	bringToBack(id: DynamicObjectId) {
		const objInfo = this.getObjectInfoById(id);

		if (!objInfo) {
			return;
		}

		const [obj, paneList] = objInfo;
		const targetNode = new ListNode(obj);
		const targetPos = paneList.getNodePosition(targetNode);
		if (targetPos > 0 && targetPos <= paneList.size()) {
			const nodeToReplace = paneList.removeAt(targetPos);
			if (nodeToReplace) {
				paneList.insertAt(0, nodeToReplace?.data);
			}
		}
		this.setDynamicObjects(this.objects);
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn one layer ahead
	 * @param obj
	 * @param paneId
	 */
	moveForward(id: DynamicObjectId) {
		const objInfo = this.getObjectInfoById(id);

		if (!objInfo) {
			return;
		}

		const [obj, paneList] = objInfo;
		const targetNode = new ListNode(obj);
		const targetPos = paneList.getNodePosition(targetNode);
		if (targetPos >= 0 && targetPos < paneList.size()) {
			const nodeToReplace = paneList.removeAt(targetPos);
			if (nodeToReplace) {
				paneList.insertAt(targetPos + 1, nodeToReplace.data);
			}
		}
		this.setDynamicObjects(this.objects);
	}

	/**
	 * Moves the object inside the drawing order so it's being drawn one layer closer to the back
	 * @param obj
	 * @param paneId
	 */
	moveBackwards(id: DynamicObjectId) {
		const objInfo = this.getObjectInfoById(id);

		if (!objInfo) {
			return;
		}

		const [obj, paneList] = objInfo;
		const targetNode = new ListNode(obj);
		const targetPos = paneList.getNodePosition(targetNode);
		if (targetPos > 0 && targetPos <= paneList.size()) {
			const nodeToReplace = paneList.removeAt(targetPos);
			if (nodeToReplace) {
				paneList.insertAt(targetPos - 1, nodeToReplace?.data);
			}
		}
		this.setDynamicObjects(this.objects);
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
