const _ = require('lodash');
const childProcess = require('child_process');
const path = require('path');

const Timer = require('./timer');

const log = new (require('lognext'))('ScriptRunner');



class ScriptRunner {
	constructor() {
		this.isLocal = false;
	}

	setIsLocal(local) {
		this.isLocal = local;
		log.info(`Running locally: ${this.isLocal}`);
	}

	run(scriptConfig) {
		let exitCode = -100;
		const startTime = Timer.start();

		if (Array.isArray(scriptConfig)) {
			if (scriptConfig.length === 0) return 0;
			log.info(`Running ${scriptConfig.length} scripts...`);
			scriptConfig.forEach((script) => this.run(script));
			log.info(`All scripts completed in ${startTime.getMs()}ms`);
			return 0;
		}

		if (this.isLocal && scriptConfig.runLocally === false) {
			log.warn(`Building locally, skipping ${scriptConfig.type} script: ${scriptConfig.src || scriptConfig.command} ${scriptConfig.args ? scriptConfig.args.join(' ') : ''}`);
			return 0;
		} else {
			exitCode = this._runImpl(scriptConfig);
		}

		var completedMessage = `Script completed with return code ${exitCode} in ${startTime.getMs()}ms`;
		if (exitCode !== 0) {
			log.error(completedMessage);
			if (scriptConfig.failOnError) {
				throw new Error(`Script failed! Aborting. Script config: ${JSON.stringify(scriptConfig, null, 2)}`);
			}
		} else {
			log.verbose(completedMessage);
			return exitCode;
		}
	}

	_runImpl(scriptConfig) {
		let exitCode = -100;
		try {
			const args = scriptConfig.args ? scriptConfig.args.slice() : [];
			const options = {stdio:'inherit'};
			if (scriptConfig.cwd) {
				log.verbose('cwd: ' + scriptConfig.cwd);
				options['cwd'] = path.resolve(scriptConfig.cwd);
			}

			switch (scriptConfig.type.toLowerCase()) {
				case 'node': {
					args.unshift(scriptConfig.src);
					log.info(`Executing node script: ${args.join(' ')}`);
					exitCode = childProcess.execFileSync('node', args, options);
					break;
				}
				case 'shell': {
					args.unshift(scriptConfig.src);
					args.unshift('-e');
					log.info(`Executing shell script: ${args.join(' ')}`);
					exitCode = childProcess.execFileSync('sh', args, options);
					break;
				}
				case 'command': {
					log.info(`Executing command: ${scriptConfig.command} ${args.join(' ')}`);
					exitCode = childProcess.execFileSync(scriptConfig.command, args, options);
					break;
				}
				default: {
					log.error(`Unsupported script type: ${scriptConfig.type}`);
					return 1;
				}
			}

			if (!exitCode || exitCode === null)
				exitCode = 0;
		} catch (err) {
			if (err.message)
				log.error(err.message);

			if (err.error)
				log.error(err.error);

			if (err.status)
				exitCode = err.status;
		}

		return exitCode;
	}
}



module.exports = new ScriptRunner();
