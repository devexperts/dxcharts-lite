const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = env => {
	return {
		mode: 'development',
		entry: {
			index: './src/index.dev.ts',
		},
		output: {
			filename: `./test/[name].js`,
			path: path.resolve(__dirname, 'dist'),
		},
		resolve: {
			extensions: ['.ts', '.js', '.json'],
		},
		devServer: {
			compress: true,
			host: '0.0.0.0',
			port: 3000,
			hot: true,
			historyApiFallback: true,
			open: false,
			liveReload: false,
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
			new HtmlWebpackPlugin(),
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
		devtool: 'inline-source-map',
	};
};
