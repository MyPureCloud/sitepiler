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
		newContext.include = function (partial) {
			// Drill down into directories to find template
			const parts = partial.split('/');
			let target = this.renderer.templates.partials;
			parts.forEach((part) => target = target[part]);

			// Preserve previous context and set new additional context
			const origContext = this.additionalContext;
			if (arguments.length > 1)
				this.additionalContext = Array.prototype.slice.call(arguments, 1);
			else
				this.additionalContext = [];

			// Execute template
			const retval = target(this);

			// Reset additional context
			this.additionalContext = origContext;

			// Return result of include
			return retval;
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

		// Get env variable
		newContext.getEnv = function(name) {
			return process.env[name] || '';
		};
		newContext.getEnv.bind(newContext);

		/** Swagger Helpers **/
		//TODO: Move this to the dev center project. It's project-specific.
		// For some reason, bind isn't working to set the context of `this` in the functions. The 
		// context is still the parent object (`swaggerHelpers`).
		// newContext.swaggerHelpers = {};

		newContext.getDefinition = function(schema, swaggerSource, truncate = true, resolvedTypes = [], level = 0) {
			if (!schema) return;
			if (!swaggerSource) swaggerSource = this.data.swagger;
			
			// If this is a reference, return the definition
			if (schema['$ref']) {
				const defName = schema['$ref'].split('/').pop();
				// Stop resolving refs at: 
				// 	- level 3 if the type has already been resolved
				// 	- level 6 if it's a previously unknown type
				if ((resolvedTypes.includes(defName) && level > 3) ||
					(!resolvedTypes.includes(defName) && truncate && level > 6)) {
					return { 'modelRef': defName };
				} else {
					resolvedTypes.push(defName);
					return newContext.getDefinition(JSON.parse(JSON.stringify(swaggerSource.definitions[defName])), swaggerSource, truncate, resolvedTypes, level);
				}
			}

			// Look ahead at properties and resolve them
			let newSchema = JSON.parse(JSON.stringify(schema));
			_.forOwn(newSchema, (value, key) => {
				if (typeof(value) === 'object') {
					// Value is a reference, replace it with a definition
					newSchema[key] = newContext.getDefinition(value, swaggerSource, truncate, resolvedTypes, value.items ? level : level + 1);

					// Set model name
					if (value['$ref'])
						newSchema[key].____modelName = value['$ref'].split('/').pop();
				}
			});
			return newSchema;
		};
		newContext.getDefinition.bind(newContext);

		return newContext;
	}
}



module.exports = ContextExtensions;
