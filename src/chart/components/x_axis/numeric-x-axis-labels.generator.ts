/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { NumericAxisLabel, NumericAxisLabelsGenerator } from '../labels_generator/numeric-axis-labels.generator';
import { ViewportModel } from '../../model/scaling/viewport.model';
import { XAxisLabelsGenerator } from './x-axis-labels.generator';

/**
 * Y axis labels generator for prices. Respects price increment from instrument.
 */
export class NumericXAxisLabelsGenerator extends NumericAxisLabelsGenerator implements XAxisLabelsGenerator {
	constructor(
		viewportModel: ViewportModel,
		valueFormatter: (value: number, precision?: number) => string = value => `${value}`,
	) {
		super(
			null,
			() => [viewportModel.yStart, viewportModel.yEnd],
			() => viewportModel.getBounds().width,
			valueFormatter,
			false,
			() => 'regular',
			() => 0,
			undefined,
		);
	}

	get labels(): NumericAxisLabel[] {
		return this.labelsCache.calculateOrGet();
	}

	/**
	 * Recalculates the labels of the chart.
	 * Calls the generateNumericLabels method to generate new numeric labels.
	 */
	public recalculateLabels() {
		this.generateNumericLabels();
	}

	/**
	 * Invalidates the labels cache and generates numeric labels.
	 * @returns {void}
	 */
	public generateLabels() {
		this.labelsCache.invalidate();
		this.generateNumericLabels();
	}
}
