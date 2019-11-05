const fs = require('fs-extra');
const path = require('path');
const YAML = require('yaml');

const log = new (require('lognext'))('FileLoader');

class FileLoader {
	constructor() {
		this.filters = {
			ALL: ['(.+)$', (f) => fs.readFileSync(f, 'utf-8')],
			JSON: ['(json)$', require],
			DOT: ['(dot)$', (f) => fs.readFileSync(f, 'utf-8')],
			MARKDOWN: ['(md)$', (f) => fs.readFileSync(f, 'utf-8')],
			STYLES: ['(css|less)$', (f) => fs.readFileSync(f, 'utf-8')],
			YAML: ['(yml|yaml)$', (f) => YAML.parse(fs.readFileSync(f, 'utf-8'))]
		};
	}

	chooseFilters(filterNames) {
		const filters = [];

		filterNames.forEach((name) => {
			switch (name.toLowerCase()) {
				case 'json':
					filters.push(this.filters.JSON);
					break;
				case 'dot':
					filters.push(this.filters.DOT);
					break;
				case 'markdown':
					filters.push(this.filters.MARKDOWN);
					break;
				case 'styles':
					filters.push(this.filters.STYLES);
					break;
				case 'yaml':
					filters.push(this.filters.YAML);
					break;
				default:
					log.warn(`Unknown filter: ${name}`);
					filters.push([`(${name})$]`, (f) => fs.readFileSync(f, 'utf-8')]);
					break;
			}
		});

		return filters;
	}

	loadFiles(dir, target, filters, recursive = false, stripFilename = false) {
		if (!fs.existsSync(dir)) return;

		const files = fs.readdirSync(dir);

		// Load files in dir
		files.forEach((file) => {
			const fullPath = path.join(dir, file);
			if (fs.lstatSync(fullPath).isDirectory()) {
				if (recursive) {
					if (!target[file]) target[file] = {};
					this.loadFiles(fullPath, target[file], filters, recursive, stripFilename);
				}
				return;
			}

			// Apply filter
			filters.some((filter) => {
				// .exec() returns null if no match
				if (new RegExp(filter[0]).exec(file)) {
					// Loads the file by invoking the second parameter with the full path of the file
					const fileName = stripFilename ? file.substring(0, file.length - path.extname(file).length) : file;
					target[fileName] = filter[1](fullPath);
					return true;
				}
			});
		});
	}

	testFilters(filters, fileName) {
		let filterMatch;
		filters.some((filter) => {
			// .exec() returns null if no match
			if (new RegExp(filter[0]).exec(fileName)) {
				filterMatch = filter;
				return true;
			}
		});
		return filterMatch;
	}

	getDirNames(dir) {
		return this.getContentNames(dir).dirs;
	}

	getContentNames(dir, fileFilters) {
		const dirContents = fs.readdirSync(dir);
		const dirs = [];
		const files = [];

		dirContents.forEach((file) => {
			const fullPath = path.join(dir, file);
			if (fs.lstatSync(fullPath).isDirectory()) {
				dirs.push(file);
			} else {
				if (!fileFilters || this.testFilters(fileFilters, file)) files.push(file);
			}
		});
		return {
			dirs: dirs,
			files: files
		};
	}
}

module.exports = new FileLoader();
