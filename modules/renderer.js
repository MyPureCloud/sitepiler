const _ = require('lodash');
const dot = require('dot');
const fm = require('front-matter');
const MarkdownIt = require('markdown-it');
const path = require('path');

const ConfigHelper = require('./configHelper');
const ContextExtensions = require('./contextExtensions');
const PageData = require('./classes/pageData');


const log = new (require('lognext'))('Renderer');

// Markdown renderer settings
const md = new MarkdownIt({
	html: true,
	linkify: true,
	xhtmlOut: true
});
// Disable Indented code - this setting breaks rendering formatted/intented HTML if it has blank lines in it 
md.disable(['code']); 

md.block.ruler.before('table', 'mytable', require('./markdown-it-extensions/table'), { alt: ['paragraph', 'reference'] });
md.use(require('./markdown-it-extensions/code-fence'));
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

	compileTemplates(source, dest, originalContext) {
		// Deep copy context
		const context = ContextExtensions.fromContext(originalContext);

		_.forOwn(source, (value, key) => {
			if (typeof(value) === 'object') {
				if (!dest[key]) dest[key] = {};
				this.compileTemplates(value, dest[key], originalContext);
			} else {
				log.debug(`Compiling template ${key}`);
				dest[key.substring(0, key.length - 4)] = dot.template(value, undefined, context);
			}
		});
	}

	/**
	 * Parses raw page content and returns a PageData object
	 */
	parseContent(content, inputFilename, relativePath) {
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
		pd.pageSettings.filename = this.stripExtension(inputFilename, '.md', '.html');
		pd.pageSettings.path = relativePath;

		return pd;
	}

	/**
	 * Returns the rendered content from the PageData
	 */
	renderContent(pageData, context) {
		const fullPath = path.join(pageData.pageSettings.path, pageData.pageSettings.filename);
		log.debug(`Bulding page (${fullPath})`);
		const startMs = Date.now();

		// Build breadcrumb
		context.breadcrumb = [];
		let sitemap = context.sitemap;
		let webPath = '/';
		let paths = pageData.pageSettings.path.split('/');
		paths = paths.filter((p) => p != '');
		paths.forEach((dirname) => {
			sitemap = sitemap.dirs[dirname];
			log.debug('found: ', sitemap);
			webPath = path.join(webPath, dirname);
			context.breadcrumb.push({ 
				title: sitemap.title,
				path: webPath
			});
		});

		// Remove last crumb if index page
		log.debug(pageData.pageSettings);
		if (pageData.pageSettings.filename.startsWith('index.')) context.breadcrumb.pop();
		log.debug('breadcrumb: ', context.breadcrumb);

		// Compile page and execute page template
		context.pageSettings = pageData.pageSettings;
		const markdownContent = dot.template(pageData.body, undefined, context)(context);

		// Compile markdown
		const parsedContent = md.render(markdownContent);
		context.content = parsedContent;

		// Execute layout template
		let template;
		if (this.templates.layouts[context.pageSettings.layout]) {
			template = this.templates.layouts[context.pageSettings.layout];
		} else {
			log.warn(`Unknown template "${context.pageSettings.layout}", using default`);
			template = this.templates.layouts.default;
		}
		const output = template(context);

		// Log completion
		const duration = Date.now() - startMs;
		if (duration > 1000)
			log.warn(`Page build time of ${duration} exceeded 1000ms: ${fullPath}`);
		else
			log.debug(`Page build completed in ${duration}ms`);

		return output;
	}

	stripExtension(inputFilename, extension, newExtension) {
		// Include periods
		if (!extension.startsWith('.')) extension = '.' + extension;
		if (newExtension && !newExtension.startsWith('.')) newExtension = '.' + newExtension;
		// Remove
		let outputFileName = inputFilename.substring(0, inputFilename.length - extension.length);
		// Add
		if (!outputFileName.endsWith(newExtension)) outputFileName += newExtension;
		// Return
		return outputFileName;
	}
}

module.exports = new Renderer();
