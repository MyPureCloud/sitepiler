const _ = require('lodash');

const CONTROL_CHAR_REGEX = /^`{3}|~{3}/;
let controlChars = '```';

function getLine(state, line) {
	var pos = state.bMarks[line] + state.blkIndent,
		max = state.eMarks[line];

	return state.src.substr(pos, max - pos);
}

module.exports = function(md, name, options) {
	function fence(state, startLine, endLine, silent) {
		var nextLine, token, lineText;

		// Starts with control chars?
		lineText = getLine(state, startLine);
		const controlCharsMatch = lineText.match(CONTROL_CHAR_REGEX);
		if (!controlCharsMatch) return false;

		// Store which control chars were used
		controlChars = controlCharsMatch[0];

		// Self-closing line, e.g.: ``` this is a code block ```
		if (lineText.trim().endsWith(controlChars) && lineText.trim().length > 6) {
			if (silent) return true;

			// Add code block
			token = state.push('fence', 'code', 0);
			token.attrs = parseAttrs('');
			token.content = lineText.trim().substr(3, lineText.trim().length - 6);

			state.line = startLine + 1;

			return true;
		}

		// Should have at least two lines
		if (startLine + 2 > endLine) {
			return false;
		}
		if (silent) return true;

		// Parse control char attributes
		const attrs = parseAttrs(lineText);

		// Move past the opener line
		nextLine = startLine + 1;
		lineText = getLine(state, nextLine);

		// Add code block
		token = state.push('fence', 'code', 0);
		token.attrs = attrs;
		token.content = '';

		// First line language marker --> #!java
		if (lineText.startsWith('#!')) {
			attrs.language = lineText.substring(2).trim();
			startLine++;
			nextLine++;
			lineText = getLine(state, nextLine);
		}

		// Trim empty lines at beginning
		while (lineText.trim() === '') {
			startLine++;
			nextLine++;
			lineText = getLine(state, nextLine);
		}

		// Add content until end marker is reached
		let emptyLines = '';
		while (!lineText.startsWith(controlChars) && nextLine <= endLine) {
			// Trim escaped control chars
			if (lineText.startsWith(`\\${controlChars}`)) lineText = lineText.substr(1);

			if (lineText.trim() === '') {
				emptyLines += '\n';
			} else {
				token.content += emptyLines + lineText + '\n';
				emptyLines = '';
			}

			nextLine++;
			lineText = getLine(state, nextLine);
		}

		// Set next line in the state
		state.line = nextLine + 1;
		token.map = [startLine, state.line];

		return true;
	}

	function parseAttrs(lineText) {
		if (!lineText || lineText.length < 5) return {};

		let attrs = {};
		let text = lineText.substr(3).trim();
		if (text.startsWith('{')) {
			attrs = JSON.parse(text);
		} else {
			attrs.language = text;
		}

		return attrs;
	}

	function fenceRenderer(tokens, idx, _options, env, slf) {
		const token = tokens[idx];

		let content = token.content;
		let title = token.attrs.title || undefined;
		let language = token.attrs.language || 'nohighlight';
		let maxHeight = token.attrs.maxHeight || '550px';
		let autoCollapse = token.attrs.autoCollapse;
		let showLineNumbers = token.attrs.showLineNumbers;

		if (token.attrs.tabsToSpaces) {
			let spaces = '';
			for (let i = 0; i < token.attrs.tabsToSpaces; i++) {
				spaces += ' ';
			}
			content = content.replace(/\t/gi, spaces);
		}

		return `<p>
	<div class="card fence">
		${title ? `<h5 class="card-header fence-header">${title}</h5>` : ''}
	  <div class="card-body fence-body" style="${autoCollapse ? ' display: none;' : ''} ${maxHeight ? ` max-height: ${maxHeight}` : ''}"${maxHeight ? ` data-maxHeight="${maxHeight}"` : ''}>
	    <pre class="${showLineNumbers ? ' line-numbers' : ''}"><code class="language-${language}">${_.escape(content)}</code></pre>
	  </div>
	</div>
</p>`;
	}

	// Overwrite fence rule
	md.block.ruler.at('fence', fence, {
		alt: ['paragraph', 'reference', 'blockquote', 'list']
	});

	// Set renderer
	md.renderer.rules['fence'] = fenceRenderer;
};
