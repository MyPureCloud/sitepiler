const _ = require('lodash');
const clone = require('clone');
const ConfigHelper = require('./configHelper');
const dot = require('dot');
const log = new (require('lognext'))('Sitepiler');
const fm = require('front-matter');
const fs = require('fs-extra');
const MarkdownIt = require('markdown-it');
const path = require('path');
const Q = require('q');
const YAML = require('yaml').default;


const md = new MarkdownIt({
	html: true
});
// Disable Indented code - this setting breaks rendering formatted/intented HTML if it has blank lines in it 
md.disable(['code']); 

const FILTER_JSON = ['(json)$', require];
const FILTER_DOT = ['(dot)$',(f)=>fs.readFileSync(f,'utf-8')];
const FILTER_MARKDOWN = ['(md)$',(f)=>fs.readFileSync(f,'utf-8')];
const FILTER_YAML = ['(yml|yaml)$', (f)=>YAML.parse(fs.readFileSync(f,'utf-8'))];
const DEFAULT_FILTERS = [
	FILTER_JSON,
	FILTER_DOT,
	FILTER_MARKDOWN,
	FILTER_YAML
];

dot.templateSettings.varname = 'context';
dot.templateSettings.strip = false;



class Sitepiler {
	constructor(config) {
		log.setLogLevel(global.logLevel);
		this.config = config;
		this.templateSource = {
			layouts: {},
			partials: {}
		};
		this.contentSource = {};
		this.context = {
			config: this.config,
			data: {},
			templates: {
				layouts: {},
				partials: {}
			},
			content: {}
		};
	}

	gatherData() {
		const deferred = Q.defer();

		try {
			log.debug('gatherData()');

			// Load data files
			const tempData = {};
			this.config.stageSettings.data.dataDirs.forEach((dataDir) => {
				loadFlles(dataDir, tempData, [ FILTER_JSON, FILTER_YAML ]);
			});

			// Copy data to context, strip extension from filename key
			_.forOwn(tempData, (value, key) => {
				this.context.data[key.substring(0, key.length - path.extname(key).length)] = value;
			});

			log.debug('Loaded data: ', this.context.data);

			// Complete stage
			deferred.resolve();
		} catch(err) {
			deferred.reject(err);
		}

		return deferred.promise;
	}

	compile() {
		const deferred = Q.defer();

		try {
			log.debug('compile()');
			let compileStartMs = Date.now();

			// TODO: separate the template loading/compiling so that this module can be used without running a full compile
			// Load templates
			let startMs = Date.now();
			this.config.stageSettings.compile.templateDirs.layouts.forEach((dataDir) => {
				loadFlles(dataDir, this.templateSource.layouts, [ FILTER_DOT ], true);
			});
			this.config.stageSettings.compile.templateDirs.partials.forEach((dataDir) => {
				loadFlles(dataDir, this.templateSource.partials, [ FILTER_DOT ], true);
			});
			log.verbose(`Templates loaded in ${Date.now() - startMs}ms`);

			// Load content
			startMs = Date.now();
			this.config.stageSettings.compile.contentDirs.forEach((dataDir) => {
				loadFlles(dataDir, this.contentSource, [ FILTER_MARKDOWN ], true);
			});
			log.verbose(`Content loaded in ${Date.now() - startMs}ms`);

			// Compile templates so they can be used
			startMs = Date.now();
			compileTemplates(this.templateSource.layouts, this.context.templates.layouts, this.context);
			compileTemplates(this.templateSource.partials, this.context.templates.partials, this.context);
			log.verbose(`Templates compiled in ${Date.now() - startMs}ms`);

			// Build content pages using templates
			startMs = Date.now();
			buildContent(this.contentSource, this.context.content, this.context, this.context.templates.layouts);
			log.verbose(`Built ${contentCount} content files in ${Date.now() - startMs}ms`);

			// Write content pages to disk
			startMs = Date.now();
			writeContent(this.context.content, this.config.stageSettings.compile.outputDir);
			log.verbose(`Content written in ${Date.now() - startMs}ms`);

			// Complete stage
			log.verbose(`Compile stage completed in ${Date.now() - compileStartMs}ms`);
			deferred.resolve();
		} catch(err) {
			deferred.reject(err);
		}

		return deferred.promise;
	}

	publish() {
		const deferred = Q.defer();

		try {
			log.debug('publish()');

			// TODO

			deferred.resolve();
		} catch(err) {
			deferred.reject(err);
		}

		return deferred.promise;
	}

	render(content) {
		return renderContent(content, prepareContext(this.context), this.context.templates.layouts);
	}

	prepareOutputFileName(inputFileName) {
		return prepareOutputFileNameImpl(inputFileName);
	}
}



module.exports = Sitepiler;



function writeContent(content, dest) {
	_.forOwn(content, (value, key) => {
		if (typeof(value) === 'object') {
			writeContent(value, path.join(dest, key));
			return;
		}

		log.debug('Writing file to', path.join(dest, key));
		fs.ensureDirSync(dest);
		fs.writeFileSync(path.join(dest, key), value, 'utf-8');
	});
}

let contentCount = 0;
function buildContent(source, dest, originalContext, templates, destPath = '') {
	const context = prepareContext(originalContext);

	_.forOwn(source, (value, key) => {
		if (typeof(value) === 'object') {
			if (!dest[key]) dest[key] = {};
			buildContent(value, dest[key], originalContext, templates, path.join(destPath, key));
		} else {
			const fileName = prepareOutputFileNameImpl(key);
			dest[fileName] = renderContent(value, context, templates, path.join(destPath, key));
			contentCount++;
		}
	});
}

function prepareOutputFileNameImpl(inputFileName) {
	let outputFileName = inputFileName.substring(0, inputFileName.length - 3);
	if (!outputFileName.includes('.')) outputFileName += '.html';
	return outputFileName;
}

function prepareContext(originalContext) {
	// Deep copy context
	const context = clone(originalContext);

	// Add context-sensitive helpers
	// These cannot be lambda functions and must be explicitly bound to the context object
	context.include = function(partial) {
		// return this.templates.partials[partial](this);
		const parts = partial.split('/');
		let target = this.templates.partials;
		parts.forEach((part) => target = target[part]);
		const r = target(this);
		return r;
	};
	context.include.bind(context);

	return context;
}

function renderContent(content, context, templates, pageLocation = 'no file') {
	log.debug(`Bulding page (${pageLocation})`);
	const startMs = Date.now();

	// Extract frontmatter
	const fmData = fm(content);
	context.pageSettings = fmData.attributes;

	// Validate page settings
	ConfigHelper.setDefault(context, 'pageSettings', {});
	ConfigHelper.setDefault(context.pageSettings, 'layout', 'default');
	ConfigHelper.setDefault(context.pageSettings, 'title', 'Default Page Title');

	// Compile page and execute page template
	const markdownContent = dot.template(fmData.body, undefined, context)(context);

	// Compile markdown
	const parsedContent = md.render(markdownContent);
	context.content = parsedContent;

	// HACK: overriding any setting to use default
	log.warn('FORCING DEFAULT LAYOUT');
	context.pageSettings.layout = 'default';

	// Execute layout template
	const output = templates[context.pageSettings.layout](context);

	// Log completion
	const duration = Date.now() - startMs;
	if (duration > 1000)
		log.warn(`Page build time of ${duration} exceeded 1000ms: ${pageLocation}`);
	else
		log.debug(`Page build completed in ${duration}ms`);
	return output;
}

function compileTemplates(source, dest, originalContext) {
	// Deep copy context
	const context = clone(originalContext);

	_.forOwn(source, (value, key) => {
		if (typeof(value) === 'object') {
			if (!dest[key]) dest[key] = {};
			compileTemplates(value, dest[key], originalContext);
		} else {
			log.debug(`Compiling template ${key}`);
			dest[key.substring(0, key.length - 4)] = dot.template(value, undefined, context);
		}
	});
}

function loadFlles(dir, target, filters = DEFAULT_FILTERS, recursive = false) {
	const files = fs.readdirSync(dir);

	// Load files in dir
	files.forEach((file) => {
		const fullPath = path.join(dir, file);
		if (isDirectory(fullPath)) {
			if (recursive) {
				if (!target[file]) target[file] = {};
				loadFlles(fullPath, target[file], filters, recursive);
			}
			return;
		}

		// Apply filter
		filters.some((filter) => {
			// .exec() returns null if no match
			if ((new RegExp(filter[0])).exec(file)) {
				log.debug(`Loading file: ${fullPath}`);
				// Loads the file by invoking the second parameter with the full path of the file
				target[file] = filter[1](fullPath);
				return true;
			}
		});
	});
}

function isDirectory(source) {
	return fs.lstatSync(source).isDirectory();
}
