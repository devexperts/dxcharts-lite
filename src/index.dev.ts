/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { createChart } from './index';
import ChartBootstrap from './chart/bootstrap';
import { generateCandlesDataTS } from './chart/utils/candles-generator-ts.utils';

const container = document.createElement('div');
document.body.append(container);

document.body.style.height = '100vh';
document.body.style.margin = '0';
document.body.style.backgroundColor = '#ffffff';
container.style.overflow = 'hidden';
// DXChart sizes
container.style.width = '100vw';
container.style.height = '100vh';
container.style.overflow = 'hidden';

// DXChart init
const chart: ChartBootstrap = createChart(container);
const candles = generateCandlesDataTS({ quantity: 1000, withVolume: true });
chart.chartComponent.setMainSeries({ candles });

// for debugging
// @ts-ignore
window['CHART'] = chart;
