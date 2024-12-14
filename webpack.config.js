const webpack = require('webpack')

module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            __BUILD_DATE__: JSON.stringify(new Date().toISOString())
        })
    ]
} 