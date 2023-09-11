export default (chart, group, getName) => ({
	getUnorderedLabels: () => {
		const y = chart.chartModel.toY(chart.chartModel.mainCandleSeries.dataPoints.at(-1).close);

		return [
			{
				labels: [
					{
						y,
						labelText: getName.name,
						bgColor: '#ff0',
						description: group,
						mode: 'line-label',
					},
				],
			},
		];
	},
});
