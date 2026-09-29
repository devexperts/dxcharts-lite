/*
 * Copyright (C) 2019 - 2026 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { getDefaultConfig } from '../../../chart.config';
import { Bounds } from '../../../model/bounds.model';
import { ViewportModel } from '../../../model/scaling/viewport.model';
import { NumericYAxisLabelsGenerator } from '../numeric-y-axis-labels.generator';

class TestViewportModel extends ViewportModel {
	getBounds(): Bounds {
		return {
			x: 0,
			y: 0,
			pageX: 0,
			pageY: 0,
			width: 100,
			height: 100,
		};
	}
}

describe('NumericYAxisLabelsGenerator', () => {
	it('regenerates labels when the cache is empty', () => {
		const viewport = new TestViewportModel();
		viewport.yStart = 100;
		viewport.yEnd = 110;
		const generator = new NumericYAxisLabelsGenerator(
			1,
			() => undefined,
			viewport,
			value => value.toFixed(2),
			undefined,
			undefined,
			getDefaultConfig().components.yAxis,
		);

		generator.labelsCache.invalidate();

		expect(generator.getLargestLabel()).toBe('100.00');
		expect(generator.labelsCache.getLastCachedValue()).not.toBeUndefined();
	});
});
