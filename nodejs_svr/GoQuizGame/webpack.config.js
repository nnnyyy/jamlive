/**
 * Created by nnnyyy on 2018-10-12.
 */
const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const webpack = require('webpack')

const rulesCssLoader = {
    test: /\.css$/,
    use: [
        'style-loader',
        'css-loader'
    ]
};

const rulesBabelLoader = {
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'babel-loader',
    options: {
        presets: [
            ["@babel/preset-env", {"targets": {"browsers": ["last 2 versions"] }}]
        ]
    }
};

const rulesVueLoader = {
    test: /\.vue$/,
    loader: 'vue-loader'
};

module.exports = {
    mode: 'production',
    resolve: {
        alias: {
            vue: 'vue/dist/vue.min.js'
        }
    },
    entry: {
        'entry': './src/entry.js'
    },
    output: {
        filename: 'bundle.js'
    },
    module: {
        rules: [
            rulesCssLoader,
            rulesVueLoader,
            rulesBabelLoader
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ]
};