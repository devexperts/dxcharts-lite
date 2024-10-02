/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { clamp } from '../math.utils';

describe('math.utils', () => {
	describe('clamp', () => {
		it('should return the value if it is within the range', () => {
			expect(clamp(5, 0, 10)).toEqual(5);
		});

		it('should return the min value if the value is less than the min', () => {
			expect(clamp(-5, 0, 10)).toEqual(0);
		});

		it('should return the max value if the value is more than the max', () => {
			expect(clamp(15, 0, 10)).toEqual(10);
		});
	});
});
