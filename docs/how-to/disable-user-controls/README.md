# Disable user controls

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/xlh8pj)<!--/CSB_LINK-->

If you want to display a chart, but do not want it to be interactive, you can disable the ability for the user to interact with the chart by calling the function below

```js
chartInstance.disableUserControls();
```

If you want to disable axes and crosstool you need to change config object in the way how it represented below and pass it to `createChart` method as second argument

```js
const configWithDisabledAxes = {
	components: {
		yAxis: {
			visible: false, // disable yAxis
		},
		xAxis: {
			visible: false, // disable xAxis
		},
		crossTool: {
			type: 'none', // disable CrossTool
		},
	},
};

// Create chart with customised config
const chartContainer = document.createElement('div');
const chartInstance = DXChart.createChart(container, configWithDisabledAxes);
```
