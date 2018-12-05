---
title: Styling with LESS and CSS
---

Sitepiler supports both LESS and plain CSS.

## LESS usage

* Put files in style source dir with `.less` file extension 
* Each file gets compiled into a CSS file and placed in the appropriate output location based on the input file's location
* Use `@import url('https://site.com/path/to/style.css');` to import web resources
* Use `@import 'some/subdir/style.less';` to import local resources. Path is absolute or relative to the LESS file being processed.

### Suggested pattern

Configure the style source dir with `recursive: false` and use subdirs in the source dir to house partial LESS/CSS files that will be imported into a LESS file in the root of the source dir. Given the following files with the stated imports:

* sitepiler.less 
	* `@import 'partials/sitepilerBase.less';`
* anotherstyle.less
	* `@import 'partials/sitepilerBase.less';`
* plainstyle.css
* partials/sitepilerBase.less

The following output files will be produced:

* sitepiler.css
* anotherstyle.css
* plainstyle.css
