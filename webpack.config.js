const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = (_, argv) => {
    const isProd = argv.mode === 'production';

    return {
        entry: './src/index.ts',
        mode: argv.mode,

        devtool: isProd ? false : 'eval-source-map',

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
            path: path.resolve(__dirname, 'dist'),
            filename: 'bundle.js',
            chunkFilename: 'chunks/[name].[contenthash].js',
            clean: true,
        },

        optimization: isProd ? {} : { minimize: false },

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
                    { from: 'shared/config/ui/config-overlay.html', to: 'config-overlay.html' },
                ],
            }),
        ],
    };
};
