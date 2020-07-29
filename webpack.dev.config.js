const [bundle, min] = require('./webpack.config.js')
module.exports = {
  ...min,
  devServer: {
    contentBase: __dirname,
    port: 8099,
    liveReload: true,
    writeToDisk: true,
  },
}
