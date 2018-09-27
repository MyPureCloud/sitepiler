const _ = require('lodash');
const chokidar = require('chokidar');
const clone = require('clone');
const ConfigHelper = require('./configHelper');
const dot = require('dot');
const less = require('less');
const livereload = require('livereload');
const lognext = require('lognext');
const fm = require('front-matter');
const fs = require('fs-extra');
const MarkdownIt = require('markdown-it');
const path = require('path');
const Q = require('q');
const YAML = require('yaml').default;


const log = new lognext('Sitepiler');
const watcherlog = new lognext('watcher');
const md = new MarkdownIt({
	html: true,
	linkify: true,
	xhtmlOut: true
});
// Disable Indented code - this setting breaks rendering formatted/intented HTML if it has blank lines in it 
md.disable(['code']); 

const FILTER_JSON = ['(json)$', require];
const FILTER_DOT = ['(dot)$', (f)=>fs.readFileSync(f,'utf-8')];
const FILTER_MARKDOWN = ['(md)$', (f)=>fs.readFileSync(f,'utf-8')];
const FILTER_STYLES = ['(css|less)$', (f)=>fs.readFileSync(f,'utf-8')];
const FILTER_YAML = ['(yml|yaml)$', (f)=>YAML.parse(fs.readFileSync(f,'utf-8'))];
const DEFAULT_FILTERS = [
	FILTER_JSON,
	FILTER_DOT,
	FILTER_MARKDOWN,
	FILTER_YAML
];

dot.templateSettings.varname = 'context';
dot.templateSettings.strip = false;
/* 
 * Original regexes: https://github.com/olado/doT/blob/master/doT.js
 * Requires node 9.11.2 or higher for lookbehind assertions
 * Added (?<!`) to escape templating that is used at the beginning of an inline code block
 * Does not escape if {{ not immediately preceded by a backtick
 */
dot.templateSettings.evaluate =     /(?<!`)\{\{([\s\S]+?(\}?)+)\}\}/g;
dot.templateSettings.interpolate =  /(?<!`)\{\{=([\s\S]+?)\}\}/g;
dot.templateSettings.encode =       /(?<!`)\{\{!([\s\S]+?)\}\}/g;
dot.templateSettings.use =          /(?<!`)\{\{#([\s\S]+?)\}\}/g;
dot.templateSettings.define =       /(?<!`)\{\{##\s*([\w.$]+)\s*(:|=)([\s\S]+?)#\}\}/g;
dot.templateSettings.conditional =  /(?<!`)\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g;
dot.templateSettings.iterate =      /(?<!`)\{\{~\s*(?:\}\}|([\s\S]+?)\s*:\s*([\w$]+)\s*(?::\s*([\w$]+))?\s*\}\})/g;



class Sitepiler {
	constructor(config) {
		log.setLogLevel(global.logLevel);

		// Sitepiler configuration
		this.config = config;

		this.initCompileProps();

		// Livereload
		if (this.config.cliopts.livereload && this.config.cliopts.local) {
			this.livereloadServer = livereload.createServer({
				port: this.config.cliopts.livereloadPort	
			}, 
			() => log.debug(`Livereload accepting connections on port ${this.config.cliopts.livereloadPort}`));

			let watchPaths = [];
			watchPaths.push(path.resolve(this.config.settings.stages.compile.outputDirs.content));
			this.livereloadServer.watch(watchPaths);

			// Monitor sources to trigger individual page rebuilds
			watchPaths = [];
			this.config.settings.stages.compile.contentDirs.forEach((contentDir) => watchPaths.push(contentDir.source));
			this.sourceWatcher = chokidar.watch(watchPaths, {
				awaitWriteFinish: true,
				ignoreInitial: true
			});
			this.sourceWatcher.on('all', sourceWatcherEvent.bind(this));

			// Monitor templates and styles to trigger full rebuild
			watchPaths = [];
			this.config.settings.stages.compile.templateDirs.layouts.forEach((templateDir) => watchPaths.push(templateDir));
			this.config.settings.stages.compile.templateDirs.partials.forEach((templateDir) => watchPaths.push(templateDir));
			this.config.settings.stages.compile.styleDirs.forEach((styleDir) => watchPaths.push(styleDir));
			this.templateWatcher = chokidar.watch(watchPaths, {
				awaitWriteFinish: true,
				ignoreInitial: true
			});
			this.templateWatcher.on('all', templateWatcherEvent.bind(this));

		}
	}

	// These props should be cleared when a full recompile is triggered
	initCompileProps() {
		// Uncompiled templates
		this.templateSource = {
			layouts: {},
			partials: {}
		};

		// Uncompiled content
		this.contentSource = {};

		// Context for template execution
		this.context = {
			config: this.config,
			data: this.context ? this.context.data || {} : {},
			templates: {
				layouts: {},
				partials: {}
			},
			content: {},
			sitemap: {
				dirs: {},
				pages: []
			}
		};

		// Uncompiled CSS/LESS
		this.styleSource = {};
	}

	gatherData() {
		const deferred = Q.defer();

		try {
			log.writeBox('Stage: gather data');

			// Load data files
			const tempData = {};
			this.config.settings.stages.data.dataDirs.forEach((dataDir) => {
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
			log.writeBox('Stage: compile');
			let compileStartMs = Date.now();

			// Clear old data
			this.initCompileProps();

			// TODO: separate the template loading/compiling so that this module can be used without running a full compile
			// Load templates
			let startMs = Date.now();
			this.config.settings.stages.compile.templateDirs.layouts.forEach((dataDir) => {
				loadFlles(dataDir, this.templateSource.layouts, [ FILTER_DOT ], true);
			});
			this.config.settings.stages.compile.templateDirs.partials.forEach((dataDir) => {
				loadFlles(dataDir, this.templateSource.partials, [ FILTER_DOT ], true);
			});
			log.verbose(`Templates loaded in ${Date.now() - startMs}ms`);

			// Load content
			startMs = Date.now();
			this.config.settings.stages.compile.contentDirs.forEach((contentDir) => {
				let contentSourceTarget = this.contentSource;
				if (contentDir.dest !== '') {
					contentDir.dest.split('/').forEach((d) => {
						// if (d === '') return; 
						if (!contentSourceTarget[d]) contentSourceTarget[d] = {};
						contentSourceTarget = contentSourceTarget[d];
					});
				}
				loadFlles(contentDir.source, contentSourceTarget, [ FILTER_MARKDOWN ], true);
			});
			log.verbose(`Content loaded in ${Date.now() - startMs}ms`);

			// Process page sources
			// Converts raw source into parsed source (extracts frontmatter and body)
			processSources(this.contentSource, this.context.sitemap);
			log.debug(this.contentSource);
			printSitemap(this.context.sitemap);

			// Load styles
			startMs = Date.now();
			this.config.settings.stages.compile.styleDirs.forEach((styleDir) => {
				loadFlles(styleDir, this.styleSource, [ FILTER_STYLES ], true);
			});
			log.verbose(`Styles loaded in ${Date.now() - startMs}ms`);

			// Process styles
			processStyles(this.styleSource, this.config.settings.stages.compile.outputDirs.styles);

			// Compile templates so they can be used
			startMs = Date.now();
			compileTemplates(this.templateSource.layouts, this.context.templates.layouts, this.context);
			compileTemplates(this.templateSource.partials, this.context.templates.partials, this.context);
			log.verbose(`Templates compiled in ${Date.now() - startMs}ms`);

			// Build content pages using templates
			startMs = Date.now();
			buildContent(this.contentSource, this.context.content, this.context, this.context.templates.layouts);
			log.verbose(`Built ${contentCount} content files in ${Date.now() - startMs}ms`);
			// log.debug(this.context.content);

			// Write content pages to disk
			startMs = Date.now();
			log.debug(this.context.content);
			writeContent(this.context.content, this.config.settings.stages.compile.outputDirs.content);
			log.verbose(`Content written in ${Date.now() - startMs}ms`);

			// Complete stage
			log.verbose(`Compile stage completed in ${Date.now() - compileStartMs}ms`);

			// log.debug(this.context);
			deferred.resolve();
		} catch(err) {
			deferred.reject(err);
		}

		return deferred.promise;
	}

	publish() {
		const deferred = Q.defer();

		try {
			log.writeBox('Stage: publish');

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



function printSitemap(sitemap) {
	log.writeBox('Sitemap');
	printSitemapImpl(sitemap);
}
function printSitemapImpl(sitemap) {
	sitemap.pages.forEach((page) => log.debug(`${path.join(page.path, page.filename)} (${page.title})`));
	// sitemap.pages.forEach((page) => log.debug(`${path.join(prefix, page.filename)} (${page.title})`));
	_.forOwn(sitemap.dirs, (value, key) => printSitemapImpl(value));
}

function processSources(sources, sitemap, relativePath = '/') {
	_.forOwn(sources, (value, key) => {
		if (typeof(value) === 'object' && !PageData.isPageData(value)) {
			sitemap.dirs[key] = { dirs: {}, pages: [] };
			processSources(value, sitemap.dirs[key], path.join(relativePath, key));
		} else {
			// Replace content with PageData
			const pageData = processSource(value, key, relativePath);
			sources[key] = pageData;

			// Add to sitemap
			sitemap.pages.push({ 
				title: pageData.pageSettings.title,
				path: pageData.pageSettings.path,
				filename: pageData.pageSettings.fileName 
			});
		}
	});
}

function processSource(content, fileName, relativePath) {
	const pd = new PageData();

	// Extract frontmatter
	const fmData = fm(content);
	pd.pageSettings = fmData.attributes;
	pd.body = fmData.body;

	// Validate page settings
	ConfigHelper.setDefault(pd, 'pageSettings', {});
	ConfigHelper.setDefault(pd.pageSettings, 'layout', 'default');
	ConfigHelper.setDefault(pd.pageSettings, 'title', 'Default Page Title');

	// Add computed page settings
	pd.pageSettings.fileName = prepareOutputFileNameImpl(fileName);
	pd.pageSettings.path = relativePath;

	return pd;
}

function processStyles(styleSource, outputDir) {
	/*
	 * TODO: not sure if reading every file is the best way to process LESS.
	 * There is some indication that the LESS render function can resolve 
	 * external files automatically. Need to determine best approach.
	 * http://lesscss.org/usage/#programmatic-usage
	 */

	_.forOwn(styleSource, (value, key) => {
		if (typeof(value) === 'object') {
			processStyles(value, path.join(outputDir, key));
			return;
		}

		if (key.toLowerCase().endsWith('less')) {
			log.verbose(`Rendering LESS file ${key}`);
			less.render(value)
				.then((output) => {
					const outPath = path.join(outputDir, key.replace('.less', '.css'));
					log.debug('Writing less file to', outPath);
					fs.ensureDirSync(outputDir);
					fs.writeFileSync(outPath, output.css, 'utf-8');
				})
				.catch((err) => log.error(err));
		} else {
			log.debug('Writing file to ', path.join(outputDir, key));
			fs.ensureDirSync(outputDir);
			fs.writeFileSync(path.join(outputDir, key), value, 'utf-8');
		}

	});
}

// Expects to have context bound to a sitepiler instance
function templateWatcherEvent(evt, filePath) {
	watcherlog.verbose(`(template) ${evt} >> ${filePath}`);

	// Skip if disabled
	if (this.config.settings.templateChangeRebuildQuietSeconds < 0) return;

	// Clear pending timer
	if (this.templateWatcherRebuiltTimeout) clearTimeout(this.templateWatcherRebuiltTimeout);

	// Set new timer
	watcherlog.info(`Triggering recompile in ${this.config.settings.templateChangeRebuildQuietSeconds} seconds...`);
	this.templateWatcherRebuiltTimeout = setTimeout(this.compile.bind(this), this.config.settings.templateChangeRebuildQuietSeconds * 1000);
}

// Expects to have context bound to a sitepiler instance
function sourceWatcherEvent(evt, filePath) {
	watcherlog.verbose(`(source) ${evt} >> ${filePath}`);

	// Find content dir
	let contentDir;
	this.config.settings.stages.compile.contentDirs.some((c) => {
		if (filePath.startsWith(c.source)) {
			contentDir = c;
			return true;
		}
	});
	if (!contentDir)
		return watcherlog.error(`Failed to find content dir for source ${filePath}`);

	// let relativePath = filePath.substring(contentDir.length, filePath.length - path.basename(filePath).length);
	// log.debug(contentDir);
	// log.debug('contentDir.length='+ contentDir.length);
	// log.debug('relativePath='+ relativePath);

	// Generate content
	let content = fs.readFileSync(filePath, 'utf-8');
	// content = this.render(content);
	content = processSource(content, path.basename(filePath), contentDir.dest);
	log.debug(content);
	content = renderContent(content, prepareContext(this.context), this.context.templates.layouts);

	// Write to file
	const filename = prepareOutputFileNameImpl(path.basename(filePath));
	const destPath = path.join(this.config.settings.stages.compile.outputDirs.content, contentDir.dest);
	const contentObject = {};
	contentObject[filename] = content;
	writeContent(contentObject, destPath);
}

function writeContent(content, dest) {
	_.forOwn(content, (value, key) => {
		if (typeof(value) === 'object' && !PageData.isPageData(value)) {
			writeContent(value, path.join(dest, key));
			return;
		}

		log.debug('Writing file to', path.join(dest, key));
		fs.ensureDirSync(dest);
		fs.writeFileSync(path.join(dest, key), value.body, 'utf-8');
	});
}

let contentCount = 0;
function buildContent(sources, dest, originalContext, templates) {
	_.forOwn(sources, (value, key) => {
		if (typeof(value) === 'object' && !PageData.isPageData(value)) {
			if (!dest[key]) dest[key] = {};
			buildContent(value, dest[key], originalContext, templates);
		} else {
			dest[value.pageSettings.fileName] = renderContent(value, prepareContext(originalContext), templates);
			log.debug(dest[value.pageSettings.fileName]);
			contentCount++;
		}
	});
}

function prepareOutputFileNameImpl(inputFileName) {
	let outputFileName = inputFileName.substring(0, inputFileName.length - 3);
	if (!outputFileName.includes('.')) outputFileName += '.html';
	return outputFileName;
}

/**
 * This function performs a deep copy on the object and adds the helper functions to the copied
 * object. This prevents the page compilation process from leaking anything between page renders.
 */
function prepareContext(originalContext) {
	// Deep copy context
	const context = clone(originalContext);

	// Add context-sensitive helpers
	// These cannot be lambda functions and must be explicitly bound to the context object
	context.path = path;
	context._ = _;

	context.include = function(partial) {
		// return this.templates.partials[partial](this);
		const parts = partial.split('/');
		let target = this.templates.partials;
		parts.forEach((part) => target = target[part]);
		const r = target(this);
		return r;
	};
	context.include.bind(context);

	context.livereload = function() {
		if (!this.config.cliopts.livereload) return '';
		return `<script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':${this.config.cliopts.livereloadPort}/livereload.js?snipver=1"></' + 'script>');</script>`;
		// return `<script src="http://' + (location.host || 'localhost').split(':')[0] + ':${this.config.cliopts.livereloadPort}/livereload.js?snipver=1"></script>`;
	};
	context.livereload.bind(context);

	return context;
}

function renderContent(pageData, context, templates) {
	const fullPath = path.join(pageData.pageSettings.path, pageData.pageSettings.fileName);
	log.debug(`Bulding page (${fullPath})`);
	log.debug(pageData);
	const startMs = Date.now();

	// Compile page and execute page template
	context.pageSettings = pageData.pageSettings;
	const markdownContent = dot.template(pageData.body, undefined, context)(context);

	// Compile markdown
	const parsedContent = md.render(markdownContent);
	context.content = parsedContent;

	// Execute layout template
	const output = templates[context.pageSettings.layout](context);

	// Log completion
	const duration = Date.now() - startMs;
	if (duration > 1000)
		log.warn(`Page build time of ${duration} exceeded 1000ms: ${fullPath}`);
	else
		log.debug(`Page build completed in ${duration}ms`);

	//TODO: write file here instead of building output content object
	// return new PageData(context.pageSettings, output);
	pageData.body = output;
	return pageData;
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






class PageData {
	// constructor(pageSettings, body) {
	// 	this.pageSettings = pageSettings;
	// 	this.body = body;
	// }
	constructor() {
		this.pageSettings = {};
		this.body = '';
	}

	static isPageData(d) { return d instanceof PageData; }
}



