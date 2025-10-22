# XAxisComponent
X-axis component, contains all x-axis calculation and rendering logic.

|Method|Parameters|Returns|Description|
|---|---|---|---|
|`doActivate`||`void`|This method is used to activate the chart and update the labels if there is a new data set or equivolume type. It subscribes to the chart type change, candles set subject, candles updated subject, and time zone change to generate new labels.
It also subscribes to the x-axis scale change and canvas resize to recalculate the labels.|
|`getDrawer`||`XAxisTimeLabelsDrawer`|Returns the xAxisDrawer object.|
|`registerXAxisLabelsProvider`|`provider: XAxisLabelsProvider` |`void`|You can add a custom labels provider for additional labels on XAxis (like for drawings)|
|`setVisible`|`isVisible: boolean` |`void`|Controls visibility of the x-axis|
|`setFormatsForLabelsConfig`|`newFormatsByWeightMap: Record<TimeFormatWithDuration, string>` |`void`|Set new config for x labels formatting|
|`isVisible`||`boolean`|If visible, when you can see the x-axis on the chart|
