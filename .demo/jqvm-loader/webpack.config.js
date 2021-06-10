module.exports = {
  mode: 'none',
  target: 'web',
  entry: __dirname + '/index.js',
  output: {
    path: __dirname,
    filename: 'dist.js',
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        loader: __dirname + '/../../loader.js',
        options: {
          // $: 'jQuery',
        }
      },
    ],
  },
  externals: {
    jquery: 'jQuery',
    jqvm: true,
  }
}
