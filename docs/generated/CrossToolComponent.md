# CrossToolComponent
Default bundled chart cross tool.

|Method|Parameters|Returns|Description|
|---|---|---|---|
|`registerDefaultDrawerTypes`||`void`|Registers default drawer types for the chart.|
|`setVisible`|`visible: boolean` |`void`|Sets the cross tool visibility.|
|`setType`|`type: string` |`void`|Sets the crosstool type. - cross-and-labels - both the crosshair and X/Y labels
- only-labels - only the X/Y label
- none|
|`setMagnetTarget`|`target: MagnetTarget` |`void`|Sets magnet target for cross tool. Supported only for 'cross-and-labels' type.
Default magnet target is none.|
|`registerCrossToolTypeDrawer`|`drawerName: string` - an unique drawer type name`drawerImpl: CrossToolTypeDrawer` - CrossToolTypeDrawer object|`void`|Adds a new drawer type for cross tool, so you can add your own implementation of cross tool (or override existing)|
