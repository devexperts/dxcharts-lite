# Pane & PaneManager

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/fz5q6c)<!--/CSB_LINK-->

By default chart has only one y-axis and any panes are also created with only one y-axis.
However, you can add as many y-axis as you want.

To use this feature you need to use a concept called `Extent`.
Technically, `Extent` is a container for `y-axis` component, `ScaleModel`, and other tiny components.

You can create a new extent using `PaneComponent`

```js
const pane = chart.paneManager.paneComponents.CHART;
const newExtent = pane.createExtentComponent();
```

### Add a new extent and series on it

```js
const pane = chart.paneManager.paneComponents.CHART;
const newExtent = pane.createExtentComponent();
const dataSeries = newExtent.createDataSeries();
dataSeries.dataPoints = generateCandlesDataTS({ quantity: 1000 });
// updateView is necessary to recalculate internal state after the data were set
pane.updateView();
```

### Merge extents into one

When you have multiple extents on the pane, you can merge them into one.
Merging assumes removing all the extents from the pane except the main one,
and adding data series from the deleted extents to the main extent.
All extents will be merge into the initial pane extent.

```js
chart.paneManager.paneComponents.CHART.mergeYExtents();
```
