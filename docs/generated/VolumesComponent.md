# VolumesComponent


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`registerDefaultVolumeColorResolvers`||`void`|Registers default volume color resolvers for candle, line and bar charts|
|`setShowVolumesSeparatly`|`separate: boolean` - A boolean value indicating whether the volumes should be shown separately or not.|`void`|Sets whether the volumes should be shown separately or not.|
|`doDeactivate`||`void`|This method deactivates the current component by calling the superclass doDeactivate method and setting the visibility of the component to false.|
|`registerVolumeColorResolver`|`chartType: keyof BarTypes` `resolver: VolumeColorResolver` |`void`|You can use this method to determine volumes' color for specified chart type.|
|`setVisible`|`visible: boolean` - Whether the volumes component should be visible or not. Default is true.|`void`|Sets the visibility of the volumes component and updates the canvas accordingly.|
