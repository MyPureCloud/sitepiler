'use strict';

const CONTROL_CHARS = '```';

function getLine(state, line) {
	var pos = state.bMarks[line] + state.blkIndent,
		max = state.eMarks[line];

	return state.src.substr(pos, max - pos);
}

module.exports = function(md, name, options) {
	function fence(state, startLine, endLine/*, silent*/) {
		var nextLine, token, lineText;

		// should have at least two lines
		if (startLine + 2 > endLine) { return false; }

		// Starts with opener?
		lineText = getLine(state, startLine);
		if (!lineText.startsWith(CONTROL_CHARS)) return false;

		const attrs = parseAttrs(lineText);

		// Move past the opener line
		nextLine = startLine + 1;
		lineText = getLine(state, nextLine);

		token = state.push('fence', 'code', 0);
		token.attrs = attrs;
		token.content = '';

		// Add content until end marker is reached
		while(!lineText.startsWith(CONTROL_CHARS) && nextLine <= endLine) {
			// Trim escaped control chars
			if (lineText.startsWith(`\\${CONTROL_CHARS}`))
				lineText = lineText.substr(1);

			token.content += lineText + '\n';

			nextLine++;
			lineText = getLine(state, nextLine);
		}

		// Set the next line to after the fence close line
		state.line = nextLine + 1;

		return true;
	}

	function parseAttrs(lineText) {
		if (!lineText || lineText.length < 5) return {};

		let attrs = {};
		let text = lineText.substr(3).trim();
		if (text.startsWith('{')) {
			attrs = JSON.parse(text);
		} else {
			attrs.title = text;
		}

		return attrs;
	}

	function fenceRenderer(tokens, idx, _options, env, slf) {
		const token = tokens[idx];

		let content = token.content;
		let title = token.attrs.title ? `<h5 class="card-header fence-header">${token.attrs.title}</h5>` : '';
		let language = token.attrs.language ? ` class="lang-${token.attrs.language}"` : '';
		let maxHeight = token.attrs.maxHeight ? ` style="max-height: ${token.attrs.maxHeight} !important"` : '';
		let autoCollapse = token.attrs.autoCollapse === true ? ' style="display: none"' : '';

		if (token.attrs.tabsToSpaces) {
			let spaces = '';
			for (let i=0; i < token.attrs.tabsToSpaces; i++ ) {
				spaces += ' ';
			}
			content = content.replace(/\t/gi, spaces);
		}

		return `<p>
	<div class="card fence">
  	${title}
	  <div class="card-body fence-body"${autoCollapse}>
	    <pre${maxHeight}><code${language}>${content}</code></pre>
	  </div>
	</div>
</p>`;
	}

	// Overwrite fence rule
	md.block.ruler.at('fence', fence, {
		alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
	});

	// Set renderer
	md.renderer.rules['fence'] = fenceRenderer;
};
