# PaneComponent


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`doActivate`||`void`|Method that activates the canvas bounds container and recalculates the zoom Y of the scale model.|
|`toY`|`price: number` |`number`||
|`createGridComponent`|`uuid: string` - The unique identifier of the pane.`extentIdx: number` `scale: ScaleModel` - The scale model used to calculate the scale of the grid.`yAxisState: YAxisConfig` - y Axis Config`yAxisLabelsGetter: () => NumericAxisLabel[]` `yAxisBaselineGetter: () => number` |`GridComponent`|Creates a new GridComponent instance with the provided parameters.|
|`createYPanHandler`|`uuid: string` - The unique identifier of the chart pane.`scale: ScaleModel` - The scale model of the chart.|`[Unsubscriber, DragNDropYComponent]`|Creates a handler for Y-axis panning of the chart.|
|`addCursors`|`extentIdx: number` `yAxisComponent: YAxisComponent` |`Unsubscriber`||
|`createExtentComponent`|`options: AtLeastOne<YExtentCreationOptions>` |`YExtentComponent`||
|`removeExtentComponents`|`extentComponents: YExtentComponent[]` |`void`||
|`moveDataSeriesToNewExtentComponent`|`dataSeries: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint, DataSeriesConfig>[]` `initialPane: PaneComponent` `initialExtent: YExtentComponent` `align: YAxisAlign` |`void`|Create new pane extent and attach data series to it|
|`moveDataSeriesToExistingExtentComponent`|`dataSeries: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint, DataSeriesConfig>[]` `initialPane: PaneComponent` `initialExtent: YExtentComponent` `extentComponent: YExtentComponent` `isForceKeepExtent: boolean` |`void`|Attach data series to existing y axis extent|
|`updateView`||`void`|This method updates the view by calling the doAutoScale method of the scaleModel and firing the Draw event using the eventBus.|
|`mergeYExtents`||`void`|Merges all the y-axis extents on the pane into one.|
|`getBounds`||`Bounds`|Returns the bounds of the pane component.|
|`createDataSeries`||`DataSeriesModel<DataSeriesPoint, VisualSeriesPoint, DataSeriesConfig>`|Creates a new DataSeriesModel object.|
|`addDataSeries`|`series: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint, DataSeriesConfig>` - The data series to be added.|`void`|Adds a new data series to the chart.|
|`removeDataSeries`|`series: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint, DataSeriesConfig>` - The data series to be removed.|`void`|Removes a data series from the chart.|
|`getAxisType`||`PriceAxisType`|Returns the type of the y-axis component for the current pane.|
|`moveUp`||`void`|Moves the canvas bounds container up by calling the movePaneUp method with the uuid of the current object.|
|`moveDown`||`void`|Moves the canvas bounds container down by calling the movePaneDown method with the uuid of the current object.|
|`canMoveUp`||`boolean`|Checks if the current pane can move up.|
|`canMoveDown`||`boolean`|Checks if the current pane can move down.|
|`setPaneValueFormatters`|`formatters: YExtentFormatters` - The pane value formatters to be set.|`void`|Sets the pane value formatters for the current instance.|
|`regularValueFromY`|`y: number` - The Y coordinate.|`number`|Returns the regular value from Y coordinate.|
