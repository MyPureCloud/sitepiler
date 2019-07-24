function Logger(topic) {
	this.topic = topic;
}

Logger.prototype.setLogLevel = function() {
	// Don't care
};

Logger.prototype.setUseColor = function() {
	// Don't care
};

Logger.prototype.silly = function(msg, data) { console.log(this.formatMessage(msg, data)); };
Logger.prototype.debug = function(msg, data) { console.log(this.formatMessage(msg, data)); };
Logger.prototype.verbose = function(msg, data) { console.log(this.formatMessage(msg, data)); };
Logger.prototype.info = function(msg, data) { console.log(this.formatMessage(msg, data)); };
Logger.prototype.warn = function(msg, data) { console.log(this.formatMessage(msg, data)); };
Logger.prototype.error = function(msg, data) { console.log(this.formatMessage(msg, data)); };

Logger.prototype.profile = function() {
	// Don't care
};

Logger.prototype.formatMessage = function(msg, data) {
	var trace = '';
	if (msg && msg instanceof Error) {
		trace += msg.stack;
	} else if (msg && typeof(msg) === 'object') {
		trace += JSON.stringify(msg, censor(msg) ,2);
	}	else {
		trace += msg;
		if (data && typeof(data) === 'object') {
			trace += ' ' + simpleStringify(data);
		} else if (data) {
			trace += data;
		}
	}

	return trace;
};

Logger.prototype.writeBoxedLine = function(string, width, padchar) {
	if (!width) width = this.defaultWidth;
	if (!padchar) padchar = ' ';
	var cWidth = width - 4;
	var words = string.split(' ');
	var rows = [];
	var c = 0;
	words.forEach(function(word) {
		if (!rows[c]) rows[c] = '';
		if (rows[c].length + word.length + 1 > cWidth) {
			c++;
			rows[c] = '';
		}
		rows[c] += word + ' ';
	});

	rows.forEach(function(row) {
		console.log(`║ ${pad(row.trimRight(), cWidth, padchar)} ║`);
	});
};

Logger.prototype.writeBoxTop = function(width) {
	if (!width) width = this.defaultWidth;
	console.log(`╔${pad('', width - 2, '═')}╗`);
};

Logger.prototype.writeBoxSeparator = function(width) {
	if (!width) width = this.defaultWidth;
	console.log(`╟${pad('', width - 2, '─')}╢`);
};

Logger.prototype.writeBoxBottom = function(width) {
	if (!width) width = this.defaultWidth;
	console.log(`╚${pad('', width - 2, '═')}╝`);
};

Logger.prototype.writeBox = function(string, width, level) {
	var self = this;

	// Find width
	var strings = string.split('\n');
	var maxWidth = strings.reduce(function (a, b) { return a.length > b.length ? a : b; }).length;
	if (!width)
		width = maxWidth > this.defaultWidth ? this.defaultWidth : maxWidth + 5;

	// default boxes to info
	level = level ? level : 'info';

	// Write box
	this.writeBoxTop(width, level);
	strings.forEach(function(str) {
		self.writeBoxedLine(str, width, null, level);	
	});
	this.writeBoxBottom(width, level);
};

function pad(value, length, padchar) {
	return (value.toString().length < length) ? pad(value+padchar, length, padchar):value;
}

// Inspired by https://stackoverflow.com/questions/4816099/chrome-sendrequest-error-typeerror-converting-circular-structure-to-json/4816258
function simpleStringify (object) {
	var simpleObject = {};
	for (var prop in object) {
		if (!object.hasOwnProperty(prop) ||
			typeof(object[prop]) === 'function') {
			continue;
		}
		simpleObject[prop] = object[prop];
	}
	return JSON.stringify(simpleObject, censor(simpleObject),2);
}

function censor(censor) {
	var i = 0;
	var lastValue;

	return function(key, value) {

		if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
			return '[Circular]'; 

		if(i >= 27) { 
			// seems to be a harded maximum of 30 serialized objects?
			return '[Unknown]';
		}

		// Increment if we're looping, otherwise reset
		if (lastValue !== value) {
			lastValue = value;
			i = 0;
		} else {
			++i; // so we know we aren't using the original object anymore
		}

		return value;  
	};
}

module.exports = Logger;
