/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { deepEqual } from '../object.utils';

describe('object', () => {
	describe('deepEqual', () => {
		it('should deeply compare objects', () => {
			expect(deepEqual({}, {})).toBeTruthy();
			expect(deepEqual({ a: { foo: 1 } }, { a: { foo: 1 } })).toBeTruthy(); //eslint-disable-line
			expect(deepEqual({ a: { foo: 1 } }, { a: { foo: 2 } })).toBeFalsy(); //eslint-disable-line
			expect(deepEqual({ a: { foo: 1 } }, { a: { bar: 1 } })).toBeFalsy(); //eslint-disable-line
		});
	});
});
