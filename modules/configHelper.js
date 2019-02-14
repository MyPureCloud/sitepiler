const _ = require('lodash');
const log = new (require('lognext'))('ConfigHelper');
const deref = require('json-schema-deref-sync');
const fs = require('fs-extra');
const path = require('path');
const YAML = require('yaml').default;



class ConfigHelper {
	constructor() {
		log.setLogLevel(global.logLevel);
	}

	loadConfigs(configFiles) {
		const configSources = [];

		// Load config files from disk
		configFiles.forEach((configSource) => {
			if (!fs.existsSync(configSource))
				throw new Error(`Config file not found: ${configSource}`);
			else
				log.info(`Loading config: ${configSource}`);

			// Read file
			const extension = path.extname(configSource).substring(1);
			if (extension.toLowerCase() === 'yml' || extension.toLowerCase() === 'yaml')
				configSources.push(YAML.parse(fs.readFileSync(configSource, 'utf-8')));
			else if (extension.toLowerCase() === 'json')
				configSources.push(fs.readFileSync(configSource, 'utf-8'));
			else
				throw new Error(`Unknown file extension ${extension}`);

			// Dereference
			configSources[configSources.length - 1] = this.dereference(configSources[configSources.length - 1]);
		});

		// First config is primary config
		this.config = configSources[0];

		// Initialize config structure before proceeding
		this.setDefault(this.config, 'envVars', {});
		this.setDefault(this.config, 'settings', {});
		this.setDefault(this.config.settings, 'rootDir', process.cwd());
		this.setDefault(this.config.settings, 'templateChangeRebuildQuietSeconds', 30);
		this.setDefault(this.config.settings, 'defaultTemplates', []);
		this.setDefault(this.config.settings, 'stages', {});
		this.setDefault(this.config.settings.stages, 'data', {});
		this.setDefault(this.config.settings.stages.data, 'scripts', []);
		this.setDefault(this.config.settings.stages, 'compile', {});
		this.setDefault(this.config.settings.stages.compile, 'preCompileScripts', []);
		this.setDefault(this.config.settings.stages.compile, 'outputDirs', {});
		this.setDefault(this.config.settings.stages.compile.outputDirs, 'clearOnBuild', false);
		this.setDefault(this.config.settings.stages.compile.outputDirs, 'content', path.resolve('./build'));
		this.setDefault(this.config.settings.stages.compile.outputDirs, 'styles', path.resolve('./build/styles'));
		this.setDefault(this.config.settings.stages.compile.outputDirs, 'static', path.resolve('./build'));
		this.setDefault(this.config.settings.stages.compile, 'postCompileScripts', []);
		this.setDefault(this.config.settings.stages, 'publish', {});
		this.setDefault(this.config.settings.stages.publish, 'prePublishScripts', []);
		this.setDefault(this.config.settings.stages.publish, 'publishScripts', []);
		this.setDefault(this.config.settings.stages.publish, 'postPublishScripts', []);

		// Check for required settings
		this.checkAndThrow(this.config.settings.stages.data, 'dataDirs');
		this.checkAndThrow(this.config.settings.stages.compile, 'templateDirs');
		this.checkAndThrow(this.config.settings.stages.compile, 'contentDirs');

		// Apply other configs
		for (let i = configSources.length - 1; i > 0; i--) {
			this.applyOverrides(this.config, configSources[i]);
		}

		// Set env vars, skip ones with replacements on the first pass
		_.forOwn(this.config.envVars, (value, key) => {
			if (/\$\{\w+?\}/i.exec(value) === null)
				this.setEnv(key, value);
		});

		_.forOwn(this.config.envVars, (value, key) => {
			this.setEnv(key, value);
		});

		// Resolve env vars
		this.resolveEnvVars(this.config);

		// Normalize dirs
		this.config.settings.stages.data.dataDirs = this.normalizeDirs(this.config.settings.stages.data.dataDirs, this.config.settings.rootDir);
		this.config.settings.stages.compile.templateDirs.layouts = this.normalizeDirs(this.config.settings.stages.compile.templateDirs.layouts, this.config.settings.rootDir);
		this.config.settings.stages.compile.templateDirs.partials = this.normalizeDirs(this.config.settings.stages.compile.templateDirs.partials, this.config.settings.rootDir);
		this.config.settings.stages.compile.contentDirs = this.normalizeDirObjects(this.config.settings.stages.compile.contentDirs, this.config.settings.rootDir);
		this.config.settings.stages.compile.styleDirs = this.normalizeDirObjects(this.config.settings.stages.compile.styleDirs, this.config.settings.rootDir);
		this.config.settings.stages.compile.staticDirs = this.normalizeDirObjects(this.config.settings.stages.compile.staticDirs, this.config.settings.rootDir);

		// Resolve output dirs
		this.config.settings.stages.compile.outputDirs.content = this.normalizeDir(this.config.settings.stages.compile.outputDirs.content, this.config.settings.rootDir);
		this.config.settings.stages.compile.outputDirs.styles = this.normalizeDir(this.config.settings.stages.compile.outputDirs.styles, this.config.settings.rootDir);
		this.config.settings.stages.compile.outputDirs.static = this.normalizeDir(this.config.settings.stages.compile.outputDirs.static, this.config.settings.rootDir);

		// Resolve script sources
		this.normalizeScriptConfigs(this.config.settings.stages.data.scripts);
		this.normalizeScriptConfigs(this.config.settings.stages.compile.preCompileScripts);
		this.normalizeScriptConfigs(this.config.settings.stages.compile.postCompileScripts);
		this.normalizeScriptConfigs(this.config.settings.stages.publish.publishScripts);

		// Normalize data dirs
		for (var i = 0; i < this.config.settings.stages.data.dataDirs.length; i++) {
			this.config.settings.stages.data.dataDirs[i] = path.resolve(this.config.settings.stages.data.dataDirs[i]);
		}

		// Normalize siteSubdir to "/path/to/folder"
		if (this.config.settings.siteSubdir) {
			if (!this.config.settings.siteSubdir.startsWith('/'))
				this.config.settings.siteSubdir = '/' + this.config.settings.siteSubdir;
			if (this.config.settings.siteSubdir.endsWith('/'))
				this.config.settings.siteSubdir = this.config.settings.siteSubdir.substring(1);
		}
	}

	setDefault(haystack, needle, defaultValue, warning) {
		if (!haystack) {
			log.warn('Haystack was undefined!');
			return;
		}
		if (!haystack[needle] && haystack[needle] !== false) {
			if (warning) 
				log.warn(warning);

			haystack[needle] = defaultValue;
		}
	}

	checkAndThrow(haystack, needle, message) {
		if (!haystack[needle] || haystack[needle] === '')
			throw new Error(message ? message : `${needle} must be set!`);
	}

	getEnv(varname, defaultValue, isDefaultValue) {
		varname = varname.trim();
		var envVar = process.env[varname];
		log.silly(`ENV: ${varname}->${envVar}`);
		if (!envVar && defaultValue) {
			envVar = defaultValue;
			if (isDefaultValue === true)
				log.info(`Using default value for ${varname}: ${envVar}`);
			else
				log.warn(`Using override for ${varname}: ${envVar}`);
		}
		if (envVar) {
			if (envVar.toLowerCase() === 'true')
				return true;
			else if (envVar.toLowerCase() === 'true')
				return false;
			else 
				return envVar;
		}

		return defaultValue;
	}

	setEnv(varname, value) {
		var values = [ value ];
		this.resolveEnvVars(values);
		varname = varname.trim();
		log.silly(`ENV: ${varname}=${values[0]}`);
		process.env[varname] = values[0];
	}

	resolveEnvVars(config) {
		_.forOwn(config, (value, key) => {
			if (typeof(value) == 'string') {
				config[key] = value.replace(/\$\{(.+?)\}/gi, (match, p1, offset, string) => {
					return this.getEnv(p1) || '';
				});
			} else {
				this.resolveEnvVars(value);
			}
		});
	}

	applyOverrides(original, overrides) {
		if (!original || !overrides)
			return;

		_.forOwn(overrides, (value, key) => {
			if (Array.isArray(value)) {
				log.verbose(`Overriding array ${key}. Length old/new => ${original[key].length}/${value.length}`);
				original[key] = value;
			}
			else if (typeof(value) == 'object') {
				// Initialize original to ensure the full path to the override values
				if (!original[key])
					original[key] = {};
				this.applyOverrides(original[key], value);
			} else {
				if (original[key])
					log.verbose(`Overriding ${key}. Values old/new => ${original[key]}/${value}`);
				original[key] = value;
			}
		});
	}

	dereference(config) {
		return deref(config);
	}

	normalizeDirs(dirs, cwd) {
		const tempDirs = [];
		dirs.forEach((d) => {
			tempDirs.push(this.normalizeDir(d, cwd));
		});
		return tempDirs;
	}

	normalizeDirObjects(dirs, cwd) {
		const tempDirs = [];
		dirs.forEach((d) => {
			let newDir = {};

			if (typeof(d) === 'string') {
				newDir.source = d;
			} else {
				newDir = d;
			}

			newDir.source = this.normalizeDir(newDir.source, cwd);
			this.setDefault(newDir, 'dest', '');
			this.setDefault(newDir, 'recursive', true);

			tempDirs.push(newDir);
		});
		return tempDirs;
	}

	normalizeDir(dir, cwd) {
		const paths = [];

		if (!path.isAbsolute(dir))
			paths.push(cwd);

		paths.push(dir);

		const newPath = path.resolve.apply(this, paths);
		return newPath;
	}

	normalizeScriptConfigs(scriptConfigs) {
		if(!scriptConfigs) return;
		scriptConfigs.forEach((scriptConfig) => this.normalizeScriptConfig(scriptConfig));
	}

	normalizeScriptConfig(scriptConfig) {
		if (scriptConfig.src) scriptConfig.src = this.normalizeDir(scriptConfig.src, this.config.settings.rootDir);
		if (scriptConfig.cwd)
			scriptConfig.cwd = this.normalizeDir(scriptConfig.cwd, this.config.settings.rootDir);
		else
			scriptConfig.cwd = this.config.settings.rootDir;
	}
}



module.exports = new ConfigHelper();
