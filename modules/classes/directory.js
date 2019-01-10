const _ = require('lodash');
const path = require('path');

const log = new (require('lognext'))('Directory');



class Directory {
	constructor() {
		this.dirs = {};
		this.pages = {};
	}

	addPage(page) {
		if (page.path.startsWith(this.path) || page.path.startsWith(this.path.substr(0, this.path.length - 1))) {
			// goes in this dir or call addPage() on subdir?
			if (page.path === this.path || page.path === this.path.substr(0, this.path.length - 1)) {
				this.pages[page.filename] = page;
				return true;
			} else {
				// Try adding to subdir
				let pageAdded = _.some(this.dirs, (dir) => {
					if (page.path.startsWith(dir.path) || page.path.startsWith(dir.path.substr(dir.path.length - 1))) {
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

	getDir(dirPath) {
		if (dirPath.startsWith(this.path) || dirPath.startsWith(this.path.substr(0, this.path.length - 1))) {
			if (dirPath === this.path || dirPath === this.path.substr(0, this.path.length - 1)) {
				// Exact match
				return this;
			} else {
				// Partial match, recurse
				let target;
				_.keys(this.dirs).some((dir) => {
					target = this.dirs[dir].getDir(dirPath);
					if (target) return true;
				});
				return target;
			}
		} else {
			// Subdir not in this path
			return;
		}
	}

	getPage(link) {
		if (!link || !link.startsWith(this.path)) return;
		if (link.endsWith('/'))
			link += 'index.html';

		let targetPage;

		_.some(this.pages, (page) => {
			if (page.link.toLowerCase() === link.toLowerCase()) {
				targetPage = page;
				return true;
			}
		});

		if (targetPage) return targetPage;

		_.some(this.dirs, (dir) =>{
			targetPage  = dir.getPage(link);
			return targetPage !== undefined;
		});

		return targetPage;
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
