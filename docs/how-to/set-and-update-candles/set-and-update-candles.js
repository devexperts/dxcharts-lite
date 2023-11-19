import generateCandlesData from '@devexperts/dxcharts-lite/dist/chart/utils/candles-generator.utils';

document.addEventListener('DOMContentLoaded', async () => {
	const container = document.getElementById('dxcharts_lite');
	const showTicks = document.querySelector('#ticks');
	const addDataBtn = document.querySelector('#load_data');
	const compareSeriesContainer = document.querySelector('#compare_series');

	// Make sure we have container to render in
	if (!container) {
		return false;
	}

	// Let's fetch data for the chart before
	const candles = await getChartData();

	// And create a new chart instance with empty data
	const chart = DXChart.createChart(container);

	// Now we can add loaded data
	chart.setData({ candles });

	let ticksTimer;
	showTicks.addEventListener('change', () => {
		if (showTicks.checked) {
			ticksTimer = setInterval(() => {
				const lastCandle = candles[candles.length - 1];
				const c = generateLastCandleUpdate(lastCandle);
				console.log(c);
				chart.chartComponent.updateLastCandle(c);
			}, 1000);
			return;
		}

		ticksTimer && clearInterval(ticksTimer);
	});

	// Add compare series
	let secondarySeries = [];
	let secondarySeriesModels = [];
	addDataBtn.addEventListener('click', e => {
		secondarySeries.push({
			candles: generateCandlesData({ quantity: 1000, withVolume: true }),
			symbol: `MOCK ${secondarySeries.length}`,
		});
		const compareData = secondarySeries[secondarySeries.length - 1];

		const secondaryModel = chart.chartComponent.setSecondarySeries({
			candles: compareData.candles,
			instrument: { symbol: compareData.symbol },
		});
		const compareEl = document.createElement('div');
		compareEl.className = 'compareSymbol';
		compareEl.id = secondaryModel.name;
		compareEl.innerText = compareData.symbol;
		compareEl.dataset.type = 'compare-symbol';
		compareSeriesContainer.append(compareEl);
		secondarySeriesModels.push(secondaryModel);
	});

	// Remove compare series
	compareSeriesContainer.addEventListener('click', e => {
		if (e.target.dataset.type) {
			const symbol = e.target.id;
			const seriesModel = secondarySeriesModels.find(series => series.name === symbol);
			chart.data.removeSecondarySeries(seriesModel);

			secondarySeries = secondarySeries.filter(series => series.symbol !== symbol);
			secondarySeriesModels = secondarySeriesModels.filter(series => series.name !== symbol);

			e.target.remove();
		}
	});
});

// Imagine we have some provider and data returns as a Promise
async function getChartData() {
	return await new Promise(resolve => resolve(generateCandlesData({ quantity: 1000, withVolume: true })));
}

function generateLastCandleUpdate(lastCandle) {
	const index = Math.round(Math.random());
	const array = [lastCandle.open, lastCandle.close];

	const volatility = 0.05;
	const minDiff = 1 - volatility / 2;
	const diff = minDiff + volatility * Math.random();

	const randomMovement = diff * array[index];
	const updatedCandle = {
		close: randomMovement,
	};

	return {
		...lastCandle,
		...updatedCandle,
		lo: Math.min(updatedCandle.close, lastCandle.lo),
		hi: Math.max(updatedCandle.close, lastCandle.hi),
	};
}
