# Crosstool

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/xlx7ld)<!--/CSB_LINK-->

## Set crosshair type

You can enable/disable crosshair by setting type:

-   `cross-and-labels` - both the crosshair and X/Y labels
-   `only-labels` - only the X/Y label
-   `none` - crosshair is not visible

```js
chart.crosshair.setType('cross-and-labels');
```

## Set crosstool X axis formatting

You can set formatting for X axis label via config:

```js
xAxisLabelFormat: [{ format: 'dd.MM HH:mm' }];
```

## Set magnet mode

Sets magnet target for cross tool. Supported only for `cross-and-labels` type.
Default magnet target is none.

```js
chart.crosshair.setMagnetTarget('OHLC');
```

## Paddings for labels

Also you can set paddings for crosshair labels via config:

```js
xLabel: {
	padding: {
		top: 10,
		bottom: 10,
		right: 8,
		left: 8,
	},
	margin: {
		top: 0,
	},
},
yLabel: {
	padding: {
		top: 10,
		bottom: 10,
		right: 8,
		left: 8,
	},
	margin: {
		top: 0,
	},
},
```
