const moment = require('moment-timezone');

class Timer {
	constructor() {
		this.startTime = moment();
	}

	getMs() {
		return moment.duration(moment().diff(this.startTime)).asMilliseconds();
	}

	getDisplay() {
		return moment.duration(moment().diff(this.startTime)).humanize();
	}

	static start() {
		return new Timer();
	}
}

module.exports = Timer;
