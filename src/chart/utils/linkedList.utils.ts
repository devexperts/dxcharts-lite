/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
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
		if (this.head !== null) {
			// init tail
			let current = this.head;
			while (current.next) {
				current = current.next;
			}
			this._tail = current;
			this.length++;
		}
	}

	public insertAtEnd(data: T) {
		const node = new ListNode(data);

		if (this.head === null) {
			this._head = node;
		} else {
			let current = this.head;
			// iterate till the end of the list
			while (current.next) {
				current = current.next;
			}
			// insert the node at the end
			current.next = node;
		}
		this._tail = node;
		this.length++;
	}

	public insertAt(position: number, data: T) {
		// falsy cases
		if (!this.head || position < 0 || position > this.length) {
			return null;
		}

		const node = new ListNode(data);

		// if position === 0 it means that we need to insert the node in the head
		if (position === 0) {
			node.next = this.head;
			this._head = node;
		} else {
			let current: ListNode<T> | null = this.head;
			let previous = current;
			let index = 0;
			// iterate till the index === position
			while (current && index < position) {
				index++;
				previous = current;
				current = current.next;
			}
			// insert an element
			node.next = current;
			previous.next = node;
			// update tail
			if (position === this.length - 1) {
				this._tail = node;
			}
		}
		this.length++;
	}

	public removeAt(position: number) {
		// falsy cases
		if (!this.head || position < 0 || position >= this.length) {
			return null;
		}

		let current = this.head;
		let previous = current;
		let index = 0;

		// if position === 0 it means that we need to delete the first node
		if (position === 0) {
			this._head = current.next;
		} else {
			// iterate till the index === position
			while (current.next && index < position) {
				index++;
				previous = current;
				current = current.next;
			}
			// remove the element
			previous.next = current.next;
			// update tail
			if (position === this.length - 1) {
				this._tail = previous;
			}
		}
		this.length--;
	}

	public getNodePosition(node: ListNode<T>) {
		let index = 0;
		let current = this.head;

		while (current) {
			if (current.data === node.data) {
				return index;
			}
			current = current.next;
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
