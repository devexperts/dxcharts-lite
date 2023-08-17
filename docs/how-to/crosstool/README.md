# Crosstool

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/wf3zsr)<!--/CSB_LINK-->

## Set crosstool type

You can enable/disable crosstool by setting type:

-   `cross-and-labels` - both the crosshair and X/Y labels
-   `only-labels` - only the X/Y label
-   `none` - crosstool is not visible

```js
chartInstance.crossToolComponent.setType('cross-and-labels');
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
chartInstance.crossToolComponent.setMagnetTarget('OHLC');
```

## Paddings for labels

Also you can set paddings for crosstool labels via config:

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
