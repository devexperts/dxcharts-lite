module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	testMatch: ['**/?(*.)+(test).ts?(x)'],
	transform: {
		'\\.[jt]sx?$': 'esbuild-jest',
	},
	moduleNameMapper: {
		'date-fns/esm': 'date-fns',
	},
	setupFiles: ['jest-canvas-mock'],
};
