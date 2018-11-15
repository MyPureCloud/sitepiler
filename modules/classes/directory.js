const _ = require('lodash');
const path = require('path');

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
				let pageAdded = _.some(this.dirs, (dir) => {
					if (page.path.startsWith(dir.path)) {
						return dir.addPage(page);
					}
				});

				if (!pageAdded) {
					let nextDirName = page.path.substr(this.path.length).split('/')[0];
					let nextDir = path.join(page.path.substr(0, this.path.length), nextDirName);
					this.dirs[nextDirName] = Directory.fromPath(nextDir);
					return this.dirs[nextDirName].addPage(page);
				}

				return pageAdded;
			}
		} else {
			// Not in this path!
			return false;
		}
	}

	analyze(recursive = true) {
		// Find index page and get title
		_.forOwn(this.pages, (page) => {
			if (page.filename.startsWith('index.')) {
				this.title = page.title;
				this.indexPage = page;
			}

			// Analyze page
			page.analyze();
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

		// Add slashes
		if (!directory.path.startsWith('/')) 
			directory.path = '/' + directory.path;
		if (!directory.path.endsWith('/')) 
			directory.path = directory.path + '/';

		return directory;
	}
}



module.exports = Directory;
