# Y-Axis labels

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/c9m4nh)<!--/CSB_LINK-->

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

<iframe src="./price_label.html" style="width:100%; border:none; height: 310px" title="DXCharts Lite React integration"></iframe>

## Creating custom labels

The easy way of drawing label is `addSimpleYAxisLabel` method of `yAxisComponent`
accepting ``LabelGroup` object with 2 required fields:

-   y - distance in units from the top of the chart
-   labelText - text on the label

To attach the label to the particular price on the scale one can use `toY` method of `chartModel`

```js
chartInstance.yAxisComponent.addSimpleYAxisLabel('custom_label', {
	y: parseInt(chartInstance.chartModel.toY(price)),
	labelText: options.labelText,
	//...
});
```

and update it every time scale is changed - zoomed or shifted by subscribing to `yChanged` stream

```js
chartInstance.scaleModel.yChanged.subscribe(/*update callback here*/);
```

`yChanged` is an Rxjs stream and can be manupulated using rx operators, `throttle` for example

<iframe src="./custom_label.html" style="width:100%; border:none; height: 310px" title="DXCharts Lite React integration"></iframe>

## Label Provider

Most versatile method to create lable is to register a label provider, using `registerYAxisLabelsProvider`,
that is how label price is implemented internally

```js
chartInstance.yAxisComponent.registerYAxisLabelsProvider(provider, group, id);
```

-   `provider` is in essence any object containg `getUnorderedLabels` field that returns an array of `LabelGroup`

```js
provider = {
	getUnorderedLabels: () => [
		{
			labels: [
				{
					y: 100,
					labelText: 'my label',
					bgColor: '#ff0',
					///...
				},
			],
		},
	],
};
```

-   `group` - is a string that marks labels that shouldnt overlap when rendered close to each other  
    labelPrice belongs to the `MAIN` group
-   `id` - unique identificator, same as in `changeLabelMode(id,mode)`

Labels are updated by internal chart events but update also can be forced by calling `updateOrderedLabels` method

```js
chartInstance.yAxisComponent.updateOrderedLabels();
```

<iframe src="./label_provider.html" style="width:100%; border:none; height: 310px" title="DXCharts Lite React integration"></iframe>
