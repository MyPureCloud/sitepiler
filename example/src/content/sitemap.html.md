---
title: Sitemap
---

Check out this page's [source code](https://github.com/purecloudlabs/sitepiler/blob/master/example/src/content/sitemap.html.md) to see how to generate this sitemap dynamically!

{{ 
function printPages(sitemap, levels, indent = 0) {
	if (levels < 1) return;
	context._.forOwn(sitemap.pages, (page) => { 
		if (page.filename === 'index.html') return;
		for (i=0; i<indent; i++) {
			}}  {{
		}
		}}* [{{= page.title}}]({{= encodeURI(page.link) }})
{{
	});

	context._.forOwn(sitemap.dirs, (dir) => {
		for (i=0; i<indent; i++) {
			}}  {{
		}
		}}* [{{= dir.indexPage.title}}]({{= encodeURI(dir.indexPage.link) }})
{{
		printPages(dir, levels - 1, indent + 1);
	});
}

printPages(context.getRelativeSitemap(), 3);
}}
