const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = {
    entry: './src/index.ts',
    mode: 'production',
    // mode: 'development',
    // devtool: 'eval',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        filename: 'bundle.js',
        chunkFilename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist')
    },
    plugins: [
        new webpack.DefinePlugin({
            APP_VERSION: JSON.stringify(packageJson.version),
            APP_NAME: JSON.stringify(packageJson.description),
        }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            version: packageJson.version,
            name: packageJson.description,
            inject: false,
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/favicon.ico', to: 'favicon.ico' },
                { from: 'src/index.css', to: 'index.css' },
            ],
        }),
    ],
}