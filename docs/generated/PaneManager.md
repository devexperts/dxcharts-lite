# PaneManager


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`addResizer`|`uuid: string` - The uuid of the pane to which the resizer is to be added.|`BarResizerComponent`|Adds a resizer to the canvas bounds container for the given uuid.|
|`createPane`|`uuid: string` `options: AtLeastOne<PaneCreationOptions>` |`PaneComponent`|Creates sub-plot on the chart with y-axis|
|`removePane`|`uuid: string` |`void`|Removes pane from the chart and all related components|
|`createYAxisComponent`|`uuid: string` - The unique identifier of the chart pane.`scaleModel: ScaleModel` - The scale model for the chart.`formatter: (value: number) => string` - The function to format the Y-axis labels.`subs: Unsubscriber[]` - The array of unsubscriber functions.`increment: number` - The increment value for the Y-axis labels.|`[NumericYAxisLabelsGenerator, YAxisDrawer, YAxisScaleHandler]`|Creates a Y-axis component for the chart.|
|`createYPanHandler`|`uuid: string` - The unique identifier of the chart pane.`scaleModel: ScaleModel` - The scale model of the chart.`subs: Unsubscriber[]` - An array of unsubscriber functions.|`void`|Creates a handler for Y-axis panning of the chart.|
|`createGridComponent`|`uuid: string` - The unique identifier of the pane.`scaleModel: ScaleModel` - The scale model used to calculate the scale of the grid.`yAxisLabelsGenerator: NumericYAxisLabelsGenerator` - The generator used to create the labels for the y-axis.|`GridComponent`|Creates a new GridComponent instance with the provided parameters.|
|`addCursors`|`uuid: string` - The unique identifier for the chart element.`cursor: string` - The type of cursor to be added to the chart element.|`void`|Adds cursors to the chart elements based on the provided uuid and cursor type.|
|`removeCursors`|`uuid: string` - The uuid of the canvas element|`void`|Removes cursors for a given uuid|
|`recalculateState`||`void`|Recalculates the zoom Y of all pane components and fires a draw event on the event bus.|
