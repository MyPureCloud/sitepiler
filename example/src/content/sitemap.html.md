---
title: Sitemap
---

{{## def.printPages = (context, sitemap, output = '') => {
	context._.forOwn(sitemap.pages, (page) => output += `* [${context.path.join(page.path, page.filename)}](${context.path.join(page.path, page.filename)} (${page.title}))\n`);
	context._.forOwn(sitemap.dirs, (value, key) => output = context.printPages(context, value, output));
	return output;
}
#}}

{{= context.printPages(context, context.sitemap) }}
