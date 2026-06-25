//@ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

class CopyCliPackageJsonPlugin {
    /** @param {any} compiler */
    apply(compiler) {
        compiler.hooks.afterEmit.tap('CopyCliPackageJsonPlugin', () => {
            const src = path.resolve(__dirname, 'src/fetch-client-cli/package.json');
            const dest = path.resolve(__dirname, 'cli/package.json');
            fs.copyFileSync(src, dest);
        });
    }
}

/** @param {'development' | 'production' | 'none'} webpackEnv */
module.exports = (webpackEnv = 'production') => ({
    mode: webpackEnv,
    bail: webpackEnv === 'production',
    devtool: webpackEnv === 'production'
        ? 'source-map'
        : 'eval-cheap-module-source-map',

    target: 'node',
    entry: './src/fetch-client-cli/index.ts',
    output: {
        path: path.resolve(__dirname, 'cli'),
        filename: 'cli.js',
        libraryTarget: 'commonjs2',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            vscode: path.resolve(
                __dirname,
                'src/fetch-client-cli/stubs/vscode.ts'
            ),
            [path.resolve(__dirname, 'src/extension.ts')]:
                path.resolve(
                    __dirname,
                    'src/fetch-client-cli/stubs/extension.ts'
                ),
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: require.resolve('ts-loader'),
            },
            {
                test: /\.m?js/,
                resolve: { fullySpecified: false },
            },
        ],
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: '#!/usr/bin/env node',
            raw: true,
        }),
        new CopyCliPackageJsonPlugin(),
    ],
    externals: {},
});