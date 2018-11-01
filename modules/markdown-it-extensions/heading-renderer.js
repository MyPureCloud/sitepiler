'use strict';

module.exports = function(md, name, options) {
	md.renderer.rules['heading_open'] = headingOpenRenderer;
	md.renderer.rules['heading_close'] = headingCloseRenderer;

	function headingOpenRenderer(tokens, idx, _options, env, slf) {
		const token = tokens[idx];
		let anchorName = tokens[idx+1].content || '';
		anchorName = anchorName.toLowerCase().trim().replace(/\s/g, '');
		return `<a href="#${anchorName}" name="${anchorName}" class="toc-link toc-link-${token.tag}"><${token.tag}>`;
	}

	function headingCloseRenderer(tokens, idx, _options, env, slf) {
		const token = tokens[idx];
		return `<span class="oi toc-link-icon" data-glyph="link-intact"></span></${token.tag}></a>`;
	}
};
