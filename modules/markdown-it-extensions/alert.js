// Based on markdown-it-container 2.0.0 https://github.com//markdown-it/markdown-it-container @license MIT
// Retrieved date: 3/27/2019

module.exports = function container_plugin(md, name, options) {
	function renderOpen(tokens, idx, _options, env, self) {
		let alertType = tokens[idx].attrs.alert;

		// Apply alert class aliases
		switch (alertType.toLowerCase()) {
			case 'error': {
				alertType = 'danger';
				break;
			}
		}

		return `<p>
	<div class="card fence">
	  <div class="card-body fence-body">
	    <div class="alert alert-${alertType}" role="alert">`;
	}

	function renderClose(tokens, idx, _options, env, self) {
		return `	    </div>
	  </div>
	</div>
</p>`;
	}

	options = options || {};

	var min_markers = 3,
		marker_str  = options.marker || ':',
		marker_char = marker_str.charCodeAt(0),
		marker_len  = marker_str.length;

	function container(state, startLine, endLine, silent) {

		var pos, nextLine, marker_count, markup, params, token,
			old_parent, old_line_max,
			auto_closed = false,
			start = state.bMarks[startLine] + state.tShift[startLine],
			max = state.eMarks[startLine];

		// Check out the first character quickly,
		// this should filter out most of non-containers
		if (marker_char !== state.src.charCodeAt(start)) { return false; }

		// Check out the rest of the marker string
		for (pos = start + 1; pos <= max; pos++) {
			if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
				break;
			}
		}

		marker_count = Math.floor((pos - start) / marker_len);
		if (marker_count < min_markers) { return false; }
		pos -= (pos - start) % marker_len;

		markup = state.src.slice(start, pos);
		params = state.src.slice(pos, max);

		// Since start is found, we can report success here in validation mode
		if (silent) { return true; }

		// Search for the end of the block
		nextLine = startLine;

		for (;;) {
			nextLine++;
			if (nextLine >= endLine) {
				// unclosed block should be autoclosed by end of document.
				// also block seems to be autoclosed by end of parent
				break;
			}

			start = state.bMarks[nextLine] + state.tShift[nextLine];
			max = state.eMarks[nextLine];

			if (start < max && state.sCount[nextLine] < state.blkIndent) {
				// non-empty line with negative indent should stop the list:
				// - ```
				//  test
				break;
			}

			if (marker_char !== state.src.charCodeAt(start)) { continue; }

			if (state.sCount[nextLine] - state.blkIndent >= 4) {
				// closing fence should be indented less than 4 spaces
				continue;
			}

			for (pos = start + 1; pos <= max; pos++) {
				if (marker_str[(pos - start) % marker_len] !== state.src[pos]) {
					break;
				}
			}

			// closing code fence must be at least as long as the opening one
			if (Math.floor((pos - start) / marker_len) < marker_count) { continue; }

			// make sure tail has spaces only
			pos -= (pos - start) % marker_len;
			pos = state.skipSpaces(pos);

			if (pos < max) { continue; }

			// found!
			auto_closed = true;
			break;
		}

		old_parent = state.parentType;
		old_line_max = state.lineMax;
		state.parentType = 'container';

		// this will prevent lazy continuations from ever going past our end marker
		state.lineMax = nextLine;

		// Add open token
		token        = state.push('alert_open', 'div', 1);
		token.markup = markup;
		token.block  = true;
		token.info   = params;
		token.map    = [ startLine, nextLine ];
		token.attrs = {
			alert: params.trim().toLowerCase()
		};

		// This is the magic that makes the content render. 
		state.md.block.tokenize(state, startLine + 1, nextLine);

		// Add close token
		token        = state.push('alert_close', 'div', -1);
		token.markup = state.src.slice(start, pos);
		token.block  = true;

		// Update state
		state.parentType = old_parent;
		state.lineMax = old_line_max;
		state.line = nextLine + (auto_closed ? 1 : 0);

		return true;
	}

	// Register extension
	md.block.ruler.before('fence', 'container_' + name, container, {
		alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
	});
	md.renderer.rules['alert_open'] = renderOpen;
	md.renderer.rules['alert_close'] = renderClose;
};