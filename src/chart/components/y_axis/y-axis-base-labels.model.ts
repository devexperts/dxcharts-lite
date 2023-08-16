/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { merge } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { NumericAxisLabel, NumericAxisLabelsGenerator } from '../labels_generator/numeric-axis-labels.generator';
import { CanvasBoundsContainer, CanvasElement } from '../../canvas/canvas-bounds-container';
import { ChartBaseElement } from '../../model/chart-base-element';
import { ScaleModel } from '../../model/scale.model';
import { uuid } from '../../utils/uuid.utils';
import { animationFrameThrottledPrior } from '../../utils/perfomance/request-animation-frame-throttle.utils';
import { isDiffersBy } from '../../utils/math.utils';

// TODO rework, make this the source of Y labels for main chart
export class YAxisBaseLabelsModel extends ChartBaseElement {
	public labels: Array<NumericAxisLabel> = [];
	private prevYAxisHeight = 0;
	private animFrameId = `anim_cache_${uuid()}`;

	constructor(
		private scaleModel: ScaleModel,
		private yAxisLabelsGenerator: NumericAxisLabelsGenerator,
		private canvasBoundsContainer: CanvasBoundsContainer,
	) {
		super();
	}

	/**
	 * This method is used to activate the component. It calls the parent's doActivate method and subscribes to the merge of two observables:
	 * - this.scaleModel.yChanged
	 * - this.canvasBoundsContainer.observeBoundsChanged
	 * The merge of these two observables is used to update the labels of the component when either the y-axis scale model changes or the canvas bounds change.
	 * If the height of the canvas bounds changes by more than 1.5 times the previous height, the labels cache is invalidated and the previous y-axis height is updated.
	 */
	protected doActivate() {
		super.doActivate();
		this.addRxSubscription(
			merge(
				this.scaleModel.yChanged,
				this.canvasBoundsContainer.observeBoundsChanged(CanvasElement.Y_AXIS).pipe(
					map(bounds => bounds.height),
					// do not recalculate height every time bounds is changed, recalculate only if it differs by 1.5 times
					filter(height => isDiffersBy(height, this.prevYAxisHeight, 1.5)),
					tap(height => {
						this.yAxisLabelsGenerator.labelsCache.invalidate();
						this.prevYAxisHeight = height;
					}),
				),
			).subscribe(() => this.updateLabels()),
		);
	}

	/**
	 * Updates the labels of the chart's y-axis by generating new numeric labels using the yAxisLabelsGenerator object.
	 * Then, it calls the updateYAxisWidth method to update the width of the y-axis.
	 */
	public updateLabels() {
		this.labels = this.yAxisLabelsGenerator.generateNumericLabels();
		animationFrameThrottledPrior(this.animFrameId, () => this.canvasBoundsContainer.updateYAxisWidths());
	}
}
