# X-Axis

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/kqh23j)<!--/CSB_LINK-->

## Reset scale

This method resets chart scale to default according to `config.components.chart.defaultZoomCandleWidth.`

```js
chartInstance.chartComponent.resetChartScale();
```

## Set custom scale

Moves the viewport to exactly xStart..xEnd place.
`xStart` - viewport start in units
`xEnd` - viewport end in units
In this case unit is a number of candle.

```js
chartInstance.chartComponent.setXScale(0, 20);
```

If units are not useful for you, you can use timestamps to set custom scale.

```js
chartInstance.chartComponent.setTimestampRange(1684782000000, 1684242000000);
```
