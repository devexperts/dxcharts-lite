export const provider = (y, name, group) => ({
	getUnorderedLabels: () => [
		{
			labels: [
				{
					y,
					labelText: name,
					bgColor: '#fff',
					description: group,
				},
			],
		},
	],
});
