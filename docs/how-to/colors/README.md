# Colors

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/yvqysl)<!--/CSB_LINK-->
## Set colors via config

You can set your own configuration with colors during initialization:

```js
const customColors = {
	xAxis: {
		backgroundColor: '#91ffde',
		labelTextColor: '#318b6f',
	},
	yAxis: {
		backgroundColor: '#fff668',
		labelTextColor: '#99922a',
	},
	xAxis: {
		backgroundColor: '#91ffde',
		labelTextColor: '#318b6f',
	},
	yAxis: {
		backgroundColor: '#ffd7d7',
		labelTextColor: '#99922a',
	},
	candleTheme: {
		upColor: '#5ba500',
		downColor: '#352fff',
		upWickColor: '#5ba500',
		downWickColor: '#352fff',
	},
	chartAreaTheme: {
		backgroundMode: 'gradient',
		backgroundColor: '#61acff',
		backgroundGradientTopColor: '#fcffac',
		backgroundGradientBottomColor: '#fbacff',
		axisColor: 'yellow',
		gridColor: '#318b6f',
	},
	waterMarkTheme: {
		firstRowColor: '#2ba3ff',
		secondRowColor: '#720c69',
		thirdRowColor: '#bd4000',
	},
	crossTool: {
		lineColor: '#a100ff',
		labelBoxColor: '#a100ff',
		labelTextColor: '#d58eff',
	},
};

const container = document.getElementById('chart');
const chart = DXChart.createChart(container, {
	colors: customColors,
});
```

## Set colors on the fly

Also, you can set colors config with `setColors` method.
All your colors will be applied instead of default immediately.

```js
chartInstance.setColors(colors);
```
