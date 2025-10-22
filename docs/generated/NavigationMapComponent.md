# NavigationMapComponent
Navigation map component for chart.
Controls navigation map in the bottom.

|Method|Parameters|Returns|Description|
|---|---|---|---|
|`doActivate`||`void`|Method to activate the chart. It subscribes to the observables of the chartModel and canvasBoundsContainer. It also subscribes to the xChanged observable of the chartModel's scaleModel and filters the values to check
if the previous viewport had no-candles area and current viewport contains only candles or if the current viewport
has no-candles area. If the navigationMap component is visible, it makes visual candles and fires the draw event
of the canvasModel.|
|`makeVisualCandles`||`[number, number][]`|This function generates an array of visual candles based on the data provided by the chartModel. It calculates the maximum and minimum values of the candles and maps them to the canvas bounds.|
|`setVisible`|`visible: boolean` - Whether the navigation map component should be visible or not. Default is true.|`void`|Sets the visibility of the navigation map component.|
