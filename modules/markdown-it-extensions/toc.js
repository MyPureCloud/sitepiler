'use strict';

function getLine(state, line) {
	var pos = state.bMarks[line] + state.blkIndent,
		max = state.eMarks[line];

	return state.src.substr(pos, max - pos);
}

module.exports = function(md, name, options) {
	function toc(state, startLine, endLine/*, silent*/) {
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
		token.attrs = [ [ 'class', 'toc-list' ] ];

		// Add content until end marker is reached
		let isCodeBlock = false;
		while(nextLine <= endLine) {
			if (lineText) {
				let isCodeBlockMarkup = (lineText.startsWith('```') || lineText.startsWith('~~~'));
				if (!isCodeBlock && isCodeBlockMarkup)
					isCodeBlock = true;
				else if (isCodeBlock && isCodeBlockMarkup)
					isCodeBlock = false;

				if (!isCodeBlock) {
					// Regex match all markdown headings (e.g. ### Heading Three)
					let headingMatch = lineText.match(/^(#+)\s*(.+)/);
					if (headingMatch) {

						// Open list item
						token = state.push('list_item_open', 'li', 1);
						token.attrs = [ [ 'class', `toc-list-${headingMatch[1].length}` ] ];

						// Add content
						token = state.push('inline', '', 0);
						token.content = `<a href="#${headingMatch[2].toLowerCase().trim().replace(/[^a-z0-9]/gi, '_')}">${headingMatch[2]}</a>`;
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
