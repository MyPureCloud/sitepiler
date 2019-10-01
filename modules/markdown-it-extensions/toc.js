'use strict';

function getLine(state, line) {
	var pos = state.bMarks[line] + state.blkIndent,
		max = state.eMarks[line];

	return state.src.substr(pos, max - pos);
}

function isSpace(code) {
	switch (code) {
		case 0x09:
		case 0x20:
			return true;
	}
	return false;
}

module.exports = function(md, name, options) {
	function toc(state, startLine, endLine /*, silent*/) {
		var nextLine, token, lineText;

		// Is TOC?
		// Format: [toc] or :::toc:::
		lineText = getLine(state, startLine);
		if (!lineText.match(/^\s*(?::::|\[)toc(?::::|\])\s*$/i)) return false;

		// Move past the :::TOC::: line
		nextLine = startLine + 1;
		state.line = nextLine;
		lineText = getLine(state, nextLine);

		// Open list
		token = state.push('bullet_list_open', 'ul', 1);
		token.attrs = [['class', 'toc-list']];

		// Add content until end marker is reached
		let isCodeBlock = false;
		while (nextLine <= endLine) {
			if (lineText) {
				let isCodeBlockMarkup = lineText.startsWith('```') || lineText.startsWith('~~~');
				if (!isCodeBlock && isCodeBlockMarkup) isCodeBlock = true;
				else if (isCodeBlock && isCodeBlockMarkup) isCodeBlock = false;

				if (!isCodeBlock) {
					// Regex match all markdown headings (e.g. ### Heading Three)
					let headingMatch = lineText.match(/^(#+)\s*(.+)/);
					if (headingMatch) {
						// Open list item
						token = state.push('list_item_open', 'li', 1);
						token.attrs = [['class', `toc-list-${headingMatch[1].length}`]];

						// Trim heading text
						let headingText = headingMatch[2];
						while (isSpace(headingText.charCodeAt(headingText.length - 1)) || headingText.charCodeAt(headingText.length - 1) === 0x23) {
							headingText = headingText.substr(0, headingText.length - 1);
						}

						// Add content
						token = state.push('inline', '', 0);
						token.content = `<a href="#${headingText
							.toLowerCase()
							.trim()
							.replace(/[^a-z0-9]/gi, '_')}">${headingText}</a>`;
						token.children = [];

						// Close list item
						token = state.push('list_item_close', 'li', -1);
					}
				}
			}

			nextLine++;
			lineText = getLine(state, nextLine);
		}

		// Close list
		token = state.push('bullet_list_close', 'ul', -1);

		return true;
	}

	// Add rule first
	md.block.ruler.before('table', 'toc', toc);
};
