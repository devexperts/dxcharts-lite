/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/* eslint-disable */
'use strict';

export default function generateCandlesData(config) {
	// default generation config
	config = config || {};
	config.quantity = config.quantity || 200;
	config.startY = config.startY || 50;
	config.avgCandleSize = config.avgCandleSize || 2;
	config.avgTrendLength = config.avgTrendLength || {};
	config.avgTrendLength.sw = config.avgTrendLength.sw || 10;
	config.avgTrendLength.down = config.avgTrendLength.down || 10;
	config.avgTrendLength.up = config.avgTrendLength.up || 10;
	config.withVolume = config.withVolume === true || false;
	config.period = config.period || 3600;
	var result = [];
	var quantity = config.quantity || 200;
	var swTrendLength = 10;
	var downTrendLength = 10;
	var upTrendLength = 10;
	if (config.avgTrendLength) {
		swTrendLength = config.avgTrendLength.sw || 10;
		downTrendLength = config.avgTrendLength.down || 10;
		upTrendLength = config.avgTrendLength.up || 10;
	}
	var startY = config.startY || 50;
	var candleAvgSize = config.avgCandleSize || 2;
	// generate 1st candle
	var from = startY - candleAvgSize;
	var to = startY + candleAvgSize;
	var entryCandle = generateRandomCandle(from, to, candleAvgSize);
	result.push(entryCandle);
	// generate UP, DOWN or SW trends until quantity is filled
	while (result.length < quantity) {
		var r = Math.random() * 10;
		if (r > 6) {
			result = result.concat(generateCandlesSideways(result[result.length - 1], candleAvgSize, swTrendLength));
		} else if (r > 3) {
			result = result.concat(generateCandlesUp(result[result.length - 1], candleAvgSize, upTrendLength));
		} else {
			result = result.concat(generateCandlesDown(result[result.length - 1], candleAvgSize, downTrendLength));
		}
	}
	result = result.slice(0, config.quantity);
	// set candle timestamps
	let time = Math.round(new Date().getTime() / 300000) * 300000;
	time -= quantity * 1000 * config.period;
	for (let i = 0; i < result.length; i++) {
		const candle = result[i];
		Object.assign(candle, {
			timestamp: time,
			isVisible: true,
		});
		time += 1000 * config.period;
		if (config.withVolume) {
			candle.volume = Math.ceil(Math.random() * 1000 + 200);
		}
	}
	return result;
}

function generateRandomCandle(from, to, candleAvgSize, type) {
	var open = Math.random() * (to - from) + from;
	var close;
	if ((type && type === 'bull') || (!type && Math.random() > 0.5)) {
		var close1 = open + candleAvgSize;
		close = close1 < to ? close1 : to;
	} else {
		var close2 = open - candleAvgSize;
		close = close2 > from ? close2 : from;
	}
	var high = Math.max(open, close) + Math.random() * candleAvgSize * 0.2;
	var low = Math.min(open, close) - Math.random() * candleAvgSize * 0.2;
	return {
		hi: high,
		lo: low,
		open: open,
		close: close,
		timestamp: 0,
		volume: 0,
	};
}
function generateCandlesUp(entryCandle, candleAvgSize, trendLength) {
	var result = [];
	var randomTrendLength = Math.random() * trendLength + trendLength / 2;
	var from = entryCandle.lo;
	var to = entryCandle.hi + candleAvgSize * 1.2;
	for (var i = 0; i < randomTrendLength; i++) {
		var type = Math.random() > 0.9 ? 'bear' : 'bull';
		var candle = generateRandomCandle(from, to, candleAvgSize, type);
		from = candle.lo - candleAvgSize * (Math.random() * 0.1 + 0.1);
		to = candle.hi + candleAvgSize * (Math.random() * 1.3 + 0.1);
		// spike
		if (Math.random() > 0.9) {
			to = candle.hi + candleAvgSize;
		}
		result.push(candle);
	}
	return result;
}
function generateCandlesDown(entryCandle, candleAvgSize, trendLength) {
	var result = [];
	var randomTrendLength = Math.random() * trendLength + trendLength / 2;
	var from = entryCandle.hi - candleAvgSize * 1.2;
	var to = entryCandle.hi;
	for (var i = 0; i < randomTrendLength; i++) {
		var type = Math.random() < 0.9 ? 'bear' : 'bull';
		var candle = generateRandomCandle(from, to, candleAvgSize, type);
		from = candle.lo - candleAvgSize * (Math.random() * 0.3 + 0.1);
		to = candle.hi - candleAvgSize * (Math.random() * 0.1 + 0.1);
		// spike
		if (Math.random() > 0.9) {
			to = candle.lo - candleAvgSize;
		}
		result.push(candle);
	}
	return result;
}
function generateCandlesSideways(entryCandle, candleAvgSize, trendLength) {
	var result = [];
	var randomTrendLength = Math.random() * trendLength + trendLength / 2;
	function nextFromTo(candle) {
		var from;
		var to;
		if (Math.random() > 0.5) {
			from = candle.lo - candleAvgSize * 0.2;
			to = candle.hi + candleAvgSize * 1.2;
		} else {
			from = candle.lo - candleAvgSize * 1.2;
			to = candle.hi + candleAvgSize * 0.2;
		}
		return {
			from: from,
			to: to,
		};
	}
	var fromTo = nextFromTo(entryCandle);
	var from = fromTo.from;
	var to = fromTo.to;
	for (var i = 0; i < randomTrendLength; i++) {
		var type = Math.random() < 0.5 ? 'bear' : 'bull';
		var candle = generateRandomCandle(from, to, candleAvgSize, type);
		fromTo = nextFromTo(candle);
		from = fromTo.from;
		to = fromTo.to;
		// spike
		if (Math.random() > 0.9) {
			if (Math.random() > 0.5) {
				from = candle.lo - candleAvgSize;
			} else {
				to = candle.hi + candleAvgSize;
			}
		}
		result.push(candle);
	}
	return result;
}

window['DXChart'] = {
	...window['DXChart'],
	generateCandlesData,
};
