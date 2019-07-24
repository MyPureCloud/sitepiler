const _ = require('lodash');
const fm = require('front-matter');
const path = require('path');

const ConfigHelper = require('./../configHelper');
const renderer = require('./../renderer');


class Page {
	constructor() {

	}

	render(context) {
		return renderer.renderContent(this, context);
	}

	getBody() {
		return this.body;
	}

	static load(content, sourcePath, destPath, webPath) {
		const page = new Page();

		// Extract frontmatter
		const fmData = fm(content);
		_.assign(page, fmData.attributes);
		page.frontmatterKeys = _.keys(fmData.attributes);

		// Set body (raw)
		page.body = fmData.body;

		// Add computed page settings
		page.filename = renderer.stripExtension(path.basename(sourcePath), '.md');
		page.path = webPath;
		if (!page.path.startsWith('/')) page.path = '/' + page.path;
		page.link = path.join(page.path, page.filename);

		page.sourcePath = sourcePath;
		page.destDir = destPath.substr(0, destPath.length - path.basename(destPath).length);
		page.destPath = path.join(page.destDir, page.filename);

		// Set default layout
		ConfigHelper.setDefault(page, 'layout', 'default');

		// Set default title
		const firstLine = fmData.body ? fmData.body.split('\n')[0] : '';
		if (firstLine.trim().startsWith('#')) {
			ConfigHelper.setDefault(page, 'title', firstLine.trim().replace(/(^#*\s*)/i, ''));
			page.hideTitle = true;
		} else {
			ConfigHelper.setDefault(page, 'title', titleize(page.filename.replace(/\.html$/i, '')));
		}

		return page;
	}
}


module.exports = Page;



function titleize(title) {
	const noCapWords = [ 'and', 'or', 'to', 'a', 'an' ];
	title = title.replace(/[-_.]/gi, ' ');
	const parts = title.split(' ');
	title = '';
	parts.forEach((part) => {
		if (noCapWords.indexOf(part.toLowerCase()) >= 0) {
			title += part;
		} else {
			title += part.substring(0, 1).toUpperCase();
			if (part.length > 1)
				title += part.substr(1);
		}
		title += ' ';
	});
	return title;
}
