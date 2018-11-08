const _ = require('lodash');
const clone = require('clone');
const path = require('path');



class ContextExtensions {
	static fromContext(origContext) {
		// Deep copy
		/*
		 * NOTE: Not sure if this needs to be cloned at all. It seems to be working as expected.
		 * It's possible that pages could mutate the context object and cause unexpected effects on 
		 * other pages, however. Is there actually a use case for needing to mutate the context while 
		 * rendering something? Maybe just don't do that?
		 *
		 * Remove the clone dependency if this doesn't need to be cloned.
		 */
		// const newContext = clone(origContext);
		const newContext = origContext;

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
		newContext.include = function (partial, additionalContext) {
			const parts = partial.split('/');
			let target = this.renderer.templates.partials;
			// Drill down into directories to find template
			parts.forEach((part) => target = target[part]);
			this.additionalContext = additionalContext;
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

		// Split helper function
		newContext.splitAndGet = function(target, char, pos) {
			if (!target) return '';
			const parts = target.split(char);
			if (pos && parts.length > pos)
				return parts[pos];
			else
				return parts[parts.length - 1];
		};
		newContext.splitAndGet.bind(newContext);

		return newContext;
	}
}



module.exports = ContextExtensions;
