const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

const filesConfig = {
	source: {
		jsFile: 'index',
		htmlFile: 'source.html',
	},
	case: {
		jsFile: 'index.dev',
		htmlFile: 'case.html',
	},
};

module.exports = env => {
	return {
		mode: 'development',
		entry: {
			index: `./src/${filesConfig[env.md].jsFile}.ts`,
		},
		output: {
			path: path.resolve(__dirname, '..', '..', 'dist', 'test'),
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
					loader: require.resolve('esbuild-loader'),
				},
			],
		},
		plugins: [
			new HtmlWebpackPlugin({
				filename: `${filesConfig[env.md].htmlFile}`,
				inject: 'body',
			}),
			new HtmlInlineScriptPlugin(),
		],
		devtool: 'source-map',
	};
};
