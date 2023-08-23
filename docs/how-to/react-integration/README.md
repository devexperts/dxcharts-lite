# DXCharts Lite React integration

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/8tscnv)<!--/CSB_LINK-->

First we need to load candles from somewhere  
here `generateCandlesData` creates a mock data to show that chart is working  
you wont need it for anything else

```js
const [candles, setCandles] = React.useState([]);
//...
React.useEffect(() => {
	setCandles(DXChart.generateCandlesData({ quantity: 1000, withVolume: true }));
}, []);
```

To render the chart needs an html element,  
React creates it for us and can give a pointer via the ref property  
when the element is ready we pass it into DXChart.createChart() call  
which returns a chartInstance - a model of the chart which will be used further to control it

```js
const [chartInstance, setChartInstance] = React.useState(null);
const setRef = React.useCallback(node => {
	if (node) {
		setChartInstance(DXChart.createChart(node));
	}
}, []);
React.createElement('div', { /*...*/ ref: setRef });
// or <div ref={setRef} /> when using JSX
// we are using a ref callback here since the candles loading most often will take some time
```

When the chart instance is ready we can start rendering using `setMainSeries` method

```js
React.useEffect(() => {
	chartInstance &&
		chart.setData({
			candles,
		});
}, [candles, chartInstance]);
```

At last we tell the react app on which element it must be rendered, and it is done

```js
ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(App));
```

<iframe src="./index.html" style="width:100%; border:none; height: 400px" title="DXCharts Lite React integration"></iframe>
