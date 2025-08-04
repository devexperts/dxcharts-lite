import { BehaviorSubject } from 'rxjs';
import { ChartBaseElement } from '../../model/chart-base-element';
import { LinkedList, ListNode } from '../../utils/linkedList.utils';
import { DynamicModelDrawer } from './dynamic-objects.drawer';
import { CanvasModel } from '../../model/canvas.model';

export type PaneId = string;
export type DynamicObjectId = string | number;

export interface DynamicObject<T = unknown> {
	readonly id: DynamicObjectId;
	readonly drawer: DynamicModelDrawer<T>;
	readonly paneId: PaneId;
	readonly model?: T;
	// this property shows if a dynamic object belongs to some higher entity, for example, data series is a part of a set of data series, which is a single object
	readonly parentId?: DynamicObjectId;
}

export class DynamicObjectsModel extends ChartBaseElement {
	private _objects: BehaviorSubject<Record<PaneId, LinkedList<DynamicObject>>>;
	private modelIdToObjectMap: Map<DynamicObjectId, DynamicObject> = new Map();
	private _uniqueObjects: Record<PaneId, Set<DynamicObjectId>> = {};

	constructor(private canvasModel: CanvasModel) {
		super();
		this._objects = new BehaviorSubject({});
	}

	/**
	 * @returns the `DynamicObject` itself and pane `LinkedList` where the object is stored.
	 *
	 */
	public getObjectInfoById(id: DynamicObjectId): [DynamicObject, LinkedList<DynamicObject>] | undefined {
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
	 * @returns `DynamicObject` position in associated pane `LinkedList`
	 * @returns `-1` if an object was not found
	 *
	 */
	getObjectPosition(id: DynamicObjectId): number {
		const objInfo = this.getObjectInfoById(id);

		if (!objInfo) {
			return -1;
		}

		const [obj, paneList] = objInfo;
		const targetNode = new ListNode(obj);

		return paneList.getNodePosition(targetNode);
	}

	/**
	 * Adds an object from outside chart-core into model
	 * @param obj
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
		if (!this.uniqueObjects[paneId]) {
			this.uniqueObjects[paneId] = new Set();
		}
		this.uniqueObjects[paneId].add(obj.parentId ?? obj.id);
		this.setDynamicObjects(objects);
	}

	/**
	 * Removes an object from model
	 * @param id
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
		if (this.uniqueObjects[obj.paneId]) {
			this.uniqueObjects[obj.paneId].delete(obj.parentId ?? obj.id);
		}
		if (paneList.size() === 0) {
			delete this.objects[obj.paneId];
		}
		this.setDynamicObjects(this.objects);
	}

	/**
	 * Updates an object
	 * @param obj
	 */
	updateObject(obj: DynamicObject) {
		const objInfo = this.getObjectInfoById(obj.id);

		if (!objInfo) {
			return;
		}

		const [oldObj] = objInfo;
		this.removeObject(oldObj.id);
		this.addObject(obj);
	}

	/**
	 * Moves the object inside the associated LinkedList to the specified position
	 */
	moveToPosition(id: DynamicObjectId, position: number) {
		const objInfo = this.getObjectInfoById(id);

		if (!objInfo) {
			return;
		}

		const [obj, paneList] = objInfo;
		const node = new ListNode(obj);
		const currentPos = paneList.getNodePosition(node);

		if (currentPos === position) {
			return;
		}

		if (currentPos < position) {
			paneList.insertAt(position, obj);
			paneList.removeAt(currentPos);
		} else {
			paneList.removeAt(currentPos);
			paneList.insertAt(position, obj);
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
			paneList.removeAt(targetPos);
			paneList.insertAtEnd(obj);
			this.setDynamicObjects(this.objects);
		}
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
			paneList.removeAt(targetPos);
			paneList.insertAt(0, obj);
			this.setDynamicObjects(this.objects);
		}
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
		if (targetPos >= 0 && targetPos + 1 < paneList.size()) {
			paneList.removeAt(targetPos);
			paneList.insertAt(targetPos + 1, obj);
			this.setDynamicObjects(this.objects);
		}
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
		if (targetPos > 0 && targetPos < paneList.size()) {
			paneList.removeAt(targetPos);
			paneList.insertAt(targetPos - 1, obj);
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
	 * Getter for the unique objects, unique object is an entity which is either dynamic object itself, or its parent
	 */
	get uniqueObjects() {
		return this._uniqueObjects;
	}

	/**
	 * Sets the objects
	 * @param objects
	 */
	setDynamicObjects(objects: Record<PaneId, LinkedList<DynamicObject>>) {
		this._objects.next(objects);
		this.canvasModel.fireDraw();
	}
}
