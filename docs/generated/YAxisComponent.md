# YAxisComponent
Y axis component. Contains all Y axis related logic.

|Method|Parameters|Returns|Description|
|---|---|---|---|
|`registerDefaultLabelColorResolvers`||`void`|Registers default label color resolvers for different chart types.|
|`doActivate`||`void`|This method is used to activate a protected feature. It does not take any arguments and does not return anything.|
|`updateCursor`||`void`||
|`updateOrderedLabels`|`adjustYAxisWidth: boolean` |`void`|Updates labels visual appearance on canvas|
|`registerLabelColorResolver`|`chartType: keyof BarTypes` - The type of chart for which the label color resolver is being registered.`resolver: LabelColorResolver` - The function that will be used to resolve the color of the labels for the specified chart type.|`void`|Registers a label color resolver for a specific chart type.|
|`getLabelsColorResolver`|`candlesType: string` - The type of data series.|`LabelColorResolver`|Returns a function that resolves the color for a label based on the type of data series.|
|`registerYAxisLabelsProvider`|`provider: YAxisLabelsProvider` `groupName: string` - a group in which labels position recalculation algorithm will be applied, usually it's subchart name`id: string` |`string`|You can add a custom labels provider for additional labels on YAxis (like for drawings, symbol last price, studies, etc..)|
|`addSimpleYAxisLabel`|`name: string` `label: VisualYAxisLabel` |`void`|An easier way to manage custom y-axis labels, than y-axis labels providers. However, overlapping avoidance is not supported|
|`deleteSimpleYAxisLabel`|`name: string` |`void`||
|`getAxisType`||`PriceAxisType`||
|`unregisterYAxisLabelsProvider`|`groupName: string` - The name of the group from which to unregister the provider. Defaults to LabelsGroups.MAIN.`id: string` - The ID of the provider to unregister.|`string`|Unregister a Y axis labels provider from the specified group.|
|`getBounds`||`Bounds`||
|`registerYAxisWidthContributor`|`contributor: YAxisWidthContributor` |`void`|If custom pane has y-axis it has to register width contributor to correctly calculate overall y-axis width.|
|`setAxisType`|`type: PriceAxisType` - the type of axis|`void`|Sets the type of axis: percent, regular or logarithmic.|
|`setYAxisAlign`|`align: YAxisAlign` |`void`|Change YAxis position to left or to right|
|`setVisible`|`isVisible: boolean` |`void`|Controls visibility of the y-axis|
|`isVisible`||`boolean`|If visible, when you can see the y-axis on the chart|
|`setLockPriceToBarRatio`|`value: boolean` |`void`|Controls lockPriceToBarRatio of the y-axis|
|`changeLabelMode`|`type: string` - label type`mode: YAxisLabelMode` - visual mode|`void`|Changes the visual type of particular label.|
|`changeLabelAppearance`|`type: string` - label type`mode: YAxisLabelAppearanceType` - visual mode|`void`|Changes the visual type of particular label.|
|`togglePriceScaleInverse`|`inverse: boolean` - true or false|`void`|Sets the inverse price scale mode. Inverts Y axis vertically. Inversion also works for candles, drawings and overlay studies.|
|`changeLabelsDescriptionVisibility`|`descVisibility: boolean` - A boolean value indicating whether the descriptions should be visible or not.|`void`|Changes the visibility of the labels' descriptions.|
