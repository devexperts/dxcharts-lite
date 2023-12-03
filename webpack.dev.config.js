const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = env => {
	return {
		mode: 'development',
		entry: {
			index: './src/index.dev.ts',
			'offscreen-worker': './src/chart/canvas/offscreen/offscreen-worker.js',
		},
		output: {
			filename: `./[name].js`,
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
			headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' },
		},
		module: {
			rules: [
				{
					test: /\.(ts|js)$/,
					exclude: /node_modules/,
					include: path.resolve('./src'),
					loader: 'esbuild-loader',
					options: {
						target: 'es2020',
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
