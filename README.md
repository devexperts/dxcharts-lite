 <br>
<p align="center">
  <img src="docs/images/logo.png" alt="devexperts-logo" width="294px" height="100px"/>
</p>

<h1 align="center">DXCharts Lite - one of the most powerful financial charting tools</h1>

<p align="center">
  <i>
    DXcharts Lite is a modern solution made for visualization financial data with full variety of charts.<br>
    It's been created and tempered as a part of big tradings apps with millions of users.<br>
    Now it's grown enough to be recognized as independent product capable to support any from your needs<br>
    as a simple widget for blog and as a part of big enterprise solution for trading.
  </i>
  <br>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MPL-2.0">
    <img src="https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg" alt="License: MPL 2.0" />
  </a>&nbsp;
  <a href="https://devexperts.com/kb/dxcharts/docs/how-to-contribute">
    <img src="https://img.shields.io/static/v1?label=PRs&message=Welcome&color=blue" alt="PRs: Welcome" />
  </a>&nbsp;
  <a href="https://devexperts.com/dxcharts-demo/?lang=en">
    <img src="https://img.shields.io/static/v1?label=Latest%20version&message=1.0.0&color=blue" alt="Version" />
  </a>
</p>

<br>

<p align="center">
  <img src="docs/images/fourbasiccharts.png" width="1000px" alt="4 charts example"/>
</p>

<hr>

## Overview

Get started with DXCharts Lite, install the library and configure it as you want.

-   🚀 [Quick start](#quick-start)
    -   📦 [Installation](#installation)
    -   🛠️ [Create Chart](#create-chart)
    -   📈 [Set data](#set-data)
    -   📄 [HTML markup](#html-markup)
-   ⚙️ [Configuration](#configuration)
-   🔌 [API](#api)
-   📒 [Examples](#examples)
-   🧮 [Demo](#demo)

## Quick-start

### Installation

Install library to your project:

```js
npm install @devexperts/dxcharts-lite
```

Your `package.json` after installation:

```json
"dependencies": {
	"@devexperts/dxcharts-lite": "1.0.0",
	...
}
```

### Create chart

If you use webpack or any other bundler - import `createChart` method and pass element where the chart will be rendered as a first argument.

```js
export const createChartInstance = () => {
	const container = document.getElementById('chart_container');
	const chartInstance = DXChart.createChart(container);
	return chartInstance;
};
```

`createChart` - method, that creates a new chart instance using ChartBootstrap class and returns it.

Method accepts 2 parameters:

-   `element` - The HTML element where the chart will be rendered
-   `config` (optional) - instance of [ChartConfig](/chart/chart-config/overview)

> Also, please, set `width: 100%` and `height: 100%` for parent container
> by default chart is auto-resizing to parent
> you can change it by setting `fixedSize` in config

Now you should have empty chart on screen.

### Set data

Let's pass in some data i.e. `Candles`. You can use bundled function to generate some mock data.
Import `generateCandlesData` and call it to generate candles.
Also, you would need `Instrument` object - it is required to show instrument description on chart and show correct price precisions on Y axis.

```js
export const generateMockData = () => {
	const mockCandles = generateCandlesData();
	const mockInstrument = {
		symbol: 'AAPL',
		priceIncrements: [0.01],
	};
	chartInstance.chartComponent.setMainSeries({ candles: mockCandles, instrument: mockInstrument });
};
```

Now you should see chart just like image below:

<p align="center">
  <img src="docs/images/basicchart.png" width="1000px" alt="Basic chart"/>
</p>

### HTML-markup

Here is full quick-start code example:

```markup
<html>
    <head>
        <script src="https://webdev.prosp.devexperts.com:8095/dxcharts-lite-cdn/dxchart.min.js"></script>
    </head>
    <body>
        <div id="chart_container"></div>
    </body>
    <script type="module">
        import generateCandlesData from 'https://webdev.prosp.devexperts.com:8095/dxcharts-lite-cdn/chart/utils/candles-generator.utils.js';

        // create chart instance, pass parent container as 1st argument
        const container = document.getElementById("chart_container");
        const chartInstance = DXChart.createChart(container);
        // create and set candles data
        const mockCandles = generateCandlesData();
        const mockInstrument = {
            symbol: 'AAPL',
            priceIncrements: [0.01],
        };
        chartInstance.chartComponent.setMainSeries({ candles: mockCandles, instrument: mockInstrument });
  </script>
```

## Configuration

You can configure chart with `ChartConfig` object. It is optional.

`ChartConfig` is used to set initial properties for chart instance.
Below you can see full table of it, and other options, that `ChartConfig` consists of.

-   [`FullChartConfig`](docs/generated/FullChartConfig.md)

## API

Every chart component has an API allowing change a lot of params on the fly.
Change appearance at runtime.
Subscribe on different events in chart (like HOVER on candle)

Here are the links of the main components:

-   [`ChartComponent`](docs/generated/ChartComponent.md) - set data, subscribe on data changes
-   [`XAxisComponent`](docs/generated/XAxisComponent.md) - configure x-labels
-   [`YAxisComponent`](docs/generated/YAxisComponent.md) - configure labels and set y-axis type
-   [`CrossToolComponent`](docs/generated/CrossToolComponent.md) - cross-hair type, OHLC magnet
-   [`EventsComponent`](docs/generated/EventsComponent.md) - set events data
-   [`VolumesComponent`](docs/generated/VolumesComponent.md) - set volumes
-   [`WaterMarkComponent`](docs/generated/WaterMarkComponent.md) - create and manage a watermark
-   [`NavigationMapComponent`](docs/generated/NavigationMapComponent.md) - create a navigation map
-   [`SnapshotComponent`](docs/generated/SnapshotComponent.md) - create a snapshot
-   [`HighlightsComponent`](docs/generated/HighlightsComponent.md) - allows to draw highlights of some canvas objects such as labels
-   [`PaneManager`](docs/generated/PaneManager.md) - create and manage panes
-   [`PaneComponent`](docs/generated/PaneComponent.md) - create and manage panes data series

## Examples

We have created a lot of examples with different chart configuration.
You can find them [here](https://github.com/devexperts/dxcharts-lite/tree/master/docs/how-to).

## Demo

To show you how it's beautiful, we have created [Demo version](https://devexperts.com/dxcharts-demo/), based on DXCharts Lite. Feel all power of our library!
