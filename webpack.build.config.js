const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { EsbuildPlugin } = require('esbuild-loader');

module.exports = env => {
	const mode = (env && env.MODE) || 'development';
	const prodEnv = mode === 'production';
	console.log(`dxcharts-lite: Building standalone ${mode} version...`);
	return {
		mode,
		entry: {
			dxchart: './src/index.ts',
		},
		output: {
			filename: `./[name]${prodEnv ? '.min' : ''}.js`,
			path: path.resolve(__dirname, 'dist'),
			library: 'dxChart',
		},
		resolve: {
			extensions: ['.ts', '.js', '.json'],
		},
		module: {
			rules: [
				{
					test: /\.(ts|js)$/,
					exclude: /node_modules/,
					include: path.resolve('./src'),
					loader: 'esbuild-loader',
					options: {
						target: 'es6',
					},
				},
			],
		},
		plugins: [
			new ForkTsCheckerWebpackPlugin({
				async: false,
				typescript: {
					diagnosticOptions: {
						semantic: true,
						syntactic: true,
					},
					mode: 'write-references',
				},
			}),
		],
		devtool: prodEnv ? false : 'inline-source-map',
		optimization: {
			minimizer: [
				new EsbuildPlugin({
					target: 'es6',
				}),
			],
		},
	};
};
