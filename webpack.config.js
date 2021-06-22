const path = require('path');
const pkg = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const buildPath = './docs/';

module.exports = {
  entry: ['./src/entry.js'],
  output: {
    path: path.join(__dirname, buildPath),
    filename: '[name].[hash].js'
  },
  mode: 'development',
  target: 'web',
  devtool: 'source-map',
  devServer: {
    host: '0.0.0.0',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: path.resolve(__dirname, './node_modules/')
      },{
        test: /\.(jpe?g|png|gif|svg|tga|glb|babylon|mtl|pcb|pcd|prwm|obj|mat|mp3|ogg)$/i,
        use: 'file-loader',
        exclude: path.resolve(__dirname, './node_modules/')
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      'title': 'M A C H I N E | B O N E S',
      template: 'index.html',
    })
  ]
}
