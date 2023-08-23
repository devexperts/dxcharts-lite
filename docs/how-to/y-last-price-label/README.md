# Y-Axis labels

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/nh4wx4)<!--/CSB_LINK-->

There are 3 ways to see a label on a scale

-   show the only predefined label, `lastPrice`, denoting a closing price on a latest candle
-   create a custom label using `addSimpleYAxisLabel` method on the `yAxisComponent`
-   create and register a label provider

Each label may have an optional field `description` but they all can be either visible or hidden at the same time depending on flag `descriptions` in config
which later can be changed using `changeLabelsDescriptionVisibility` method

Each label have 2 configurable options of `mode` and `type`,  
`mode` desribes which parts of component will be rendered, can be `line`, `line-label`, `label` or `none`  
`type` is the shape of label itself, `badge`, `rectangle` or `plain`

These options can be set in config before instantiating the chart

```js
const config = {
	components: {
		yAxis: {
			labels: {
				descriptions: true,
				settings: {
					lastPrice: {
						mode: 'line-label',
						type: 'badge',
					},
				},
			},
		},
	},
};
//...
chartInstance = DXChart.createChart(node, config);
```

Mode can also be changed later, using the `changeLabelMode` method

```js
chartInstance.yAxisComponent.changeLabelMode('lastPrice', 'line-label');
```

Appearance type can be changed similarly, using the `changeLabelAppearance` method

```js
chartInstance.yAxisComponent.changeLabelAppearance('lastPrice', 'badge');
```

### lastPrice

The only label present by default even if not set in the config, can be hidden if necessary

<iframe src="./index.html" style="width:100%; border:none; height: 310px" title="DXCharts Lite Last Price"></iframe>
