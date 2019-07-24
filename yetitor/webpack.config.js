const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.resolve(__dirname, 'webpack-resources/entry.js'),
	output: {
		filename: 'renderer.js',
		path: path.resolve(__dirname, 'src/scripts/webpack'),
		library: 'RendererLib'
	},
	resolve: {
		alias: {
			'fs-extra': path.resolve(__dirname, 'webpack-resources/fs-extra.js'),
			lognext: path.resolve(__dirname, 'webpack-resources/lognext.js'),
			page: path.resolve(__dirname, '../modules/classes/page-nofs.js'),
			path: 'path-webpack'
		}
	},
	node: {
		fs: 'empty'
	}
};
