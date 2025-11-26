module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: './tsconfig.eslint.json',
	},
	plugins: ['jest'],
	overrides: [
		{
			files: ['**/__tests__/**/*', '**/*.{spec,test}.*'],
			rules: {
				// https://github.com/jest-community/eslint-plugin-jest
				'jest/no-conditional-expect': 'error',
				'jest/no-identical-title': 'error',
				'jest/no-interpolation-in-snapshots': 'error',
				'jest/no-jasmine-globals': 'error',
				'jest/no-mocks-import': 'error',
				'jest/valid-describe-callback': 'error',
				'jest/valid-expect': 'error',
				'jest/valid-expect-in-promise': 'error',
				'jest/valid-title': 'warn',
			},
		},
	],
};
