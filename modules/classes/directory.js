const _ = require('lodash');

const log = new (require('lognext'))('Directory');



class Directory {
	constructor() {
		this.dirs = {};
		this.pages = {};
	}

	addPage(page) {
		if (page.path.startsWith(this.path)) {
			// goes in this dir or call addPage() on subdir?
			if (page.path === this.path) {
				this.pages[page.filename] = page;
				return true;
			} else {
				// Try adding to subdir
				return _.some(this.dirs, (dir) => {
					if (page.path.startsWith(dir.path)) {
						return dir.addPage(page);
					}
				});
			}
		} else {
			// Not in this path!
			return false;
		}
	}

	analyze(recursive = true) {
		// Find index page and get title
		_.some(this.pages, (page) => {
			if (page.filename.startsWith('index.')) {
				this.title = page.title;
				return true;
			}
		});

		// Default title
		if (!this.title) this.title = 'No Title';

		// Recurse
		if (recursive)
			_.forOwn(this.dirs, (dir) => dir.analyze(recursive));
	}

	renderPages(context, recursive = true) {
		// Render pages
		_.forOwn(this.pages, (page) => page.render(context));

		// Recurse dirs
		if (recursive) 
			_.forOwn(this.dirs, (dir) => dir.renderPages(context, recursive));
	}

	static fromPath(webPath) {
		const directory = new Directory();

		directory.path = webPath;

		// Add trailing slash
		if (!directory.path.endsWith('/')) 
			directory.path = directory.path + '/';

		return directory;
	}
}



module.exports = Directory;
