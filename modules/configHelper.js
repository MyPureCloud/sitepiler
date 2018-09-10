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
		this.setDefault(this.config, 'stageSettings', {});
		this.setDefault(this.config.stageSettings, 'data', {});
		this.setDefault(this.config.stageSettings.data, 'scripts', []);
		this.setDefault(this.config.stageSettings, 'compile', {});
		this.setDefault(this.config.stageSettings.compile, 'preCompileScripts', []);
		this.setDefault(this.config.stageSettings.compile, 'outputDir', path.resolve('./build'));
		this.setDefault(this.config.stageSettings.compile, 'postCompileScripts', []);
		this.setDefault(this.config.stageSettings, 'publish', {});
		this.setDefault(this.config.stageSettings.publish, 'prePublishScripts', []);
		this.setDefault(this.config.stageSettings.publish, 'publishScripts', []);
		this.setDefault(this.config.stageSettings.publish, 'postPublishScripts', []);

		// Check for required settings
		this.checkAndThrow(this.config.stageSettings.data, 'dataDirs');
		this.checkAndThrow(this.config.stageSettings.compile, 'templateDirs');
		this.checkAndThrow(this.config.stageSettings.compile, 'contentDirs');

		// Apply other configs
		for (let i = configSources.length - 1; i > 0; i--) {
			this.applyOverrides(this.config, configSources[i]);
		}

		// Set env vars
		_.forOwn(this.config.envVars, (value, key) => {
			this.setEnv(key, value);
		});

		// Resolve env vars
		this.resolveEnvVars(this.config);


		log.silly('After:', this.config);
	}

	setDefault(haystack, needle, defaultValue, warning) {
		if (!haystack) {
			log.warn('Haystack was undefined!');
			return;
		}
		if (!haystack[needle]) {
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
					return this.getEnv(p1);
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
}



module.exports = new ConfigHelper();