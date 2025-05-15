/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { VisualSeriesPoint } from '../../model/data-series.model';
import { Viewable } from '../../model/scaling/viewport.model';

export const buildSectionPath = (
	point: VisualSeriesPoint,
	ctx: CanvasRenderingContext2D,
	view: Viewable,
	idx: number,
) => {
	const { centerUnit, close } = point;
	const x = view.toX(centerUnit);
	const y = view.toY(close);
	if (idx === 0) {
		ctx.moveTo(x, y);
	} else {
		ctx.lineTo(x, y);
	}
};

export const buildLinePath = (points: VisualSeriesPoint[], ctx: CanvasRenderingContext2D, view: Viewable) => {
	if (points.length !== 0) {
		// Recognizing line gaps by candles idx.
		points.forEach((p, idx) => {
			buildSectionPath(p, ctx, view, idx);
		});
	}
};
