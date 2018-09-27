---
title: Sitemap
---

This page demonstrates generating a custom sitemap.

{{## def.printSitemap = (context, sitemap, output = '') => {
	sitemap.pages.forEach((page) => output += `* [${context.path.join(page.path, page.filename)}](${context.path.join(page.path, page.filename)} (${page.title}))\n`);
	context._.forOwn(sitemap.dirs, (value, key) => output = context.printSitemap(context, value, output));
	return output;
}
#}}

{{= context.printSitemap(context, context.sitemap) }}
