# WaterMarkComponent


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`setWaterMarkVisible`|`visible: boolean` - A boolean indicating whether the watermark should be visible or not.|`void`|Sets the visibility of the watermark component.|
|`setWaterMarkData`|`watermarkData: WaterMarkData` - The data to be used as watermark.|`void`|Sets the watermark data to be used in the canvas.|
|`getWaterMarkData`||`WaterMarkData`|Returns the water mark data object if it exists, otherwise returns an empty object.|
|`setWaterMarkConfig`|`watermarkConfig: WaterMarkConfig` - The configuration object for the watermark.|`void`|Sets the watermark configuration for the chart.|
|`setLogoImage`|`img: CanvasImageSource` - The image to be used as a watermark.|`void`|Sets the logo image to be used as a watermark.|
|`recalculateTextSize`|`chartWidth: number` - The width of the chart.`chartHeight: number` - The height of the chart.|`{ firstRowFontSize: number; secondRowFontSize: number; thirdRowFontSize: number; visible: boolean; position: WaterMarkPositionType; offsetX: number; offsetY: number; ... 5 more ...; thirdRowBottomPadding: number; }`|Recalculates the watermark text size based on the chart's width and height.|
