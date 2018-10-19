// Retrieved from https://github.com/markdown-it/markdown-it/blob/d29f421927e93e88daf75f22089a3e732e195bd2/lib/rules_block/table.js
// Retrieved date: 10/19/2018

// GFM table, non-standard

'use strict';

function isSpace(code) {
	switch (code) {
		case 0x09:
		case 0x20:
			return true;
	}
	return false;
}


function getLine(state, line) {
	var pos = state.bMarks[line] + state.blkIndent,
		max = state.eMarks[line];

	return state.src.substr(pos, max - pos);
}

function escapedSplit(str) {
	var result = [],
		pos = 0,
		max = str.length,
		ch,
		escapes = 0,
		lastPos = 0,
		backTicked = false,
		lastBackTick = 0;

	ch  = str.charCodeAt(pos);

	while (pos < max) {
		if (ch === 0x60/* ` */) {
			if (backTicked) {
				// make \` close code sequence, but not open it;
				// the reason is: `\` is correct code block
				backTicked = false;
				lastBackTick = pos;
			} else if (escapes % 2 === 0) {
				backTicked = true;
				lastBackTick = pos;
			}
		} else if (ch === 0x7c/* | */ && (escapes % 2 === 0) && !backTicked) {
			result.push(str.substring(lastPos, pos));
			lastPos = pos + 1;
		}

		if (ch === 0x5c/* \ */) {
			escapes++;
		} else {
			escapes = 0;
		}

		pos++;

		// If there was an un-closed backtick, go back to just after
		// the last backtick, but as if it was a normal character
		if (pos === max && backTicked) {
			backTicked = false;
			pos = lastBackTick + 1;
		}

		ch = str.charCodeAt(pos);
	}

	result.push(str.substring(lastPos));

	return result;
}


module.exports = function table(state, startLine, endLine, silent) {
	var ch, lineText, pos, i, nextLine, columns, columnCount, token,
		aligns, t, tableLines, tbodyLines;

	// should have at least two lines
	if (startLine + 2 > endLine) { return false; }

	nextLine = startLine + 1;

	if (state.sCount[nextLine] < state.blkIndent) { return false; }

	// if it's indented more than 3 spaces, it should be a code block
	if (state.sCount[nextLine] - state.blkIndent >= 4) { return false; }

	// first character of the second line should be '|', '-', ':',
	// and no other characters are allowed but spaces;
	// basically, this is the equivalent of /^[-:|][-:|\s]*$/ regexp

	pos = state.bMarks[nextLine] + state.tShift[nextLine];
	if (pos >= state.eMarks[nextLine]) { return false; }

	ch = state.src.charCodeAt(pos++);
	if (ch !== 0x7C/* | */ && ch !== 0x2D/* - */ && ch !== 0x3A/* : */) { return false; }

	while (pos < state.eMarks[nextLine]) {
		ch = state.src.charCodeAt(pos);

		if (ch !== 0x7C/* | */ && ch !== 0x2D/* - */ && ch !== 0x3A/* : */ && !isSpace(ch)) { return false; }

		pos++;
	}

	lineText = getLine(state, startLine + 1);

	columns = lineText.split('|');
	aligns = [];
	for (i = 0; i < columns.length; i++) {
		t = columns[i].trim();
		if (!t) {
			// allow empty columns before and after table, but not in between columns;
			// e.g. allow ` |---| `, disallow ` ---||--- `
			if (i === 0 || i === columns.length - 1) {
				continue;
			} else {
				return false;
			}
		}

		if (!/^:?-+:?$/.test(t)) { return false; }
		if (t.charCodeAt(t.length - 1) === 0x3A/* : */) {
			aligns.push(t.charCodeAt(0) === 0x3A/* : */ ? 'center' : 'right');
		} else if (t.charCodeAt(0) === 0x3A/* : */) {
			aligns.push('left');
		} else {
			aligns.push('');
		}
	}

	lineText = getLine(state, startLine).trim();
	if (lineText.indexOf('|') === -1) { return false; }
	if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }
	columns = escapedSplit(lineText.replace(/^\||\|$/g, ''));

	// header row will define an amount of columns in the entire table,
	// and align row shouldn't be smaller than that (the rest of the rows can)
	columnCount = columns.length;
	if (columnCount > aligns.length) { return false; }

	if (silent) { return true; }

	// Saving references to these objects to be updated below
	const tableToken     = state.push('table_open', 'table', 1);
	tableToken.map = tableLines = [ startLine, 0 ];
	const tableClass = [ 'class', 'table'];
	tableToken.attrs = [ 
		tableClass
	];

	token     = state.push('thead_open', 'thead', 1);
	token.map = [ startLine, startLine + 1 ];

	token     = state.push('tr_open', 'tr', 1);
	token.map = [ startLine, startLine + 1 ];

	for (i = 0; i < columns.length; i++) {
		token          = state.push('th_open', 'th', 1);
		token.map      = [ startLine, startLine + 1 ];
		if (aligns[i]) {
			token.attrs  = [ [ 'style', 'text-align:' + aligns[i] ] ];
		}

		token          = state.push('inline', '', 0);
		token.content  = columns[i].trim();
		token.map      = [ startLine, startLine + 1 ];
		token.children = [];

		token          = state.push('th_close', 'th', -1);
	}

	token     = state.push('tr_close', 'tr', -1);
	token     = state.push('thead_close', 'thead', -1);

	token     = state.push('tbody_open', 'tbody', 1);
	token.map = tbodyLines = [ startLine + 2, 0 ];

	// Process lines
	let cellContent = new Array(columnCount);
	let isMultiline = false;
	for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
		if (state.sCount[nextLine] < state.blkIndent) { break; }

		lineText = getLine(state, nextLine).trim();
		if (lineText.indexOf('|') === -1) { break; }
		if (state.sCount[nextLine] - state.blkIndent >= 4) { break; }
		columns = escapedSplit(lineText.replace(/^\||\|$/g, ''));

		// Create new row and clear content var
		if (!isMultiline) {
			token = state.push('tr_open', 'tr', 1);
			cellContent = new Array(columnCount);
		}

		// Process columns
		let colspan = 0;
		for (i = 0; i < columnCount; i++) {
			// Create <td> when not spanning
			if (colspan === 0 && !isMultiline) {
				token = state.push('td_open', 'td', 1);
				token.attrs = [];
			}

			// Apply alignment style
			if (aligns[i] && colspan === 0) {
				token.attrs.push([ 'style', 'text-align:' + aligns[i] ]);
			}

			// Set/append content
			if (!isMultiline) {
				// Create new element
				cellContent[i]          = state.push('inline', '', 0);
				cellContent[i].content  = '';
				cellContent[i].children = [];
			} 
			// Append content to previous element
			let cellText = columns[i];
			if (cellText) {
				cellText = cellText.trim();
				if (cellText.endsWith('\\'))
					cellText = cellText.substring(0, cellText.length - 1);
			}
			cellContent[i].content += cellText ? cellText + '<br />' : '';

			// Close <td> or span again
			if (i + 1 < columnCount && columns[i+1] === '') {
				colspan++;
			}	else {
				if (colspan > 0) {
					token.attrs.push([ 'colspan', colspan + 1 ]);
				}
				colspan = 0;

				// Suppress </td> when processing multi-line. Content will be added to previous <td>
				if (!isMultiline)
					token = state.push('td_close', 'td', -1);
			}
		}

		// End row or not
		if (columns[columnCount - 1].trim().endsWith('\\')) {
			isMultiline = true;
		} else {
			isMultiline = false;
			token = state.push('tr_close', 'tr', -1);
		}
	}

	token = state.push('tbody_close', 'tbody', -1);
	token = state.push('table_close', 'table', -1);

	// This code adds striping to the table if the next line after the table is {: class="table table-striped"}
	lineText = getLine(state, nextLine).trim();
	if (lineText === '{: class="table table-striped"}') {
		tableClass[1] += ' table-striped';
		token = state.push('inline', '', 0);
		token.content = '';
		token.children = [];
		nextLine++;
	}

	tableLines[1] = tbodyLines[1] = nextLine;
	state.line = nextLine;
	return true;
};
