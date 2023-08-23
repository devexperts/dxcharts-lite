# Pane & PaneManager

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/nwkrjd)<!--/CSB_LINK-->

Pane is a container for data series. Visually it represents a rectangle area where data series are drawn.

PaneManager is responsible for managing all panes on chart, if you want to add a new pane you need to use PaneManager.

```js
chart.paneManager.createPane();
```

### Adding and removing data series from pane

To draw a data series on pane you need to create it and add to pane:

```js
// you can get panes order this way, this array contains uuids of panes
const order = chart.paneManager.panesOrder;

const pane = chart.paneManager.paneComponents[paneUuid];
const dataSeries = pane.createDataSeries();
const data = DXChart.generateCandlesData({ quantity: 1000, withVolume: true });
// add data series to pane
dataSeries.setDataPoints(data);
// remove data series from pane
pane.removeDataSeries(dataSeries);
```

### Moving pane up and down

```js
pane.moveUp();
pane.moveDown();
```
