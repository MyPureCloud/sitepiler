const _ = require('lodash');
const dot = require('dot');
const MarkdownIt = require('markdown-it');

const ContextExtensions = require('./contextExtensions');


const log = new (require('lognext'))('Renderer');

const ABS_PATH_REGEX = /(<\s*(?:a|img|script|link)\s+.*?(?:href|src)=['"])(\/.*?['"].*?>)/igm;

// Markdown renderer settings
const md = new MarkdownIt({
	html: true,
	linkify: true,
	xhtmlOut: true
});

// Disable Indented code - this setting breaks rendering formatted/intented HTML if it has blank lines in it 
md.disable(['code']); 

// Add extensions
md.block.ruler.before('table', 'mytable', require('./markdown-it-extensions/table'), { alt: ['paragraph', 'reference'] });
md.use(require('./markdown-it-extensions/code-fence'));
md.use(require('./markdown-it-extensions/toc'));
md.use(require('./markdown-it-extensions/linkRenderer'), 'link renderer');
md.use(require('./markdown-it-extensions/heading'));
md.use(require('./markdown-it-extensions/alert'));

// Set doT settings
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



class Renderer {
	constructor() {
		this.templates = {
			layouts: {},
			partials: {}
		};
	}

	setInternalLinkRegex(internalLinkRegex) {
		log.info(`Using internal link regex: ${internalLinkRegex}`);
		md.use(require('./markdown-it-extensions/linkRenderer'), 'link renderer', internalLinkRegex);
	}

	setCdn(cdnUriRegex, cdnUri) {
		log.info(`CDN URI: ${cdnUri}`);
		log.info(`Using CDN regex: ${cdnUriRegex}`);
		this.cdnUriRegex = new RegExp(cdnUriRegex, 'gi');
		this.cdnUri = cdnUri;
	}

	compileTemplates(source, dest, originalContext) {
		// Deep copy context
		const context = ContextExtensions.fromContext(originalContext);

		_.forOwn(source, (value, key) => {
			if (typeof(value) === 'object') {
				if (!dest[key]) dest[key] = {};
				this.compileTemplates(value, dest[key], originalContext);
			} else {
				log.verbose(`Compiling template ${key}`);
				dest[key.substring(0, key.length - 4)] = dot.template(value, undefined, context);
			}
		});
	}

	/**
	 * Returns the rendered content from the PageData
	 */
	renderContent(page, originalContext) {
		// Deep copy context
		const context = ContextExtensions.fromContext(originalContext);

		log.verbose(`Bulding page: ${page.link}`);
		const startMs = Date.now();

		// Build breadcrumb
		context.breadcrumb = [];
		let sitemap = context.sitemap;
		let paths = page.path.split('/');
		paths = paths.filter((p) => p != '');
		paths.forEach((dirname) => {
			sitemap = sitemap.dirs[dirname];
			let slice = { 
				title: sitemap.title,
				path: sitemap.path,
				crumbs: []
			};
			_.forOwn(sitemap.pages, (crumbPage) => {
				if (crumbPage.filename.startsWith('index.') || crumbPage.notoc) return;
				slice.crumbs.push({
					title: crumbPage.title,
					path: crumbPage.link,
					order: crumbPage.order
				});
			});
			_.forOwn(sitemap.dirs, (dir) => {
				if (!dir.indexPage || dir.indexPage.notoc) return;
				slice.crumbs.push({
					title: dir.indexPage.title,
					path: dir.indexPage.link,
					order: dir.indexPage.order
				});
			});
			slice.crumbs = _.sortBy(slice.crumbs, [ 'order', 'title']);
			context.breadcrumb.push(slice);
		});

		// Remove last crumb if index page
		if (page.filename.startsWith('index.')) context.breadcrumb.pop();

		// Build siblings list
		context.siblings = [];
		_.forOwn(sitemap.pages, (siblingPage) => {
			// Exclude index page
			if (siblingPage.filename.startsWith('index.')) return;

			siblingPage.isCurrentPage = siblingPage.link === page.link;
			context.siblings.push(siblingPage);
		});
		_.forOwn(sitemap.dirs, (dir, dirname) => {
			context.siblings.push({
				title: dir.title,
				link: dir.path,
				isCurrentPage: false,
				order: dir.indexPage ? dir.indexPage.order : undefined,
				notoc: dir.indexPage ? dir.indexPage.notoc : undefined
			});
		});

		// Sort siblings
		context.siblings = _.sortBy(context.siblings, [ 'order', 'title']);

		// Compile page and execute page template
		context.page = page;
		const markdownContent = dot.template(page.getBody(), undefined, context)(context);

		// Compile markdown
		if (page.renderMarkdown !== false)
			context.content = md.render(markdownContent);
		else
			context.content = markdownContent;

		// Execute layout template
		let template;
		if (this.templates.layouts[page.layout] && page.layout !== 'default') {
			template = this.templates.layouts[page.layout];
		} else {
			// Use path default?
			this.defaultTemplates.some((dt) => {
				if ((dt.webPath && page.link.toLowerCase().startsWith(dt.webPath.toLowerCase()) && this.templates.layouts[dt.template]) ||
				(dt.webPathRegex && (new RegExp(dt.webPathRegex, 'i')).exec(page.link))) {
					template = this.templates.layouts[dt.template];
					return true;
				}
			});

			// Use "default"
			if (!template) {
				if (page.layout && page.layout !== 'default')
					log.warn(`Unknown template "${page.layout}", using default`);

				template = this.templates.layouts.default;
			}
		}
		let output = template(context);

		// Add subdir
		if (this.siteSubdir) {
			output = output.replace(ABS_PATH_REGEX, (match, p1, p2, offset, string) => {
				if (p2.startsWith('//') || p2.toLowerCase().startsWith(this.siteSubdir)) return match;
				return p1 + this.siteSubdir + p2;
			});
		}

		// Use CDN
		if (this.cdnUri && this.cdnUri !== '' && this.cdnUriRegex) {
			output = output.replace(this.cdnUriRegex, (match, p1, p2, p3, offset, string) => {
				return `${p1}${this.cdnUri}${p2}${p3}`;
			});
		}

		// Log completion
		const duration = Date.now() - startMs;
		if (duration > 1000)
			log.warn(`Page build time of ${duration} exceeded 1000ms: ${page.link}`);
		else
			log.verbose(`Page build completed in ${duration}ms`);

		return output;
	}

	stripExtension(inputFilename, extension, newExtension) {
		// Include periods
		if (!extension.startsWith('.')) extension = '.' + extension;
		if (newExtension && !newExtension.startsWith('.')) newExtension = '.' + newExtension;
		// Remove
		let outputFileName = inputFilename.substring(0, inputFilename.length - extension.length);
		// Add
		if (newExtension && !outputFileName.endsWith(newExtension)) outputFileName += newExtension;
		// Return
		return outputFileName;
	}
}

module.exports = new Renderer();
