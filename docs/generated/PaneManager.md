# PaneManager


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`addBounds`|`uuid: string` `order: number` |`Unsubscriber`||
|`addResizer`|`uuid: string` - The uuid of the pane to which the resizer is to be added.|`BarResizerComponent`|Adds a resizer to the canvas bounds container for the given uuid.|
|`getPaneIfHit`|`point: Point` - The point to check.|`PaneComponent`|Returns the pane component that contains the given point.|
|`createPane`|`uuid: string` `options: AtLeastOne<YExtentCreationOptions>` |`PaneComponent`|Creates sub-plot on the chart with y-axis|
|`movePaneUp`|`uuid: string` |`void`|Moves the canvas bounds container up by calling the movePaneUp method with the uuid of the current object.|
|`movePaneDown`|`uuid: string` |`void`|Moves the canvas bounds container down by calling the movePaneDown method with the uuid of the current object.|
|`canMovePaneUp`|`uuid: string` |`boolean`|Checks if the current pane can move up.|
|`canMovePaneDown`|`uuid: string` |`boolean`|Checks if the current pane can move down.|
|`removePane`|`uuid: string` |`void`|Removes pane from the chart and all related components|
|`hidePane`|`paneUUID: string` |`void`|Hides a pane from the chart and all related components|
|`showPane`|`paneUUID: string` |`void`|Shows a pane, use if the pane is hidden|
|`moveDataSeriesToPane`|`dataSeries: DataSeriesModel<DataSeriesPoint, VisualSeriesPoint, DataSeriesConfig>[]` `initialPane: PaneComponent` `initialExtent: YExtentComponent` `options: MoveDataSeriesToPaneOptions` |`void`|Move data series to a certain pane, or create a new one if no pane is found|
|`addCursors`|`uuid: string` - The unique identifier for the chart element.`cursor: string` - The type of cursor to be added to the chart element.|`() => void`|Adds cursors to the chart elements based on the provided uuid and cursor type.|
|`recalculateState`||`void`|Recalculates the zoom Y of all pane components and fires a draw event on the event bus.|
