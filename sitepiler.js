const _ = require('lodash');
const cli = require('commander');
const fs = require('fs-extra');
const path = require('path');


const packageJson = require('./package.json');

const TARGET_REGEX_STRING = 'data|compile|publish';
const TARGET_REGEX = new RegExp('^(' + TARGET_REGEX_STRING + ')$', 'i');
const LOG_LEVEL_REGEX_STRING = 'error|warn|info|verbose|debug|silly';
const LOG_LEVEL_REGEX = new RegExp('^(' + LOG_LEVEL_REGEX_STRING + ')$', 'i');



// CLI config and validation
cli
	.usage('[options] <configFiles ...>')
	.option('-b --build <stage>', `Build to target (${TARGET_REGEX_STRING})`, TARGET_REGEX)
	.option('-o --buildOnly <stage>', `Build a single stage (${TARGET_REGEX_STRING})`, TARGET_REGEX)
	.option('-l --local', 'Serve the page locally')
	.option('-p --localPort <n>', 'Port for serving the page locally', commanderParseInt, 4567)
	.option('-r --livereload', 'Enable livereload server when serving locally')
	.option('-r --livereloadPort <n>', 'Custom livereload server port', commanderParseInt, 35729)
	.option('-t --tracing <level>', `Tracing level (${LOG_LEVEL_REGEX_STRING})`, LOG_LEVEL_REGEX, 'debug')
	.version(packageJson.version, '-v, --version')
	.parse(process.argv);

if (!process.argv.slice(2).length) {
	cli.outputHelp();
	exit(0);
}



/*** App starts here ***/

// Initialize logger first, then load local modules
const log = new (require('lognext'))('cli');
global.logLevel = cli.tracing;
log.setLogLevel(global.logLevel);

const ConfigHelper = require('./modules/configHelper');
const Sitepiler = require('./modules/sitepiler');

let server;

// Validate CLI options
if (cli.build === true)
	exit('Invalid --build target');
if (cli.buildOnly === true)
	exit('Invalid --stage target');
if (cli.build && cli.buildOnly)
	exit('--build and --stage cannot be used together');
if (!(cli.build || cli.buildOnly) && !cli.local)
	exit('A build target or local CLI option must be specified');
if (cli.args.length == 0)
	exit('No config files specified!');

// Convert stage to number
if (cli.build) {
	cli.build = stageToInt(cli.build);
	if (cli.build === 0)
		exit('Failed to identify build stage');
}
if (cli.buildOnly) {
	cli.buildOnly = stageToInt(cli.buildOnly);
	if (cli.buildOnly === 0)
		exit('Failed to identify buildOnly stage');
}

// Debug CLI settings
log.debug('CLI OPTIONS');
log.debug('===========');
log.debug('--build -> ', cli.build);
log.debug('--buildOnly -> ', cli.buildOnly);
log.debug('--local -> ', cli.local);
log.debug('--localPort -> ', cli.localPort);
log.debug('--livereload -> ', cli.livereload);
log.debug('--livereloadPort -> ', cli.livereloadPort);
log.debug('--tracing -> ', cli.tracing);
log.debug('args:', cli.args);


// CLI looks good, let's do it!
log.writeBox('Sitepiler\nv'+packageJson.version);

// Set base env vars
ConfigHelper.setEnv('cli_ROOT', path.resolve('./'));

// Load config
try {
	ConfigHelper.loadConfigs(cli.args);
} catch(err) {
	exit(err);
}

// Add cli opts to config
ConfigHelper.setDefault(ConfigHelper.config, 'cliopts', {});
ConfigHelper.config.cliopts.build = cli.build;
ConfigHelper.config.cliopts.buildOnly = cli.buildOnly;
ConfigHelper.config.cliopts.local = cli.local;
ConfigHelper.config.cliopts.localPort = cli.localPort;
ConfigHelper.config.cliopts.livereload = cli.livereload;
ConfigHelper.config.cliopts.livereloadPort = cli.livereloadPort;
ConfigHelper.config.cliopts.tracing = cli.tracing;
ConfigHelper.config.cliopts.args = cli.args;

// log.debug(ConfigHelper.config);


// Begin processing
const sitepiler = new Sitepiler(ConfigHelper.config);

if (cli.build) {
	// Build stages data -> compile -> publish, then run local server
	log.info(`Running build stages (${cli.build})`);
	sitepiler.gatherData()
		.then(() => {
			return shouldRunStage('compile') ? sitepiler.compile() : false;
		})
		.then(() => {
			return shouldRunStage('publish') ? sitepiler.publish() : false;
		})
		.then(runLocalServer)
		.catch((err) => exit(err));
} else if (cli.buildOnly) {
	let promise;

	// Kick off build stage
	switch(cli.buildOnly) {
		case 1: {
			promise = sitepiler.gatherData();
			break;
		}
		case 2: {
			promise = sitepiler.compile();
			break;
		}
		case 3: {
			promise = sitepiler.publish();
			break;
		}
		default: {
			exit('Failed to execute buildOnly target');
		}
	}

	// Run local server after stage completes
	promise
		.then(runLocalServer)
		.catch((err) => exit(err));
} else {
	runLocalServer();
}

/*** Functions ***/

function runLocalServer() {
	if (cli.local) {
		// Run local server
		const EditorServer = require('./modules/editor/server');
		server = new EditorServer(sitepiler, cli.localPort);
		server.start();
	} else {
		log.verbose('Not starting local server');
	}
}

function shouldRunStage(stage) {
	return stageToInt(stage) <= cli.build;
}

function stageToInt(stage) {
	switch(stage) {
		case 'data':
			return 1;
		case 'compile':
			return 2;
		case 'publish':
			return 3;
		default: 
			return 0;
	}
}

function exit(msg) {
	if (typeof msg === 'number') {
		log.error(`Exiting with code ${msg}`);
		process.exit(msg);
	} else {
		log.error('The application is exiting with an error!');
		log.error(msg);
		process.exit(msg);
	}
}

function commanderParseInt(x, defaultValue) {
	// Can't use parseInt directly because commander passes the default value as a 
	// second parameter, which means something else for parseInt
	const i = parseInt(x);
	return isNaN(i) ? defaultValue : i;
}
