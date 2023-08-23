# DXCharts data examples

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/95mdd5)<!--/CSB_LINK-->

## 💫 Setting the Main Series

To set the main series of candles on the chart, you can use the `setMainSeries` method.
This method takes an object with a series of candles `CandleSeries`, and renders them on the chart.

```js
chart.setData({
	candles: candlesData,
	instrument: {
		symbol: instrumentName,
		description: instrumentDescription,
	},
});
```

## 2️⃣ Adding a Compare Series

In addition to the main series, you can also add compare series to the candle chart. A compare series allows you
to compare multiple sets of data on the same chart. To add a compare series, you can use the setSecondarySeries method,
which works in a similar way to setMainSeries.

```js
chartInstance.chartComponent.setSecondarySeries({
	candles: candlesData,
	instrument: {
		symbol: instrumentName,
		description: instrumentDescription,
	},
});
```

## 💫2️⃣ Setting Multiple Series

You can also set both the main series and multiple secondary series using the `setAllSeries` method.
This method takes two parameters: the main series as a `CandleSeries` object and an array of secondary series as `CandleSeries[]`.

```js
chartInstance.chartComponent.setAllSeries(
	{
		candles: mainCandlesData,
		instrument: {
			symbol: mainInstrumentName,
			description: mainInstrumentDescription,
		},
	},
	[
		{
			candles: firstSecondaryCandlesData,
			instrument: {
				symbol: firstSecondaryInstrumentName,
				description: firstSecondaryInstrumentDescription,
			},
		},
		{
			candles: secondarySecondaryCandlesData,
			instrument: {
				symbol: secondarySecondaryInstrumentName,
				description: secondarySecondaryInstrumentDescription,
			},
		},
	],
);
```

## ➕ How to add last candle

To add the last candle to an existing chart with data you have to use the `addLastCandle` method.
It takes in two parameters: first contains candle object `Candle` and second is optional instrument symbol `string`.

❗Please ensure that the timestamp of the last candle is the most recent in order for it to be positioned correctly
as the last candle on the chart.

```js
const lastCandle = {
	hi: 203,
	lo: 184,
	open: 183,
	close: 185,
	timestamp: 1684331744325000,
	volume: 1000,
};
chartInstance.chartComponent.addLastCandle(lastCandle);
```

## ⏱️ How to update last candle

To update last candle with new data you have to use `updateLastCandle` method. This method is the same as `addLastCandle`
and expects two parameters: first is updated candle object `Candle` and second is optional instrument symbol `string`.
Make sure that new candle has timestamp equal to the last candle.

To update the last candle with new data, you have to use the `updateLastCandle` method. This method works similarly to
`addLastCandle` and expects two parameters: the updated candle object `Candle`, and an optional instrument symbol
specified as a `string`.

❗ Please ensure that the timestamp of the updated candle matches the timestamp of the last candle on the chart.

```js
const updatedLastCandle = {
	...lastCandle,
	close: newClosePrice,
	lo: Math.min(newClosePrice, lastCandle.lo),
	hi: Math.max(newClosePrice, lastCandle.hi),
};
chartInstance.chartComponent.updateLastCandle(updatedLastCandle);
```
