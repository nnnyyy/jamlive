/**
 * Created by nnnyyy on 2018-10-12.
 */
const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

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
        presets: [[
            'env', {
                targets: {
                    browsers: ['last 2 versions']
                }
            }
        ]]
    }
};

const rulesVueLoader = {
    test: /\.vue$/,
    loader: 'vue-loader'
};

module.exports = {
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
        new VueLoaderPlugin()
    ]
};