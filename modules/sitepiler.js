const _ = require('lodash');
const chokidar = require('chokidar');
const less = require('less');
const livereload = require('livereload');
const lognext = require('lognext');
const fs = require('fs-extra');
const path = require('path');
const Q = require('q');

const ConfigHelper = require('./configHelper');
const ContextExtensions = require('./contextExtensions');
const Directory = require('./classes/directory');
const fileLoader = require('./fileLoader');
const Page = require('./classes/page');
const PageData = require('./classes/pageData');
const renderer = require('./renderer');
const scriptRunner = require('./scriptRunner');
const Timer = require('./timer');


const log = new lognext('Sitepiler');
const watcherlog = new lognext('watcher');

const BLOCKED_WATCHER_EVENTS = ['addDir','unlink','unlinkDir'];



class Sitepiler {
	constructor(config) {
		log.setLogLevel(global.logLevel);

		// Sitepiler configuration
		this.config = config;

		this.initCompileProps();

		// Set internal link regex
		if (this.config.settings.internalLinkRegex)
			renderer.setInternalLinkRegex(new RegExp(this.config.settings.internalLinkRegex, 'i'));

		// Set siteSubdir
		renderer.siteSubdir = this.config.settings.siteSubdir;

		// Livereload
		if (this.config.cliopts.livereload && this.config.cliopts.local) {
			this.livereloadServer = livereload.createServer({
				port: this.config.cliopts.livereloadPort	
			}, 
			() => log.info(`Livereload accepting connections on port ${this.config.cliopts.livereloadPort}`));

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
			this.config.settings.stages.compile.styleDirs.forEach((styleDir) => watchPaths.push(styleDir.source));
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

			// Run scripts
			scriptRunner.run(this.config.settings.stages.data.scripts);

			// Load data files
			const tempData = {};
			this.config.settings.stages.data.dataDirs.forEach((dataDir) => {
				fileLoader.loadFiles(dataDir, tempData, [ fileLoader.filters.JSON, fileLoader.filters.YAML ]);
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
			let compileStartMs = Timer.start();

			// Clear old data
			this.initCompileProps();
			if (this.config.settings.stages.compile.outputDirs.clearOnBuild) {
				fs.removeSync(this.config.settings.stages.compile.outputDirs.content);
				fs.removeSync(this.config.settings.stages.compile.outputDirs.styles);
				fs.removeSync(this.config.settings.stages.compile.outputDirs.static);
			}
			fs.ensureDirSync(this.config.settings.stages.compile.outputDirs.content);
			fs.ensureDirSync(this.config.settings.stages.compile.outputDirs.styles);
			fs.ensureDirSync(this.config.settings.stages.compile.outputDirs.static);

			// Run scripts
			scriptRunner.run(this.config.settings.stages.compile.preCompileScripts);

			// TODO: separate the template loading/compiling so that this module can be used without running a full compile
			// Load templates
			let startMs = Timer.start();
			this.config.settings.stages.compile.templateDirs.layouts.forEach((dataDir) => {
				fileLoader.loadFiles(dataDir, this.templateSource.layouts, [ fileLoader.filters.DOT ], true);
			});
			this.config.settings.stages.compile.templateDirs.partials.forEach((dataDir) => {
				fileLoader.loadFiles(dataDir, this.templateSource.partials, [ fileLoader.filters.DOT ], true);
			});
			log.verbose(`Templates loaded in ${startMs.getMs()}ms`);

			// Build sitemap w/page metadata
			startMs = Timer.start();
			this.context.sitemap = Directory.fromPath('/');
			this.config.settings.stages.compile.contentDirs.forEach((sourceDir) => {
				loadSources(
					sourceDir.source, 
					this.config.settings.stages.compile.outputDirs.content, 
					sourceDir.dest, 
					this.context.sitemap);
			});
			log.verbose(`Content loaded in ${startMs.getMs()}ms`);

			// Process page sources
			this.context.sitemap.analyze();

			// Process styles
			const styleStartMs = Timer.start();
			const stylePromises = [];
			this.config.settings.stages.compile.styleDirs.forEach((styleConfig) => {
				stylePromises.push(processStyleConfig(
					styleConfig.source, 
					path.join(this.config.settings.stages.compile.outputDirs.styles, styleConfig.dest), 
					styleConfig.recursive
				));
			});

			// Process static content
			startMs = Timer.start();
			this.config.settings.stages.compile.staticDirs.forEach((sourceDir) => {
				const targetDir = path.join(this.config.settings.stages.compile.outputDirs.static, sourceDir.dest);
				log.info(`Copying static files from ${sourceDir.source} to ${targetDir}`);
				fs.copySync(sourceDir.source, targetDir);
			});
			log.verbose(`Static files copied in ${startMs.getMs()}ms`);

			// Compile templates so they can be used
			startMs = Timer.start();
			renderer.compileTemplates(this.templateSource.layouts, renderer.templates.layouts, this.context);
			renderer.compileTemplates(this.templateSource.partials, renderer.templates.partials, this.context);
			log.verbose(`Templates compiled in ${startMs.getMs()}ms`);

			// Build content pages using templates
			startMs = Timer.start();
			this.context.sitemap.renderPages(this.context);
			log.verbose(`Rendered content files in ${startMs.getMs()}ms`);

			// Wait for styles to complete
			Promise.all(stylePromises)
				.then(() => {
					log.verbose(`Styles loaded in ${styleStartMs.getMs()}ms`);

					// Build manifest
					//TODO: move this into a custom script. Should be possible now that the sitemap exists for all pages.
					if (this.context.data.build && this.context.data.build.projectName) {
						log.verbose('Building manifest...');
						this.manifest = {
							name: this.context.data.build.projectName,
							version: this.context.data.build.buildNumber,
							buildNumber: this.context.data.build.buildNumber,
							indexFiles: []
						};
						buildManifest(this.manifest.indexFiles, this.config.settings.stages.compile.outputDirs.content, '/');
						fs.writeFileSync(
							path.join(this.config.settings.stages.compile.outputDirs.content, 'manifest.json'), 
							JSON.stringify(this.manifest, null, 2), 
							'utf-8'
						);
					} else {
						log.verbose('Skipping manifest, build data not found');
					}
					
					// Complete stage
					log.verbose(`Compile stage completed in ${compileStartMs.getMs() }ms`);
					deferred.resolve();
				})
				.catch(deferred.reject);

			// Run scripts
			scriptRunner.run(this.config.settings.stages.compile.postCompileScripts);
		} catch(err) {
			deferred.reject(err);
		}

		return deferred.promise;
	}

	publish() {
		const deferred = Q.defer();

		try {
			log.writeBox('Stage: publish');

			// Run scripts
			scriptRunner.run(this.config.settings.stages.publish.publishScripts);

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

	prepareOutputFileName(inputFilename) {
		return renderer.stripExtension(inputFilename, '.md');
	}
}



module.exports = Sitepiler;



function loadSources(sourceDir, outputRoot, relativePath, directory) {
	const outputDir = path.join(outputRoot, relativePath);

	// Load dir content
	const dirContents = fileLoader.getContentNames(sourceDir, [fileLoader.filters.MARKDOWN]);

	// Process each content page
	dirContents.files.forEach((file) => {
		const wasAdded = directory.addPage(
			Page.load(
				path.join(sourceDir, file), 
				path.join(outputDir, file), 
				relativePath
			)
		);
		if (!wasAdded)
			log.warn('Failed to add page to directory structure! Page path: ' + path.join(directory.path, file));
	});

	// Recurse each subdir
	dirContents.dirs.forEach((dir) => {
		directory.dirs[dir] = Directory.fromPath(path.join(directory.path, dir));
		loadSources(path.join(sourceDir, dir), outputRoot, path.join(relativePath, dir), directory.dirs[dir]);
	});
}

function buildManifest(manifest, sourcePath, relativePath) {
	const files = fs.readdirSync(sourcePath);
	const dirs = [];
	files.forEach((file) => {
		const newSourcePath = path.join(sourcePath, file);
		const newRelativePath = path.join(relativePath, file);
		if (fs.lstatSync(newSourcePath).isDirectory())
			dirs.push(file);
		else 
			manifest.push({ file: newRelativePath });
	});

	dirs.forEach((dir) => buildManifest(manifest, path.join(sourcePath, dir), path.join(relativePath, dir)));
}

function processStyleConfig(sourceDir, outputDir, recursive) {
	const deferred = Q.defer();

	let styleSource = {};
	fileLoader.loadFiles(sourceDir, styleSource, [ fileLoader.filters.STYLES ], false);

	const promises = [];
	_.forOwn(styleSource, (value, key) => {
		if (key.toLowerCase().endsWith('less')) {
			log.verbose(`Rendering LESS file ${key}`);
			promises.push(less.render(value, { paths: [ sourceDir ] })
				.then((output) => {
					const outPath = path.join(outputDir, key.replace('.less', '.css'));
					log.verbose('Writing less file: ', outPath);
					fs.ensureDirSync(outputDir);
					fs.writeFileSync(outPath, output.css, 'utf-8');
				})
				.catch((err) => {
					if (err.constructor.name === 'LessError') {
						// The LESS renderer throws a custom object that is not a standard JS error
						log.error(`${err.message} [${path.basename(err.filename)} (via ${key}) >> line: ${err.line}, column: ${err.column}, index: ${err.index}]`);
						err = Error(err.message);
					} else if (!err) {
						// This 
						const msg = `Unspecified error rendering ${key}`;
						log.warn(msg);
						err = Error(msg);
					}
					throw err;
				})
			);
		} else {
			log.verbose('Writing file: ', path.join(outputDir, key));
			fs.ensureDirSync(outputDir);
			fs.writeFileSync(path.join(outputDir, key), value, 'utf-8');
		}

	});

	// Recurse?
	if (recursive) {
		fileLoader.getDirNames(sourceDir).forEach((dir) => {
			promises.push(processStyleConfig(path.join(sourceDir, dir), path.join(outputDir, dir), recursive));
		});
	}

	// Wait for processing
	Promise.all(promises)
		.then(deferred.resolve)
		.catch(deferred.reject);

	return deferred.promise;
}

// Expects to have context bound to a sitepiler instance
function templateWatcherEvent(evt, filePath) {
	try {
		watcherlog.verbose(`(template) ${evt} >> ${filePath}`);
		if (BLOCKED_WATCHER_EVENTS.includes(evt)) return;

		// Skip if disabled
		if (this.config.settings.templateChangeRebuildQuietSeconds < 0) return;

		// Clear pending timer
		if (this.templateWatcherRebuiltTimeout) clearTimeout(this.templateWatcherRebuiltTimeout);

		// Set new timer
		watcherlog.info(`Triggering recompile in ${this.config.settings.templateChangeRebuildQuietSeconds} seconds...`);
		this.templateWatcherRebuiltTimeout = setTimeout(this.compile.bind(this), this.config.settings.templateChangeRebuildQuietSeconds * 1000);
	} catch(ex) {
		log.error(ex);
	}
}

// Expects to have context bound to a sitepiler instance
function sourceWatcherEvent(evt, filePath) {
	try {
		watcherlog.verbose(`(source) ${evt} >> ${filePath}`);
		if (BLOCKED_WATCHER_EVENTS.includes(evt)) return;

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

		// Determine paths
		const subdir = filePath.substring(contentDir.source.length + 1, filePath.length - path.basename(filePath).length);
		let relativePath = path.join(contentDir.dest, subdir);
		// path.join returns '.' representing the current directory when both contentDir.dest and subdir and empty strings
		if (relativePath === '.') relativePath = '/';
		const destPath = path.join(this.config.settings.stages.compile.outputDirs.content, relativePath, path.basename(filePath));

		// Generate content
		const page = Page.load(
			filePath, 
			destPath, 
			relativePath
		);
		this.context.sitemap.addPage(page);
		page.render(this.context);
	} catch(ex) {
		log.error(ex);
	}
}
