const _ = require('lodash');
const fm = require('front-matter');
const path = require('path');

const ConfigHelper = require('./../configHelper');
const renderer = require('./../renderer');

const log = new (require('lognext'))('Page');



class Page {
	constructor() {

	}

	render(context) {
		// Mutate self
		this.body = renderer.renderContent(this, context);

		this.analyze();

		return this;
	}

	analyze() {
		
	}

	static create(content, webPath) {
		const page = new Page();

		// Parse path
		page.source = content;

		// Extract frontmatter
		const fmData = fm(content);
		_.assign(page, fmData.attributes);
		page.bodyRaw = fmData.body;

		// Add computed page settings
		page.filename = renderer.stripExtension(path.basename(webPath), '.md');
		page.path = webPath.substr(0, webPath.length - path.basename(webPath).length);
		if (!page.path.startsWith('/')) page.path = '/' + page.path;
		page.link = path.join(page.path, page.filename);

		// Validate page settings
		ConfigHelper.setDefault(page, 'layout', 'default');
		ConfigHelper.setDefault(page, 'title', 'Default Page Title');

		return page;
	}
}


module.exports = Page;
