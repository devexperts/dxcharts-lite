/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Bounds } from '../../model/bounds.model';
import { isCanvasPointInLowerHoverStrip } from '../canvas-lower-hover-strip.utils';

const baseBounds = (): Bounds => ({
	x: 0,
	y: 0,
	pageX: 0,
	pageY: 0,
	width: 1000,
	height: 1000,
});

describe('canvas-lower-hover-strip.utils', () => {
	it('returns true for a point in the lower strip (bottom offset 0)', () => {
		const b = baseBounds();
		expect(isCanvasPointInLowerHoverStrip({ x: 500, y: 900 }, b, 0)).toBe(true);
	});

	it('returns false for a point in the upper area', () => {
		const b = baseBounds();
		expect(isCanvasPointInLowerHoverStrip({ x: 500, y: 100 }, b, 0)).toBe(false);
	});

	it('shifts the strip when bottomOffsetPx is non-zero', () => {
		const b = baseBounds();
		const yAtStripStartNoOffset = b.height * 0.85 + 10;
		expect(isCanvasPointInLowerHoverStrip({ x: 1, y: yAtStripStartNoOffset - 1 }, b, 0)).toBe(false);
		expect(isCanvasPointInLowerHoverStrip({ x: 1, y: yAtStripStartNoOffset }, b, 0)).toBe(true);

		const bottomOffset = 50;
		const yAtStripStartWithOffset = b.height * 0.85 - bottomOffset + 10;
		expect(isCanvasPointInLowerHoverStrip({ x: 1, y: yAtStripStartWithOffset - 1 }, b, bottomOffset)).toBe(false);
		expect(isCanvasPointInLowerHoverStrip({ x: 1, y: yAtStripStartWithOffset }, b, bottomOffset)).toBe(true);
	});
});
