# ChartComponent


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`doActivate`||`void`|This method overrides the doActivate method of the parent class and calls it. It does not take any parameters and does not return anything.|
|`registerDefaultCandlesTransformers`||`void`|Registers default candle transformers.|
|`registerCandlesTransformer`|`chartType: keyof BarTypes` `transformer: VisualCandleCalculator` |`void`|You can use this method to determine logic of visual candle transformation for specified chart type.|
|`registerLastCandleLabelHandler`|`chartType: keyof BarTypes` `handler: LastCandleLabelHandler` |`void`|You can use this method to modify labels for last candle.|
|`registerCandlesWidthCalculator`|`chartType: keyof BarTypes` `calculator: CandleWidthCalculator` |`void`|You can use this method to determine chart width calculation for specified chart type.|
|`registerDefaultDataSeriesDrawers`||`void`|In future this drawers should have same type as main series|
|`setChartType`|`type: keyof BarTypes` - new type|`void`|Sets the chart type of main candle series.|
|`resetChartScale`||`void`|Resets chart scale to default according to config.components.chart.defaultZoomCandleWidth.|
|`setTimestampRange`|`start: number` - The start timestamp of the range.`end: number` - The end timestamp of the range.`forceNoAnimation: boolean` - true by default|`void`|Sets the timestamp range of the chart by setting the x-axis scale.|
|`setXScale`|`xStart: number` - viewport start in units`xEnd: number` - viewport end in units`forceNoAnimation: boolean` - true by default|`void`|Moves the viewport to exactly xStart..xEnd place.|
|`setShowWicks`|`isShow: boolean` - A boolean value indicating whether to show or hide the wicks.|`void`|Sets the visibility of the wicks in the chart.|
|`setApplyBackgroundToAxes`|`options: { x: boolean; y: boolean; }` - options for both axes|`void`|Sets the options for the background color applying to the chart axes|
|`setMainSeries`|`series: CandleSeries` |`void`|Used to set the main series to chart.|
|`setSecondarySeries`|`series: CandleSeries` |`CandleSeriesModel`|Adds new secondary chart series.|
|`setAllSeries`|`mainSeries: CandleSeries` `secondarySeries: CandleSeries[]` |`void`|Sets the main and secondary series in one bulk operation. Reindexing and visual rerender happens at the same time.|
|`toXFromCandleIndex`|`idx: number` |`number`|Converts candle index to chart x coordinate|
|`toXFromTimestamp`|`timestamp: number` |`number`|Converts timestamp to chart x coordinate|
|`toY`|`price: number` |`number`|Converts price to chart y coordinate|
|`updateAllSeries`|`mainSeries: CandleSeries` `secondarySeries: CandleSeries[]` |`void`|Updates the main and secondary series in one bulk operation. Reindexing and visual rerender happens at the same time.|
|`removeDataFrom`|`timestamp: number` |`void`|Removes all data points from the main candle series that are newer than the given timestamp. Can be useful for data replay.|
|`removeSecondarySeries`|`series: CandleSeriesModel` |`void`|Removes chart candles series.|
|`prependCandles`|`target: Candle[]` - initial candles array`prependUpdate: Candle[]` - additional candles array, which will be added to the target array|`void`|Adds new candles array to the existing one at the start, mostly used in lazy loading|
|`addLastCandle`|`candle: Candle` - new candle`instrumentSymbol: string` - name of the instrument to update|`void`|Adds new candle to the chart|
|`removeCandleByIdx`|`idx: number` - candle index`instrumentSymbol: string` - name of the instrument to update|`void`|Remove candle by idx and recalculate indexes|
|`removeCandlesByIdsSequence`|`ids: string[]` - candles ids to remove`selectedCandleSeries: CandleSeriesModel` - candle series to remove candles from|`void`|Remove candles by ids and recalculate indexes, candles should be as a sequence, follow one by one Works faster than removeCandlesByIds|
|`removeCandlesByIds`|`ids: string[]` - candles ids to remove`selectedCandleSeries: CandleSeriesModel` - candle series to remove candles from|`void`|Remove candles by ids and recalculate indexes|
|`addCandlesById`|`candles: Candle[]` - candles to add`startId: string` - target candle to start adding candles from`selectedCandleSeries: CandleSeriesModel` - candle series to add candles to|`void`|Add candles by id and recalculate indexes|
|`updateLastCandle`|`candle: Candle` - updated candle`instrumentSymbol: string` - name of the instrument to update|`void`|Updates last candle value|
|`updateCandles`|`candles: Candle[]` `instrumentSymbol: string` - name of the instrument to update|`void`|Updates candle series for instrument. By default takes main instrument.|
|`setOffsets`|`offsets: Partial<ChartConfigComponentsOffsets>` - new offsets|`void`|Sets offsets to viewport.|
|`getDataSeriesDrawer`|`drawerType: keyof BarTypes` - The type of the drawer to be returned.|`SeriesDrawer`|Returns a SeriesDrawer object based on the provided drawerType.|
|`registerDataSeriesTypeDrawer`|`drawerType: string` - a unique name for the drawer, could be {BarType} - in this case will override default drawer for the type`drawer: SeriesDrawer` - an implementation of the drawer|`void`|Registers a new chart type drawer or overrides default drawer if drawerType is {BarType}.|
|`updatePriceIncrementsIfNeeded`|`instrument: ChartInstrument` - The instrument to update the price increments for.|`void`|Updates the price increments of a given instrument if they are not valid or not defined. If the price increments are not valid or not defined, it will set them to a default value.|
|`observeOffsetsChanged`||`Observable<void>`|Returns an Observable that emits a void value whenever the offsetsChanged event is triggered.|
|`observeChartTypeChanged`||`Observable<keyof BarTypes>`|Returns an Observable that emits the BarType whenever the chart type is changed.|
|`observeCandlesChanged`||`Observable<void>`|Returns an Observable that emits a void value when the candles in the chart model change. The Observable is obtained by calling the observeCandlesChanged method of the chartModel object.|
|`observeCandlesUpdated`||`Observable<void>`|Returns an Observable that emits a void value when the candles are updated in the chart model. The Observable is obtained from the candlesUpdatedSubject of the chartModel.|
|`observeCandlesPrepended`||`Observable<PrependedCandlesData>`|Returns an Observable that emits a void value whenever the candlesPrependSubject is triggered.|
