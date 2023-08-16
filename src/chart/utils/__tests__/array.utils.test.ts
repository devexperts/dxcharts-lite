/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { moveInArrayMutable, reorderArray, slice2DArray, arrayIntersect, eqeqeq } from '../array.utils';

describe('array functions', () => {
	describe('Intersection of arrays', () => {
		it('Intersection of [1, 2, 3, 1] and [1, 2, 4, 5, 6] should be [1, 2]', () => {
			const source = [1, 2, 3, 1];
			const target = [1, 2, 4, 5, 6];
			const result = arrayIntersect(source, target);
			expect(result).toEqual([1, 2]);
		});
		it('Intersection of [1, 2, 3] and [4, 5, 6] should be an empty array', () => {
			const source = [1, 2, 3];
			const target = [4, 5, 6];
			const result = arrayIntersect(source, target);
			expect(result).toEqual([]);
		});
		it('Intersection of [1, 2, 2, 3] and [1, 1, 2, 2, 4, 5] with duplicates should be [1, 2, 2]', () => {
			const source = [1, 2, 2, 3];
			const target = [1, 1, 2, 2, 4, 5];
			const result = arrayIntersect(source, target, eqeqeq, false);
			expect(result).toEqual([1, 2, 2]);
		});
		it('Intersection of [] and [1, 1, 2] should be []', () => {
			const source: number[] = [];
			const target = [1, 1, 2];
			const result = arrayIntersect(source, target);
			expect(result).toEqual([]);
		});
		it('Intersection of [1, 1, 2] and [] should be []', () => {
			const source = [1, 1, 2];
			const target: number[] = [];
			const result = arrayIntersect(source, target);
			expect(result).toEqual([]);
		});
		it('Intersection with custom comparison function', () => {
			const source = [{ id: 1 }, { id: 2 }, { id: 3 }];
			const target = [{ id: 2 }, { id: 4 }, { id: 6 }];
			const compareFn = (a: { id: number }, b: { id: number }) => a.id === b.id;
			const result = arrayIntersect(source, target, compareFn);
			expect(result).toEqual([{ id: 2 }]);
		});
		it('Intersection of arrays of strings', () => {
			const source = ['apple', 'banana', 'orange', 'pear'];
			const target = ['banana', 'orange', 'grape', 'kiwi'];
			const result = arrayIntersect(source, target);
			expect(result).toEqual(['banana', 'orange']);
		});
	});
	describe('slice 2D array', () => {
		it('should correctly slice arrays with correct indexes', () => {
			const array = [
				[1, 2],
				[3, 4],
			];
			const result = slice2DArray(array, 1, 2);
			expect(result.toString()).toBe([[2], [3]].toString());
			const result2 = slice2DArray(array, 0, 1);
			expect(result2.toString()).toBe([[1, 2]].toString());
			const result3 = slice2DArray(array, 2, 3);
			expect(result3.toString()).toBe([[3, 4]].toString());
			const result4 = slice2DArray(array, 0, 3);
			expect(result4.toString()).toBe(
				[
					[1, 2],
					[3, 4],
				].toString(),
			);
		});
		it('should corrercly slice arrays with exceeding indexes', () => {
			const array = [
				[1, 2],
				[3, 4],
			];
			const result = slice2DArray(array, -2, 0);
			expect(result.toString()).toBe([[1]].toString());
			const result2 = slice2DArray(array, 3, 4);
			expect(result2.toString()).toBe([[4]].toString());
			const result3 = slice2DArray(array, -2, 4);
			expect(result3.toString()).toBe(
				[
					[1, 2],
					[3, 4],
				].toString(),
			);
		});
	});
	describe('reorder array', () => {
		it('Reorders source array according to newOrder', () => {
			const array = ['1', '2', '3'];
			const result1 = reorderArray(array, ['3', '1']);
			expect(result1.toString()).toBe(['3', '2', '1'].toString());
			const result2 = reorderArray(array, ['3', '1', '2']);
			expect(result2.toString()).toBe(['3', '1', '2'].toString());
			const result3 = reorderArray(array, ['3']);
			expect(result3.toString()).toBe(['1', '2', '3'].toString());
		});
		it('should return the reordered array even if newOrder contains duplicates', () => {
			const source = ['1', '2', '3'];
			const newOrder = ['2', '1', '2'];
			expect(reorderArray(source, newOrder)).toEqual(['2', '1', '3']);
		});
		it('should return the reordered array even if newOrder contains extra elements', () => {
			const source = ['1', '2', '3'];
			const newOrder = ['6', '2', '1', '5'];
			expect(reorderArray(source, newOrder)).toEqual(['2', '1', '3']);
		});
	});
	describe('moveInArrayMutable', () => {
		it('should move an item from start to end', () => {
			const arr = [1, 2, 3, 4, 5];
			const result = moveInArrayMutable(arr, 1, 3);
			expect(result).toEqual([1, 3, 4, 2, 5]);
		});

		it('should move an item from end to start', () => {
			const arr = [1, 2, 3, 4, 5];
			const result = moveInArrayMutable(arr, 4, 1);
			expect(result).toEqual([1, 5, 2, 3, 4]);
		});

		it('should move an item to the same position', () => {
			const arr = [1, 2, 3, 4, 5];
			const result = moveInArrayMutable(arr, 2, 2);
			expect(result).toEqual([1, 2, 3, 4, 5]);
		});

		it('should clamp from and to if start and end are out of bounds', () => {
			const arr = [1, 2, 3, 4, 5];
			const result = moveInArrayMutable(arr, -1, 6);
			expect(result).toEqual([2, 3, 4, 5, 1]);
		});

		it('should return the same array if start and end are the same', () => {
			const arr = [1, 2, 3, 4, 5];
			const result = moveInArrayMutable(arr, 2, 2);
			expect(result).toEqual([1, 2, 3, 4, 5]);
		});

		it('should return the same array if we try to move first element outside left bound', () => {
			const arr = [1, 2, 3, 4, 5];
			const result = moveInArrayMutable(arr, 0, -1);
			expect(result).toEqual([1, 2, 3, 4, 5]);
		});
	});
});
