# PaneManager


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`addBounds`|`uuid: string` `order: number` |`Unsubscriber`||
|`addResizer`|`uuid: string` - The uuid of the pane to which the resizer is to be added.|`BarResizerComponent`|Adds a resizer to the canvas bounds container for the given uuid.|
|`getPaneIfHit`|`point: Point` - The point to check.|`PaneComponent`|Returns the pane component that contains the given point.|
|`createPane`|`uuid: string` `options: AtLeastOne<YExtentCreationOptions>` |`PaneComponent`|Creates sub-plot on the chart with y-axis|
|`removePane`|`uuid: string` |`void`|Removes pane from the chart and all related components|
|`addCursors`|`uuid: string` - The unique identifier for the chart element.`cursor: string` - The type of cursor to be added to the chart element.|`() => void`|Adds cursors to the chart elements based on the provided uuid and cursor type.|
|`recalculateState`||`void`|Recalculates the zoom Y of all pane components and fires a draw event on the event bus.|
