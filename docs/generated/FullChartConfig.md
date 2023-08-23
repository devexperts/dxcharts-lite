### `FullChartConfig`
The main configuration file for chart-core.
Includes all components' configurations, global configs like dateFormatter, and colors.

|Property|Description|Type|
|---|---|---|
|`scale`|Controls how chart series are positioned horizontally and vertically. Other configurations like: inverse, lockRatio etc.|[`ChartScale`](#chartscale)|
|`components`|Group of component configurations. Chart component is a single visual object on chart. Examples: chart itself, events, x-axis, highlights, cross tool.|[`ChartComponents`](#chartcomponents)|
|`colors`|All colors in chart-core are configured here.|[`FullChartColors`](#fullchartcolors)|
|`dateFormatter`|Date and time formatting configuration.|[`DateFormatter`](#dateformatter)|
|`timezone`|Timezone to use on chart X axis labels and any other timestamps. Examples: Africa/Accra, Europe/Moscow, Asia/Tehran.|`string`|
|`fixedSize`|If set - chart canvas will have fixed size always.|`{ width: number; height: number; }`|
|`rtl`|Right to left mode. Used in drawings (like text drawing) calculation.|`boolean`|
|`drawingOrder`|Initial visual order of chart drawers. Reorder to put volumes on top of candles for example.|`("MAIN_BACKGROUND" | "MAIN_CLEAR" | "HIT_TEST_CLEAR" | "YAXIS_CLEAR" | "SERIES_CLEAR" | "OVER_SERIES_CLEAR" | "HIT_TEST_DRAWINGS" | "GRID" | "VOLUMES" | "UNDERLAY_VOLUMES_AREA" | ... 15 more ... | "CROSS_TOOL")[]`|
|`useUTCTimeOverride`||`boolean`|
|`animation`||[`AnimationConfig`](#animationconfig)|
|`devexpertsPromoLink`||`boolean`|
|`shortDays`||`string[]`|
|`shortMonths`||`string[]`|

### `ChartScale`
Controls how chart series are positioned horizontally and vertically.
Other configurations like: inverse, lockRatio etc.

|Property|Description|Type|
|---|---|---|
|`auto`|Auto scale will always fit whole chart series in viewport.|`boolean`|
|`zoomToCursor`|True - will zoom to cursor on mouse wheel. False - zoom to last candle.|`boolean`|
|`lockPriceToBarRatio`|Locks the ratio between price/time, so when zooming it will feel like google maps.|`boolean`|
|`inverse`|Inverses the Y scale vertically. TODO move to components.yAxis.|`boolean`|
|`autoScaleOnCandles`|Do auto scale (even if it's not enabled in config) after instrument change.|`boolean`|
|`autoScaleDisableOnDrag`|When dragging chart under specific angle - will automatically disable auto-scale.|[`AutoScaleDisableOnDrag`](#autoscaledisableondrag)|
|`zoomSensitivity`|0..1 ratio of full viewport; 0.5 = middle, 0.75 = 3/4 of viewport|`number`|
|`defaultViewportItems`|Defines how much items (candles) will be in viewport when chart applies basic scale|`number`|
|`keepZoomXOnYAxisChange`|Adjust x viewport when y-axis width is changed, so x zoom remains the same|`boolean`|

### `AutoScaleDisableOnDrag`
When dragging chart under specific angle - will automatically disable auto-scale.

|Property|Description|Type|
|---|---|---|
|`enabled`||`boolean`|
|`edgeAngle`|The angle of mouse movement. Default - Math.PI / 9.|`number`|
|`yDiff`|Distance that mouse should travel vertically in px. Default - 80.|`number`|

### `ChartComponents`
Group of component configurations. Chart component is a single visual object on chart.
Examples: chart itself, events, x-axis, highlights, cross tool.

|Property|Description|Type|
|---|---|---|
|`chart`||[`ChartConfigComponentsChart`](#chartconfigcomponentschart)|
|`xAxis`||[`ChartConfigComponentsXAxis`](#chartconfigcomponentsxaxis)|
|`yAxis`||[`ChartConfigComponentsYAxis`](#chartconfigcomponentsyaxis)|
|`grid`||[`GridComponentConfig`](#gridcomponentconfig)|
|`volumes`||[`ChartConfigComponentsVolumes`](#chartconfigcomponentsvolumes)|
|`offsets`||[`ChartConfigComponentsOffsets`](#chartconfigcomponentsoffsets)|
|`waterMark`||[`ChartConfigComponentsWaterMark`](#chartconfigcomponentswatermark)|
|`events`||[`ChartConfigComponentsEvents`](#chartconfigcomponentsevents)|
|`highLow`||[`ChartConfigComponentsHighLow`](#chartconfigcomponentshighlow)|
|`crossTool`||[`ChartConfigComponentsCrossTool`](#chartconfigcomponentscrosstool)|
|`highlights`||[`ChartConfigComponentsHighlights`](#chartconfigcomponentshighlights)|
|`navigationMap`||[`ChartConfigComponentsNavigationMap`](#chartconfigcomponentsnavigationmap)|
|`baseline`||[`ChartConfigComponentsBaseline`](#chartconfigcomponentsbaseline)|
|`paneResizer`|Horizontal resizer between panes|[`ChartConfigComponentsPaneResizer`](#chartconfigcomponentspaneresizer)|

### `ChartConfigComponentsChart`


|Property|Description|Type|
|---|---|---|
|`type`|The type of chart. Candle, bar, area and others.|`keyof BarTypes`|
|`showCandlesBorder`|Shows the border of candle. Useful for hollow-candles and to increase contrast on thin candles.|`boolean`|
|`showActiveCandlesBorder`|Shows the border for active candle (tapped by finger on mobile devices).|`boolean`|
|`showWicks`|Shows candle wicks - high and low.|`boolean`|
|`candleLineWidth`||`number`|
|`barLineWidth`||`number`|
|`lineWidth`||`number`|
|`areaLineWidth`||`number`|
|`minCandles`|The minimum amount of candles in viewport. It will not be possible to make fewer than that by using zoom.|`number`|
|`defaultZoomCandleWidth`||`number`|
|`minWidth`||`number`|
|`zoomStep`||`number`|
|`candlePaddingPercent`||`number`|
|`highlightActiveCandle`||`boolean`|
|`cursor`||`string`|
|`selectedWidth`||`number`|
|`minCandlesOffset`||`number`|
|`histogram`||[`ChartConfigComponentsHistogram`](#chartconfigcomponentshistogram)|

### `ChartConfigComponentsHistogram`


|Property|Description|Type|
|---|---|---|
|`barCapSize`||`number`|

### `ChartConfigComponentsXAxis`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`cursor`||`string`|
|`formatsForLabelsConfig`||`Record<TimeFormatWithDuration, string>`|
|`padding`||`{ top?: number; bottom?: number; }`|
|`fontSize`||`number`|
|`fontFamily`||`string`|
|`fontStyle`||`string`|

### `ChartConfigComponentsYAxis`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`type`|Type of Y axis. Currently supported 'regular', 'percent', 'logarithmic'.|`PriceAxisType`|
|`align`|Align Y axis left or right.|`YAxisAlign`|
|`labels`|Configures the labels on Y axis.|[`YAxisLabels`](#yaxislabels)|
|`typeConfig`|Override appearance of different label types. Useful to change all labels of the same type.|`YAxisTypeConfig`|
|`labelHeight`|The height of the single label in pixels. Used during calculation step between labels.
You can make it smaller to fit more labels on Y axis. Or less to fit less labels.|`number`|
|`zeroPercentLine`|Always show zero line for percent scale.|`boolean`|
|`customScale`|Allow to scale chart vertically by dragging Y axis with mouse.|`boolean`|
|`customScaleDblClick`|Allows to double-click on Y axis to turn on auto-scale.|`boolean`|
|`cursor`||`string`|
|`resizeDisabledCursor`||`string`|
|`labelBoxMargin`||`{ top: number; bottom: number; end: number; start: number; }`|
|`fontSize`||`number`|
|`fontFamily`||`string`|

### `YAxisLabels`
Configures the labels on Y axis.

|Property|Description|Type|
|---|---|---|
|`descriptions`||`boolean`|
|`settings`|Settings contains required labels ('lastPrice', 'countDownToBarClose') and optional labels ('bidAsk', 'highLow', 'prevDayClose', 'prePostMarket').|`Record<string, YAxisLabelConfig>`|

### `GridComponentConfig`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`vertical`|Shows vertical grid lines.|`boolean`|
|`horizontal`|Shows horizontal grid lines.|`boolean`|
|`width`|Width of grid lines in pixels.|`number`|
|`dash`|Line dash configuration like [1,2].|`number[]`|
|`color`||`string`|

### `ChartConfigComponentsVolumes`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`showSeparately`|Show volumes in overlaying mode or as sub-chart like a study.|`boolean`|
|`volumeFillColor`||`string`|
|`valueLines`||`number`|
|`barCapSize`||`number`|
|`volumeBarSpace`||`number`|

### `ChartConfigComponentsOffsets`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`top`|Top offset, measured in percents of chart height.|`number`|
|`left`|Left offset, measured in amount of candles.|`number`|
|`right`|Right offset, measured in amount of candles.|`number`|
|`bottom`|Bottom offset, measured in percents of chart height.|`number`|

### `ChartConfigComponentsWaterMark`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`position`|Position on the screen.|`WaterMarkPositionType`|
|`offsetX`||`number`|
|`offsetY`||`number`|
|`logoWidth`||`number`|
|`logoHeight`||`number`|
|`fontFamily`||`string`|
|`firstRowFontSize`|Font size for first text line.|`number`|
|`firstRowBottomPadding`|Padding after first text line.|`number`|
|`secondRowFontSize`|Font size for second text line.|`number`|
|`secondRowBottomPadding`|Padding after second text line.|`number`|
|`thirdRowFontSize`|Font size for third text line.|`number`|
|`thirdRowBottomPadding`|Padding after third text line.|`number`|

### `ChartConfigComponentsEvents`


|Property|Description|Type|
|---|---|---|
|`visible`|Toggle events visibility.|`boolean`|
|`eventsVisibility`|Toggle specific event type visibility (for example: dividends, splits, earnings).|`Record<EventType, boolean>`|
|`height`|Height of events area in pixels|`number`|
|`cursor`|Configure events cursor type.|`string`|
|`xAxisLabelFormat`|Configure x axis labels|`DateTimeFormatConfig[]`|
|`icons`|Configure icons, the format is string which contains svg tag, for example: '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M1.06066 6.5L6.5 1.06066L11.9393 6.5L6.5 11.9393L1.06066 6.5Z" stroke="#D92C40" stroke-width="1.5"/>
	</svg>'|[`ChartConfigComponentsEventsIcons`](#chartconfigcomponentseventsicons)|

### `ChartConfigComponentsEventsIcons`
Configure icons, the format is string which contains svg tag, for example:
'<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M1.06066 6.5L6.5 1.06066L11.9393 6.5L6.5 11.9393L1.06066 6.5Z" stroke="#D92C40" stroke-width="1.5"/>
	</svg>'

|Property|Description|Type|
|---|---|---|
|`earnings`||[`CustomIcon`](#customicon)|
|`dividends`||[`CustomIcon`](#customicon)|
|`splits`||[`CustomIcon`](#customicon)|
|`conferenceCalls`||[`CustomIcon`](#customicon)|

### `CustomIcon`


|Property|Description|Type|
|---|---|---|
|`normal`||`string`|
|`hover`||`string`|

### `CustomIcon`


|Property|Description|Type|
|---|---|---|
|`normal`||`string`|
|`hover`||`string`|

### `CustomIcon`


|Property|Description|Type|
|---|---|---|
|`normal`||`string`|
|`hover`||`string`|

### `CustomIcon`


|Property|Description|Type|
|---|---|---|
|`normal`||`string`|
|`hover`||`string`|

### `ChartConfigComponentsHighLow`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`font`|Font config of high/low labels.|`string`|

### `ChartConfigComponentsCrossTool`


|Property|Description|Type|
|---|---|---|
|`type`|The type of cross tool.  Visibility is also contolled by type, set 'none' to hide the cross tool.|`string`|
|`lineDash`|Line dash for cross tool.|`number[]`|
|`discrete`|When discrete is ON - the cross tool X coordinate will always be at the middle of candle.|`boolean`|
|`magnetTarget`|Cross tool Y coordinate can magnet to OHLC values of candle.|`MagnetTarget`|
|`xAxisLabelFormat`|Format of X label config for different periods.|`DateTimeFormatConfig[]`|
|`xLabel`|X label appearance.|`{ padding: { top: number; bottom: number; right: number; left: number; }; margin: { top: number; bottom?: number; }; }`|
|`yLabel`|X label appearance.|`{ padding: { top: number; bottom: number; end: number; start: number; }; type: YAxisLabelAppearanceType; }`|

### `ChartConfigComponentsHighlights`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`border`|Border of highlights (session breaks for example).|`{ width: number; dash: [number, number]; }`|
|`fontFamily`||`string`|
|`fontSize`||`number`|

### `ChartConfigComponentsNavigationMap`


|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`allCandlesHistory`||`boolean`|
|`timeLabels`||`{ visible: boolean; dateFormat: string; fontFamily: string; fontSize: number; padding: { x: number; y: number; }; }`|
|`cursors`||`{ chart: string; buttonLeft: string; buttonRight: string; leftResizer: string; rightResizer: string; slider: string; }`|
|`knots`||`{ height: number; width: number; border: number; lineWidth: number; }`|
|`minSliderWindowWidth`||`number`|

### `ChartConfigComponentsBaseline`


|Property|Description|Type|
|---|---|---|
|`cursor`||`string`|
|`dragZone`||`number`|
|`height`||`number`|

### `ChartConfigComponentsPaneResizer`
Horizontal resizer between panes

|Property|Description|Type|
|---|---|---|
|`visible`||`boolean`|
|`height`|Height of resizer in pixels.|`number`|
|`fixedMode`|Make the horizontal line fixed and disable resizing.|`boolean`|
|`dragZone`|Hover area of resizer in pixels.|`number`|
|`cursor`||`string`|

### `FullChartColors`
All colors in chart-core are configured here.

|Property|Description|Type|
|---|---|---|
|`candleTheme`||[`CandleTheme`](#candletheme)|
|`activeCandleTheme`||[`CandleTheme`](#candletheme)|
|`barTheme`||[`LineStyleTheme`](#linestyletheme)|
|`lineTheme`||[`LineStyleTheme`](#linestyletheme)|
|`areaTheme`||[`AreaStyleTheme`](#areastyletheme)|
|`chartAreaTheme`||[`ChartAreaTheme`](#chartareatheme)|
|`scatterPlot`||[`ScatterPlotStyle`](#scatterplotstyle)|
|`baseLineTheme`||[`BaselineStyleTheme`](#baselinestyletheme)|
|`histogram`||[`HistogramColors`](#histogramcolors)|
|`highlights`||`Record<"AFTER_MARKET" | "PRE_MARKET" | "NO_TRADING" | "REGULAR", HighlightsColors>`|
|`volume`||[`VolumeColors`](#volumecolors)|
|`secondaryChartTheme`||`SecondaryChartTheme[]`|
|`waterMarkTheme`||`{ firstRowColor: string; secondRowColor: string; thirdRowColor: string; }`|
|`highLowTheme`||`{ highColor: string; lowColor: string; }`|
|`yAxis`||`{ backgroundColor: string; backgroundHoverColor: string; zeroPercentLine: string; labelTextColor: string; labelInvertedTextColor: string; labelBoxColor: string; rectLabelTextColor: string; rectLabelInvertedTextColor: string; }`|
|`xAxis`||`{ backgroundColor: string; labelTextColor: string; }`|
|`crossTool`||`{ lineColor: string; labelBoxColor: string; labelTextColor: string; }`|
|`events`||`{ earnings: EventColors; dividends: EventColors; splits: EventColors; 'conference-calls': EventColors; }`|
|`navigationMap`||`{ buttonColor: string; knotColor: string; sliderColor: string; backgroundColor: string; buttonArrowColor: string; knotLineColor: string; knotBorderColor: string; timeLabelsTextColor: string; mapFillColor: string; mapGradientTopColor?: string; mapGradientBottomColor?: string; mapColor: string; }`|
|`instrumentInfo`||`{ textColor: string; }`|
|`paneResizer`||`{ lineColor: string; bgColor: string; bgHoverColor: string; }`|
|`labels`||[`YAxisLabelsColors`](#yaxislabelscolors)|

### `CandleTheme`


|Property|Description|Type|
|---|---|---|
|`upColor`||`string`|
|`downColor`||`string`|
|`noneColor`||`string`|
|`upWickColor`||`string`|
|`downWickColor`||`string`|
|`noneWickColor`||`string`|
|`borderOpacity`||`number`|

### `CandleTheme`


|Property|Description|Type|
|---|---|---|
|`upColor`||`string`|
|`downColor`||`string`|
|`noneColor`||`string`|
|`upWickColor`||`string`|
|`downWickColor`||`string`|
|`noneWickColor`||`string`|
|`borderOpacity`||`number`|

### `LineStyleTheme`


|Property|Description|Type|
|---|---|---|
|`upColor`||`string`|
|`downColor`||`string`|
|`noneColor`||`string`|

### `LineStyleTheme`


|Property|Description|Type|
|---|---|---|
|`upColor`||`string`|
|`downColor`||`string`|
|`noneColor`||`string`|

### `AreaStyleTheme`


|Property|Description|Type|
|---|---|---|
|`lineColor`||`string`|
|`startColor`||`string`|
|`stopColor`||`string`|

### `ChartAreaTheme`


|Property|Description|Type|
|---|---|---|
|`backgroundMode`||`"regular" | "gradient"`|
|`backgroundColor`||`string`|
|`backgroundGradientTopColor`||`string`|
|`backgroundGradientBottomColor`||`string`|
|`axisColor`||`string`|
|`gridColor`||`string`|

### `ScatterPlotStyle`


|Property|Description|Type|
|---|---|---|
|`mainColor`||`string`|

### `BaselineStyleTheme`


|Property|Description|Type|
|---|---|---|
|`upperSectionStrokeColor`||`string`|
|`lowerSectionStrokeColor`||`string`|
|`upperSectionFillColor`||`string`|
|`lowerSectionFillColor`||`string`|
|`baselineColor`||`string`|

### `HistogramColors`


|Property|Description|Type|
|---|---|---|
|`upCap`||`string`|
|`upBottom`||`string`|
|`upBright`||`string`|
|`downCap`||`string`|
|`downBottom`||`string`|
|`downBright`||`string`|
|`noneCap`||`string`|
|`noneBottom`||`string`|
|`noneBright`||`string`|

### `VolumeColors`


|Property|Description|Type|
|---|---|---|
|`downCapColor`||`string`|
|`upCapColor`||`string`|
|`noneCapColor`||`string`|
|`downBarColor`||`string`|
|`upBarColor`||`string`|
|`noneBarColor`||`string`|

### `YAxisLabelsColors`


|Property|Description|Type|
|---|---|---|
|`lastPrice`||[`YAxisLastPriceLabelColorConfig`](#yaxislastpricelabelcolorconfig)|
|`bidAsk`||[`YAxisBidAskLabelColorConfig`](#yaxisbidasklabelcolorconfig)|
|`highLow`||[`YAxisHighLowLabelColorConfig`](#yaxishighlowlabelcolorconfig)|
|`prePostMarket`||[`YAxisPrePostMarketLabelColorConfig`](#yaxisprepostmarketlabelcolorconfig)|
|`prevDayClose`||[`YAxisLabelColorConfig`](#yaxislabelcolorconfig)|

### `YAxisLastPriceLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxSelected`||`string`|
|`boxPositive`||`string`|
|`boxNegative`||`string`|
|`textSelected`||`string`|
|`textNegative`||`string`|
|`textPositive`||`string`|

### `YAxisBidAskLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`bid`||[`YAxisLabelColorConfig`](#yaxislabelcolorconfig)|
|`ask`||[`YAxisLabelColorConfig`](#yaxislabelcolorconfig)|

### `YAxisLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxColor`||`string`|
|`textColor`||`string`|
|`descriptionText`||`string`|

### `YAxisLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxColor`||`string`|
|`textColor`||`string`|
|`descriptionText`||`string`|

### `YAxisHighLowLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`high`||[`YAxisLabelColorConfig`](#yaxislabelcolorconfig)|
|`low`||[`YAxisLabelColorConfig`](#yaxislabelcolorconfig)|

### `YAxisLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxColor`||`string`|
|`textColor`||`string`|
|`descriptionText`||`string`|

### `YAxisLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxColor`||`string`|
|`textColor`||`string`|
|`descriptionText`||`string`|

### `YAxisPrePostMarketLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`pre`||[`YAxisLabelColorConfig`](#yaxislabelcolorconfig)|
|`post`||[`YAxisLabelColorConfig`](#yaxislabelcolorconfig)|

### `YAxisLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxColor`||`string`|
|`textColor`||`string`|
|`descriptionText`||`string`|

### `YAxisLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxColor`||`string`|
|`textColor`||`string`|
|`descriptionText`||`string`|

### `YAxisLabelColorConfig`


|Property|Description|Type|
|---|---|---|
|`boxColor`||`string`|
|`textColor`||`string`|
|`descriptionText`||`string`|

### `DateFormatter`
Date and time formatting configuration.

|Property|Description|Type|
|---|---|---|
|`applyPattern`||`(pattern: string) => string`|
|`createFormatterFunction`||`(pattern: string) => DateTimeFormatter`|
|`utcTimeOverride`||`{ pattern?: string; test?: (pattern: string) => void; }`|

### `AnimationConfig`


|Property|Description|Type|
|---|---|---|
|`duration`||`number`|
|`timeLeft`||`number`|
