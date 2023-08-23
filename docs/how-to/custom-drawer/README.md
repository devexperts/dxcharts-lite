# Custom Drawer

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/4sqs8n)<!--/CSB_LINK-->

### Drawing Manager

Drawing manager is responsible for managing all drawers on chart, if you want to add a new drawer you need to use DrawingManager.

### Canvases

There are multiple canvases on the chart - it's used for drawing optimization, so we need to redraw only few canvases which require update. Also they're used as layers, so, for instance, data series are always above chart background.

Canvases list:

-   backgroundCanvas
-   mainCanvas
-   staticDrawingCanvas
-   dataSeriesCanvas
-   overDataSeriesCanvas
-   dynamicDrawingCanvas
-   yAxisLabelsCanvas
-   crossToolCanvas
-   hitTestCanvas

Canvas models for these canvases are available in chart instance:

```js
chart.backgroundCanvasModel;
chart.yAxisLabelsCanvasModel;
```

### Drawing order on the same canvas

You can define drawing order for the same canvas, for example you want to add your custom drawer on data series canvas and draw it above data series or below data series. To do that you need to add your drawer to drawing manager using special methods:

```js
// usually, you use this API to add drawers to the chart if drawing order doesn't matter for you
chart.drawingManager.addDrawer(drawer, 'newDrawerName');

// However, there are two special methods which allow you to add drawer before or after specific drawer
chart.drawingManager.addDrawerAfter(drawer, 'newDrawerName', 'DATA_SERIES');
// or
chart.drawingManager.addDrawerBefore(drawer, 'newDrawerName', 'DATA_SERIES');
```

List of default drawer types:

```js
[
	'MAIN_BACKGROUND',
	'MAIN_CLEAR',
	'HIT_TEST_CLEAR',
	'YAXIS_CLEAR',
	'SERIES_CLEAR',
	'OVER_SERIES_CLEAR',
	'HIT_TEST_DRAWINGS',
	'GRID',
	'VOLUMES',
	'UNDERLAY_VOLUMES_AREA',
	'X_AXIS',
	'Y_AXIS',
	'HIGH_LOW',
	'DRAWINGS',
	'DATA_SERIES',
	'N_MAP_CHART',
	'PL_CHART',
	'WATERMARK',
	'EMPTY_CHART',
	'OFFLINE_CHART',
	'LABELS',
	'EVENTS',
	'HIT_TEST_EVENTS',
	'ZERO_LINE',
	'PL_ZERO_LINE_BACKGROUND',
	'CROSS_TOOL',
];
```

## Add Custom Drawer

To add any custom drawing to chart you need to create a Drawer and add it with `DrawingManager.addDrawer(drawer, 'name');`

```js
const customDrawer = {
	draw() {
		const ctx = chart.dataSeriesCanvasModel.ctx;
		const series = chart.chartModel.mainCandleSeries.getSeriesInViewport().flat();
		const lastCandle = series[series.length - 1];
		const startCandle = series[0];
		// to get actual coordinates for canvas we need to use scaleModel,
		// since actual coordinates in pixels depends on current zoom level and viewport (scale)
		const [x1, y1] = [startCandle.x(chart.scaleModel), startCandle.y(chart.scaleModel)];
		const [x2, y2] = [lastCandle.x(chart.scaleModel), lastCandle.y(chart.scaleModel)];
		// below we do some manipulations which modifies ctx state, so we need to save it and restore after drawing
		ctx.save();
		const bounds = chart.canvasBoundsContainer.getBounds('PANE_CHART');
		// clip drawing bounds to chart pane, so it will not be drawn outside of chart pane (on y-axis, for example)
		clipToBounds(ctx, bounds);

		ctx.beginPath();
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'orange';
		ctx.fillStyle = 'orange';
		// draw line
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		// draw circle on the end of the line
		ctx.beginPath();
		ctx.arc(x2, y2, 5, 0, 2 * Math.PI);
		ctx.fill();
		// restore ctx state
		ctx.restore();
	},
	// this methods should return ids of canvases which this drawers uses
	getCanvasIds() {
		return [chart.dataSeriesCanvasModel.canvasId];
	},
};
```

After that you can add it to drawing manager;

```js
const customDrawer = createCustomDrawer(chart);
chart.drawingManager.addDrawerAfter(customDrawer, 'arrowTrendDrawer', 'DATA_SERIES');
```
