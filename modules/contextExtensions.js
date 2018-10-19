const _ = require('lodash');
const clone = require('clone');
const path = require('path');



class ContextExtensions {
	static fromContext(origContext) {
		// Deep copy
		const newContext = clone(origContext);

		// Add extension modules
		newContext.path = path;
		newContext._ = _;
		// Renderer is used in the include function, not intended to be used in a page
		// Can't require it globally outside the class due to circular dependency with renderer requiring this
		newContext.renderer = require('./renderer');

		/**
		 * Add extension functions
		 * These cannot be lambda functions and must be explicitly bound to the context object 
		 */

		// Function to include partial templates in pages
		newContext.include = function (partial) {
			const parts = partial.split('/');
			let target = this.renderer.templates.partials;
			// Drill down into directories to find template
			parts.forEach((part) => target = target[part]);
			return target(this);
		};
		newContext.include.bind(newContext);

		// Inject livereload script into page
		newContext.livereload = function() {
			// Expects context to include config!
			if (!this.config.cliopts.livereload) return '';
			return `<script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':${this.config.cliopts.livereloadPort}/livereload.js?snipver=1"></' + 'script>');</script>`;
		};
		newContext.livereload.bind(newContext);

		return newContext;
	}
}



module.exports = ContextExtensions;
