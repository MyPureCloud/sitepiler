const _ = require('lodash');
const chokidar = require('chokidar');
const less = require('less');
const livereload = require('livereload');
const lognext = require('lognext');
const fs = require('fs-extra');
const path = require('path');
const Q = require('q');
const YAML = require('yaml').default;

const ConfigHelper = require('./configHelper');
const ContextExtensions = require('./contextExtensions');
const PageData = require('./classes/pageData');
const renderer = require('./renderer');


const log = new lognext('Sitepiler');
const watcherlog = new lognext('watcher');

const FILTER_JSON = ['(json)$', require];
const FILTER_DOT = ['(dot)$', (f)=>fs.readFileSync(f,'utf-8')];
const FILTER_MARKDOWN = ['(md)$', (f)=>fs.readFileSync(f,'utf-8')];
const FILTER_STYLES = ['(css|less)$', (f)=>fs.readFileSync(f,'utf-8')];
const FILTER_YAML = ['(yml|yaml)$', (f)=>YAML.parse(fs.readFileSync(f,'utf-8'))];
const DEFAULT_FILTERS = [
	FILTER_JSON,
	FILTER_DOT,
	FILTER_MARKDOWN,
	FILTER_STYLES,
	FILTER_YAML
];


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
			renderer.compileTemplates(this.templateSource.layouts, renderer.templates.layouts, this.context);
			renderer.compileTemplates(this.templateSource.partials, renderer.templates.partials, this.context);
			log.verbose(`Templates compiled in ${Date.now() - startMs}ms`);

			// Build content pages using templates
			startMs = Date.now();
			buildContent(this.contentSource, this.context.content, this.context, renderer.templates.layouts);
			log.verbose(`Built ${contentCount} content files in ${Date.now() - startMs}ms`);

			// Write content pages to disk
			startMs = Date.now();
			writeContent(this.context.content, this.config.settings.stages.compile.outputDirs.content);
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
			log.writeBox('Stage: publish');

			// TODO

			deferred.resolve();
		} catch(err) {
			deferred.reject(err);
		}

		return deferred.promise;
	}

	render(content) {
		//TODO: is this right? This seems leftover, should be pageData instead of string content.
		content.body = renderer.renderContent(content, ContextExtensions.fromContext(this.context), renderer.templates.layouts);
		return content;
	}

	prepareOutputFileName(inputFileName) {
		return renderer.stripExtension(inputFileName, '.md', '.html');
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
		if (typeof(value) === 'object' && !PageData.is(value)) {
			sitemap.dirs[key] = { dirs: {}, pages: [] };
			processSources(value, sitemap.dirs[key], path.join(relativePath, key));
		} else {
			// Replace content with PageData
			const pageData = renderer.parseContent(value, key, relativePath);
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
					log.debug('Writing less file: ', outPath);
					fs.ensureDirSync(outputDir);
					fs.writeFileSync(outPath, output.css, 'utf-8');
				})
				.catch((err) => log.error(err));
		} else {
			log.debug('Writing file: ', path.join(outputDir, key));
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

	// Generate content
	let content = fs.readFileSync(filePath, 'utf-8');
	content = renderer.parseContent(content, path.basename(filePath), contentDir.dest);
	content.body = renderer.renderContent(content, ContextExtensions.fromContext(this.context));

	// Write to file
	const filename = renderer.stripExtension(path.basename(filePath), '.md', '.html');
	const destPath = path.join(this.config.settings.stages.compile.outputDirs.content, contentDir.dest);
	const contentObject = {};
	contentObject[filename] = content;
	writeContent(contentObject, destPath);
}

function writeContent(content, dest) {
	_.forOwn(content, (value, key) => {
		if (typeof(value) === 'object' && !PageData.is(value)) {
			writeContent(value, path.join(dest, key));
			return;
		}

		log.debug('Writing file: ', path.join(dest, key));
		fs.ensureDirSync(dest);
		fs.writeFileSync(path.join(dest, key), value.body, 'utf-8');
	});
}

let contentCount = 0;
function buildContent(sources, dest, originalContext, templates) {
	_.forOwn(sources, (value, key) => {
		if (typeof(value) === 'object' && !PageData.is(value)) {
			if (!dest[key]) dest[key] = {};
			buildContent(value, dest[key], originalContext, templates);
		} else {
			value.body = renderer.renderContent(value, ContextExtensions.fromContext(originalContext));
			dest[value.pageSettings.fileName] = value;
			contentCount++;
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
