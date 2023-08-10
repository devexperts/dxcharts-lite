module.exports = {
	preset: 'ts-jest',
	testMatch: ['**/?(*.)+(test).ts?(x)'],
	transform: {
		'\\.[jt]sx?$': 'esbuild-jest',
	},
};
