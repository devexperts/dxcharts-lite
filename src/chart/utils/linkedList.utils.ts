export class ListNode<T> {
	public data: T;
	public next: ListNode<T> | null;

	constructor(data: T) {
		this.data = data;
		this.next = null;
	}
}

export class LinkedList<T> {
	private head: ListNode<T> | null = null;
	private length = 0;

	constructor(head?: ListNode<T>) {
		this.head = head ?? null;
	}

	public insertAtEnd(data: T): ListNode<T> {
		const node = new ListNode(data);
		let current: ListNode<T>;

		if (this.head === null) {
			this.head = node;
		} else {
			current = this.head;
			while (current.next) {
				current = current.next;
			}
			current.next = node;
		}
		this.length++;
		return node;
	}

	public insertAt(position: number, data: T) {
		if (position > -1 && position < this.length && this.head) {
			let current = this.head;
			let index = 0;
			let previous = current;
			const node = new ListNode(data);

			if (position === 0) {
				node.next = current;
				this.head = node;
			} else {
				while (index++ < position && current.next) {
					previous = current;
					current = current.next;
				}
				node.next = current;
				previous.next = node;
			}
			this.length++;
			return current;
		} else {
			return null;
		}
	}

	public removeAt(position: number): ListNode<T> | null {
		if (position > -1 && position < this.length && this.head) {
			let current = this.head;
			let previous: ListNode<T> = current;
			let index = 0;

			if (position === 0) {
				this.head = current.next;
			} else {
				while (index++ < position && current.next) {
					previous = current;
					current = current.next;
				}
				previous.next = current.next;
			}
			this.length--;
			return current;
		} else {
			return null;
		}
	}

	public search(predicateFunc: (data: T) => boolean): ListNode<T> | null {
		const checkNext = (node: ListNode<T>): ListNode<T> | null => {
			if (predicateFunc(node.data)) {
				return node;
			}
			return node.next ? checkNext(node.next) : null;
		};

		return this.head ? checkNext(this.head) : null;
	}

	public getNodePosition(node: ListNode<T>) {
		let index = 0;
		let tempNode = this._head;

		while (node) {
			if (tempNode?.data === node.data) {
				return index;
			}
			tempNode = tempNode.next;
			index++;
		}

		return -1;
	}

	public size(): number {
		return this.length;
	}

	get _head() {
		return this.head;
	}
}

export const convertArrayToLinkedList = <T>(data: Array<T>): LinkedList<T> => {
	const initial = new ListNode(-1);
	const initialList = new LinkedList();
	let initialHead = initial;
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < data.length; i++) {
		initialHead.next = new ListNode(data[i]);
		initialHead = initialHead.next;
		initialList.insertAtEnd(initialHead.data);
	}
	return initialList;
};

export const convertLinkedListToArray = <T>(list: LinkedList<T>): Array<T> => {
	const initial = list._head?.data;
	let temp = list._head;

	const arr = [initial];
	while (temp?.next) {
		temp = temp?.next;
		arr.push(temp?.data);
	}

	return arr;
};
