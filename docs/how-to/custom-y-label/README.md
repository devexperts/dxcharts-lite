# Y-Axis labels

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/c4twvf)<!--/CSB_LINK-->

There are 3 ways to see a label on a scale

-   show the only predefined label, `lastPrice`, denoting a closing price on a latest candle
-   create a custom label using `addSimpleYAxisLabel` method on the `yAxis`
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
chart = DXChart.createChart(node, config);
```

Mode can also be changed later, using the `changeLabelMode` method

```js
chart.yAxis.changeLabelMode('lastPrice', 'line-label');
```

Appearance type can be changed similarly, using the `changeLabelAppearance` method

```js
chart.yAxis.changeLabelAppearance('lastPrice', 'badge');
```

## Creating custom labels

The easy way of drawing label is `addSimpleYAxisLabel` method of `yAxisComponent`
accepting ``LabelGroup` object with 2 required fields:

-   y - distance in units from the top of the chart
-   labelText - text on the label

To attach the label to the particular price on the scale one can use `toY` method of `chartModel`

```js
chart.yAxis.addSimpleYAxisLabel('custom_label', {
	y: parseInt(chart.chartModel.toY(price)),
	labelText: options.labelText,
	//...
});
```

and update it every time scale is changed - zoomed or shifted by subscribing to `yChanged` stream

```js
chartInstance.scale.yChanged.subscribe(/*update callback here*/);
```

`yChanged` is an Rxjs stream and can be manupulated using rx operators, `throttle` for example

<iframe src="./index.html" style="width:100%; border:none; height: 310px" title="DXCharts Lite Custom label"></iframe>