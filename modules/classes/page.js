const _ = require('lodash');
const fm = require('front-matter');
const fs = require('fs-extra');
const path = require('path');

const ConfigHelper = require('./../configHelper');
const renderer = require('./../renderer');

const log = new (require('lognext'))('Page');



class Page {
	constructor() {

	}

	render(context) {
		// Mutate self
		const output = renderer.renderContent(this, context);

		this.analyze();

		fs.ensureDirSync(this.destDir);
		fs.writeFileSync(this.destPath, output, 'utf-8');

		return this;
	}

	analyze() {
		
	}

	getBody() {
		// Read from disk
		const content = fs.readFileSync(this.sourcePath, 'utf-8');

		// Extract frontmatter, discard body
		const fmData = fm(content);
		return fmData.body;
	}

	static load(sourcePath, destPath, webPath) {
		log.verbose(`Loading page:\n  sourcePath: ${sourcePath}\n  webPath: ${webPath}`);
		const page = new Page();

		// Read from disk
		const content = fs.readFileSync(sourcePath, 'utf-8');

		// Extract frontmatter, discard body
		const fmData = fm(content);
		_.assign(page, fmData.attributes);

		// Add computed page settings
		page.filename = renderer.stripExtension(path.basename(sourcePath), '.md');
		page.path = webPath;
		if (!page.path.startsWith('/')) page.path = '/' + page.path;
		page.link = path.join(page.path, page.filename);

		page.sourcePath = sourcePath;
		page.destDir = destPath.substr(0, destPath.length - path.basename(destPath).length);
		page.destPath = path.join(page.destDir, page.filename);

		// Validate page settings
		ConfigHelper.setDefault(page, 'layout', 'default');
		ConfigHelper.setDefault(page, 'title', 'Default Page Title');

		return page;
	}
}


module.exports = Page;
