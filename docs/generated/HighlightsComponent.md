# HighlightsComponent


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`getHighlights`||`Highlight[]`|Returns the highlights from the highlightsModel|
|`setHighlights`|`highlights: Highlight[]` - An array of Highlight objects to be set as the highlights of the model.|`void`|Sets the highlights of the highlights model.|
|`setHighlightsVisible`|`visible: boolean` - A boolean value indicating whether the highlights should be visible or not. Default value is true.|`void`|Sets the visibility of the highlights component.|
|`observeHighlightsUpdated`||`Observable<Highlight[]>`|Returns an observable that emits when the highlights are updated.|
