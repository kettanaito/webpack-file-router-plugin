const path = require('path')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const HtmlPlugin = require('html-webpack-plugin')
const { FileRouterPlugin } = require('../lib')

const compiler = webpack({
  context: __dirname,
  mode: 'development',
  entry: path.join(__dirname, 'entry.js'),
  output: {
    filename: 'output.js',
    path: __dirname,
  },
  plugins: [
    new HtmlPlugin(),
    new FileRouterPlugin({
      rootDir: path.resolve(__dirname, './virtual-issue'),
    }),
  ],
})
const server = new WebpackDevServer(compiler, {
  noInfo: false,
  hot: true,
  contentBase: [path.resolve(__dirname, 'virtual-issue')],
  watchContentBase: true,
})

server.listen(9004, '127.0.0.1', () => {
  console.log('\nhttp://127.0.0.1:9004\n')
})
