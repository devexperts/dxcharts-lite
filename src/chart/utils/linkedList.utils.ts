export class ListNode<T> {
	public data: T;
	public next: ListNode<T> | null;

	constructor(data: T) {
		this.data = data;
		this.next = null;
	}
}
/**
 * Implementation of Linked list data structure.
 * @param _head
 */
export class LinkedList<T> {
	private _head: ListNode<T> | null = null;
	private _tail: ListNode<T> | null = null;
	private length = 0;

	constructor(head?: ListNode<T>) {
		this._head = head ?? null;
		// init tail
		if (this.head !== null) {
			let current: ListNode<T>;
			current = this.head;
			while (current.next) {
				current = current.next;
			}
			this._tail = current;
		}
	}

	public insertAtEnd(data: T): ListNode<T> {
		const node = new ListNode(data);
		let current: ListNode<T>;

		if (this.head === null) {
			this._head = node;
		} else {
			current = this.head;
			while (current.next) {
				current = current.next;
			}
			current.next = node;
		}
		this._tail = node;
		this.length++;
		return node;
	}

	public insertAt(position: number, data: T) {
		if (position > -1 && position < this.length && this.head) {
			let current = this.head;
			let index = 0;
			let previous = null;
			const node = new ListNode(data);

			if (position === this.length - 1) {
				this._tail = node;
			}

			if (position === 0) {
				node.next = current;
				this._head = node;
			} else {
				while (index < position && current.next) {
					index++;
					previous = current;
					current = current.next;
				}
				node.next = current;
				if (previous) {
					previous.next = node;
				}
			}
			this.length++;
			return current;
		} else {
			this._head = new ListNode(data);
			this.length++;
			return this.head;
		}
	}

	public removeAt(position: number): ListNode<T> | null {
		if (position > -1 && position < this.length && this.head) {
			let current = this.head;
			let previous = null;
			let index = 0;

			if (position === 0) {
				this._head = current.next;
			} else {
				while (index < position && current.next) {
					index++;
					previous = current;
					current = current.next;
				}
				if (previous) {
					previous.next = current.next;
				}
				if (position === this.length - 1) {
					this._tail = current;
				}
			}
			this.length--;
			return current;
		} else {
			return null;
		}
	}

	public getNodePosition(node: ListNode<T>) {
		let index = 0;
		let current = this.head;

		while (node) {
			if (current?.data === node.data) {
				return index;
			}
			current = current && current.next;
			index++;
		}

		return -1;
	}

	public size(): number {
		return this.length;
	}

	get head() {
		return this._head;
	}

	get tail() {
		return this._tail;
	}

	*[Symbol.iterator]() {
		let current = this.head;
		while (current) {
			yield current.data;
			current = current.next;
		}
	}
}
