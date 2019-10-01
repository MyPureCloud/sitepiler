// Retrieved from https://github.com/markdown-it/markdown-it/blob/c57f593b2395df0e12c1d7fb8c9cebb3f3920ff3/lib/rules_block/heading.js
// Retrieved date: 11/9/2018

function isSpace(code) {
	switch (code) {
		case 0x09:
		case 0x20:
			return true;
	}
	return false;
}

module.exports = function(md, name, options) {
	function heading(state, startLine, endLine, silent) {
		var ch,
			level,
			tmp,
			token,
			pos = state.bMarks[startLine] + state.tShift[startLine],
			max = state.eMarks[startLine];

		// if it's indented more than 3 spaces, it should be a code block
		if (state.sCount[startLine] - state.blkIndent >= 4) {
			return false;
		}

		ch = state.src.charCodeAt(pos);

		if (ch !== 0x23 /* # */ || pos >= max) {
			return false;
		}

		// count heading level
		level = 1;
		ch = state.src.charCodeAt(++pos);
		while (ch === 0x23 /* # */ && pos < max && level <= 6) {
			level++;
			ch = state.src.charCodeAt(++pos);
		}

		// Original logic
		// if (level > 6 || (pos < max && !isSpace(ch))) { return false; }
		// Add support for no spaces between octothorpes and text
		if (level > 6) {
			return false;
		}

		if (silent) {
			return true;
		}

		// Let's cut tails like '    ###  ' from the end of string
		while (isSpace(state.src.charCodeAt(max - 1)) || state.src.charCodeAt(max - 1) === 0x23) {
			max--;
		}

		state.line = startLine + 1;

		token = state.push('heading_open', 'h' + String(level), 1);
		token.markup = '########'.slice(0, level);
		token.map = [startLine, state.line];

		token = state.push('inline', '', 0);
		token.content = state.src.slice(pos, max).trim();
		token.map = [startLine, state.line];
		token.children = [];

		token = state.push('heading_close', 'h' + String(level), -1);
		token.markup = '########'.slice(0, level);

		return true;
	}

	function headingOpenRenderer(tokens, idx, _options, env, slf) {
		const token = tokens[idx];
		let anchorName = tokens[idx + 1].content || '';
		anchorName = anchorName
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]/gi, '_');
		return `<a href="#${anchorName}" name="${anchorName}" class="toc-link toc-link-${token.tag}"><${token.tag}>`;
	}

	function headingCloseRenderer(tokens, idx, _options, env, slf) {
		const token = tokens[idx];
		return `<span class="oi toc-link-icon" data-glyph="link-intact"></span></${token.tag}></a>`;
	}

	// Overwrite heading rule
	md.block.ruler.at('heading', heading, {
		alt: ['paragraph', 'reference', 'blockquote']
	});

	md.renderer.rules['heading_open'] = headingOpenRenderer;
	md.renderer.rules['heading_close'] = headingCloseRenderer;
};
