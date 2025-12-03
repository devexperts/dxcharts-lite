const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

module.exports = [
	{
		ignores: ['**/node_modules/**', '**/dist/**'],
	},
	...compat.extends('./.eslintrc.js').map(config => ({
		...config,
		files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
	})),
	{
		rules: {
			'deprecation/deprecation': 'off',
		},
	},
];
