# Y-Axis

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/x6x7d4)<!--/CSB_LINK-->

Scale presentation can be controlled using following API

## Visibility

Hides the axis, does not change the width, just hides prices

```js
chart.yAxis.setVisible(true))
```

## Inversion

Reverts the axis and candles top to bottom

```js
chart.yAxis.togglePriceScaleInverse(true);
chart.redraw();
```

## setLockPriceToBarRatio

Keeps the ratio between `y` and `x` axes constant on zoom
wont work on percent or logarithmic scale

```js
chart.yAxis.setLockPriceToBarRatio(true);
```

## Axis alignment

Defines the axis' placement, to the `left` or `right` of the candles

```js
chart.yAxis.setYAxisAlign('right' /*'left'*/);
```

## Axis type

There are 3 different modes of scaling

-   `regular` - linear scale, set in prices equidistant from each other
-   `logarithmic` - a base 2 logarithm scale in prices
-   `percent` - renders scale in percentage from the first visible candle's closing price
    chart is not manually scalable in percentage mode, only shift on the x-axis is allowed

```js
chart.yAxis.setAxisType('regular' /*'logarithmic' 'percent'*/);
```

<iframe src="./index.html" style="width:100%; border:none; height: 310px" title="DXCharts Lite React integration"></iframe>
