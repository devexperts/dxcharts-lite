/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { VisualSeriesPoint } from '../../model/data-series.model';
import { Viewable } from '../../model/scaling/viewport.model';

export const buildLinePath = (points: VisualSeriesPoint[], ctx: CanvasRenderingContext2D, view: Viewable) => {
	if (points.length !== 0) {
		// Recognizing line gaps by candles idx.
		points.forEach((p, idx) => {
			const { centerUnit, close } = p;
			const x = view.toX(centerUnit);
			const y = view.toY(close);
			if (idx === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
	}
};
