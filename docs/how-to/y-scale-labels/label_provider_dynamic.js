export const provider = (chartInstance, group, getName) => ({
	getUnorderedLabels: () => {
		const y = chartInstance.chartModel.toY(chartInstance.chartModel.mainCandleSeries.dataPoints.at(-1).close);

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
