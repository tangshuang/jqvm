const path = require('path')

const bundle = {
  mode: 'none',
  entry: path.join(__dirname, 'src/index.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'jqvm.js',
    library: 'jqvm',
    libraryTarget: 'umd',
  },
  resolve: {
    alias: {
      'ts-fns$': 'ts-fns/es',
      'tyshemo$': 'tyshemo/src',
    },
  },
  externals: {
    jquery: {
      root: 'jQuery',
      commonjs: 'jquery',
      commonjs2: 'jquery',
      amd: 'jquery',
    },
  },
  optimization: {
    minimize: false,
    usedExports: true,
    sideEffects: true,
  },
  devServer: {
    contentBase: __dirname,
    port: 8099,
    liveReload: true,
    filename: 'dist/jqvm.min.js',
  },
}

const mini = {
  ...bundle,
  mode: 'production',
  output: {
    ...bundle.output,
    filename: 'jqvm.min.js',
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: true,
  },
  devtool: 'source-map',
}

module.exports = [bundle, mini]
