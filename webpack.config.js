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
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          presets: [
            '@babel/preset-env',
          ],
          plugins: [
            '@babel/plugin-proposal-object-rest-spread',
            '@babel/plugin-transform-spread',
            '@babel/plugin-transform-parameters',
          ],
        },
      }
    ],
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
