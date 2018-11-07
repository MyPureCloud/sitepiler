module.exports = function(md, name, options) {
	// Default to matching everything to disable opening links externally
	const INTERNAL_LINK_REGEX = options || /^/;

	md.renderer.rules['link_open'] = linkOpenRenderer;
	md.renderer.rules['link_close'] = linkCloseRenderer;

	function linkOpenRenderer(tokens, idx, _options, env, slf) {
		const token = tokens[idx];
		const href = getAttr(token.attrs, 'href');
		let isExternal = !href.match(INTERNAL_LINK_REGEX);
		return `<a href="${href}"${isExternal ? ' target="_blank"' : ''}>`;
	}

	function linkCloseRenderer(tokens, idx, _options, env, slf) {
		return '</a>';
	}

	function getAttr(attrs, name) {
		let value;
		attrs.some((attr) => {
			if (attr[0] === name) {
				value = attr[1];
				return true;
			}
		});
		return value || '';
	}
};