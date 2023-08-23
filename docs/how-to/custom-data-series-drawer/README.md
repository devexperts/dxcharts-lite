# Custom data series drawer

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/v3txrg)<!--/CSB_LINK-->

## Creating new drawer for data series

When creating _new drawer_ for **data series** (to create totally custom drawer please refer to _custom drawer_ page) there is only one method you need implement - `draw()`. This method is called when chart needs to redraw data series.
You don't need think about which canvas context to use (unlike when you implement totally custom drawer) - it will be provided by chart through methods parameters.

```js
const myDrawer = {
	draw(
		ctx, // CanvasRenderingContext2D
		allPoints, // VisualSeriesPoint[][]
		model, // DataSeriesModel - can be also CandleSeriesModel - in this case points have all candle fields
		drawerConfig, // ChartDrawerConfig
	) {
		allPoints.forEach((points, idx) => {
			const allPoints = points.flat();
			for (let i = 0; i < allPoints.length; i++) {
				const prevPoint = allPoints[i - 1];
				const point = allPoints[i];
				const x = point.x(model.view);
				const y = point.y(model.view);
				if (point.close > prevPoint?.close) {
					// it is not necessary to save and restore when modifying the context state
					// - it is done by DataSeriesDrawer, which calls draw() method of specific data series drawer
					ctx.fillStyle = drawerConfig.singleColor ?? 'green';
					ctx.fillText('⬆', x, y);
				} else {
					// drawerConfig.singleColor is defined when the drawer is drawn by hit test drawer
					// in order to work with hit test correctly you have to use drawerConfig.singleColor if it's defined
					ctx.fillStyle = drawerConfig.singleColor ?? 'red';
					ctx.fillText('⬇', x, y);
				}
			}
		});
	},
};
```

After that, you need to register it in the chart component:

```js
chart.chartComponent.registerDataSeriesTypeDrawer('TREND', myDrawer);
```

Now you can use it for data series:

```js
// set type for main data series
chart.chartComponent.setChartType('TREND');

// setType for any data series
const dataSeries = chart.paneManager.paneComponents['CHART'].createDataSeries();
//... set your data to dataSeries
// and then you can select your drawer type
dataSeries.setType('TREND');
```

Also, if you want to customize color of label you need to register label color resolver using Y-Axis component:

```js
// label color logic can be very dynamic, so we can't use simple color config
// instead you can provide resolver function which returns color for the label
chart.yAxisComponent.registerLabelColorResolver('TREND', () => {
	if (candles[candles.length - 1].close > candles[candles.length - 2].close) {
		return 'green';
	} else {
		return 'red';
	}
});
```
