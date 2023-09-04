# PaneComponent


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`doActivate`||`void`|Method that activates the canvas bounds container and recalculates the zoom Y of the scale model.|
|`createGridComponent`|`uuid: string` - The unique identifier of the pane.`scale: ScaleModel` - The scale model used to calculate the scale of the grid.`yAxisLabelsGenerator: NumericYAxisLabelsGenerator` - The generator used to create the labels for the y-axis.`yAxisState: YAxisConfig` |`GridComponent`|Creates a new GridComponent instance with the provided parameters.|
|`createYPanHandler`|`uuid: string` - The unique identifier of the chart pane.`scale: ScaleModel` - The scale model of the chart.|`[Unsubscriber, DragNDropYComponent]`|Creates a handler for Y-axis panning of the chart.|
|`addCursors`|`extentIdx: number` `yAxisComponent: YAxisComponent` |`Unsubscriber`||
|`createExtentComponent`|`options: AtLeastOne<YExtentCreationOptions>` |`YExtentComponent`||
|`removeExtentComponent`|`extentComponent: YExtentComponent` |`void`||
|`updateView`||`void`|This method updates the view by calling the doAutoScale method of the scaleModel and firing the Draw event using the eventBus.|
|`mergeYExtents`||`void`|Merges all the y-axis extents on the pane into one.|
|`getBounds`||`Bounds`|Returns the bounds of the pane component.|
|`hide`||`void`|Hides the pane by removing its bounds from the canvasBoundsContainer and firing a draw event.|
|`show`||`void`|Adds the bounds of the pane to the canvas bounds container and fires a draw event.|
|`createDataSeries`||`DataSeriesModel<DataSeriesPoint, VisualSeriesPoint>`|Creates a new DataSeriesModel object.|
|`addDataSeries`|`series: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint>` - The data series to be added.|`void`|Adds a new data series to the chart.|
|`removeDataSeries`|`series: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint>` - The data series to be removed.|`void`|Removes a data series from the chart.|
|`getAxisType`||`PriceAxisType`|Returns the type of the y-axis component for the current pane.|
|`moveUp`||`void`|Moves the canvas bounds container up by calling the movePaneUp method with the uuid of the current object.|
|`moveDown`||`void`|Moves the canvas bounds container down by calling the movePaneDown method with the uuid of the current object.|
|`canMoveUp`||`boolean`|Checks if the current pane can move up.|
|`canMoveDown`||`boolean`|Checks if the current pane can move down.|
|`setPaneValueFormatters`|`formatters: YExtentFormatters` - The pane value formatters to be set.|`void`|Sets the pane value formatters for the current instance.|
|`regularValueFromY`|`y: number` - The Y coordinate.|`number`|Returns the regular value from Y coordinate.|
