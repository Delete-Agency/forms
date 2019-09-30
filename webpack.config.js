const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
    return {
        mode: "production",
        entry: {
            "forms": "./index.js",
        },
        output: {
            path: __dirname + '/build',
            filename: "[name].min.js",
            libraryTarget: 'window'
        },
        resolve: {
            extensions: ['.js'],
            modules: ['node_modules']
        },
        devtool: "source-map",
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: ['@babel/preset-env'],
                            plugins: [
                                '@babel/plugin-transform-object-assign',
                                '@babel/plugin-proposal-class-properties',
                                '@babel/plugin-proposal-object-rest-spread'
                            ]
                        }
                    }
                }
            ]
        },
        plugins: [
            new CleanWebpackPlugin(),
        ],
    }
};
