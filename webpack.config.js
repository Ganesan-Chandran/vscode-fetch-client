//@ts-check

'use strict';

const path = require('path');
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");


/**
 * @param {'development' | 'production' | 'none'} webpackEnv
 */
const commonConfig = (webpackEnv) => {
	const isEnvDevelopment = webpackEnv === "development";
	const isEnvProduction = webpackEnv === "production";

	return {
		mode: isEnvProduction ? "production" : isEnvDevelopment && "development",
		bail: isEnvProduction,
		devtool: isEnvProduction
			? "source-map"
			: isEnvDevelopment && "eval-cheap-module-source-map",
		resolve: {
			fallback: {
				buffer: require.resolve("buffer"),
				path: require.resolve("path-browserify"),
				url: require.resolve("url"),
			},
			extensions: [".ts", ".tsx", ".js"],
		},
		module: {
			rules: [
				{
					oneOf: [
						{
							test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
							loader: require.resolve("url-loader"),
						},
						{
							test: /\.svg$/,
							use: [
								require.resolve("@svgr/webpack"),
								require.resolve("url-loader"),
							],
						},
						{
							test: /\.tsx?$/,
							exclude: /node_modules/,
							loader: require.resolve("ts-loader"),
						},
						{
							test: /\.css$/,
							use: [
								MiniCssExtractPlugin.loader,
								{
									loader: require.resolve("css-loader"),
									options: {
										importLoaders: 1,
										sourceMap: isEnvProduction || isEnvDevelopment,
									},
								},
							],
							sideEffects: true,
						},
						{
							test: /\.(woff|woff2|eot|ttf|otf)$/i,
							type: 'asset/resource'
						},
						{
							test: /\.m?js/,
							resolve: {
								fullySpecified: false
							}
						},
						{
							loader: require.resolve("file-loader"),
							exclude: [/\.(js|mjs|jsx|ts|tsx|cjs)$/, /\.html$/, /\.json$/],
						}
					],
				},
			],
		},
		// optimization: {
		// 	minimize: true,
		// 	minimizer: [
		// 		new TerserPlugin({
		// 			terserOptions: {
		// 				format: {
		// 					comments: false,
		// 				},
		// 			},
		// 			extractComments: false,
		// 		}),
		// 	],
		// },
		plugins: [
			new MiniCssExtractPlugin({
				filename: "ignore.css",
			}),
		],
	};
};


/**
 * @param {'development' | 'production' | 'none'} webpackEnv
 */
const extensionConfig = (webpackEnv) => {
	return {
		...commonConfig(webpackEnv),
		target: "node",
		entry: "./src/extension.ts",
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: "extension.js",
			libraryTarget: "commonjs2",
		},
		externals: { vscode: "commonjs vscode" },
	};
};

/**
 * @param {'development' | 'production' | 'none'} webpackEnv
 */
function fetchClientUIConfig(webpackEnv) {
	const base = commonConfig(webpackEnv);
	return {
		...base,
		target: "web",
		entry: "./src/fetch-client-ui/index.tsx",
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: "fetch-client-ui.js",
			publicPath: "auto",
		},
		optimization: {
			splitChunks: false,
			runtimeChunk: false,
		},
		resolve: {
			...base.resolve,
			// conditionNames: ['import', 'module', 'browser', 'default'],
			// mainFields: ['module', 'main'],
			alias: {
				// crypto: require.resolve("crypto-browserify"),
				'isomorphic-fetch': require.resolve('./empty-module.js'),
				// inherits: require.resolve('inherits/inherits_browser.js'),
			},
			fallback: {
				...base.resolve.fallback,
				querystring: require.resolve("querystring-es3"),
				stream: require.resolve("stream-browserify"),
				os: require.resolve("os-browserify/browser"),
				tty: require.resolve("tty-browserify"),
				util: require.resolve("util"),
				buffer: require.resolve("buffer"),
				vm: false,
				fs: false,
				net: false,
				tls: false,
				http: false,
				https: false,
				zlib: false,
				crypto: false,
				assert: require.resolve("assert"),
			}
		},
		plugins: [
			...base.plugins,
			new MiniCssExtractPlugin(),
			new webpack.ProvidePlugin({
				Buffer: ["buffer", "Buffer"],
				process: "process/browser",
			}),
		],
	};
}

module.exports = [extensionConfig, fetchClientUIConfig];