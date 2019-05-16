---
title: Code Fences
---

The extended fences plugin allows for fancy syntax-highlighted code blocks.

:::toc:::

## Fence Options

Use three backticks to open and close a fence. The opening backticks support either a [language name](https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html#language-names-and-aliases) or a JSON configuration object on the same line directly following the backticks. The following options are supported:

| Option | Example | Description |
|--------|---------|-------------|
| title | Some Code | Displays a header before the code block with the given title |
| maxHeight | 100px | Sets the `max-height` CSS property, must include units. Create a CSS rule in the stylesheet for `.fence .fence-body pre { max-height: 500px; }` to set a global default. | 
| autoCollapse | true | When `true`, the element will be displayed in its collapsed state initially. Default: `false` |
| language | json | Syntax highlighting language. Default: `nohighlight`. See [Language names and aliases](https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html#language-names-and-aliases). Use the values in the right column. |
| showLineNumbers | true | When `true`, line numbers will be displayed in the fence |
| tabsToSpaces | 2 | When specified, replaces all tab characters in the content with the specified number of spaces. |
{: class="table-striped"}

## Examples

### Vanilla markdown

This is the standard markdown code fence. Code highlighting is disabled by default.

```
\```
// Code goes here
\```
```

### Language only

Provide a language for the code block.

```
\```java
// Code goes here
String str = "my string";
\```
```

### Configuration Object

Specify configuration options as a JSON object.

``` { "title":"Test Heading", "maxHeight": "30px", "autoCollapse": true, "language": "json", "tabsToSpaces": 2 }
\``` { "title":"Test Heading", "maxHeight": "30px", "autoCollapse": true, "language": "json", "tabsToSpaces": 2 }
// Code goes here
\```
```


## More examples

### All config options specified

``` { "title":"Test Heading", "maxHeight": "70px", "autoCollapse": true, "language": "json", "tabsToSpaces": 2, "showLineNumbers": true }
{
  "key": "value",
	"array": [
		"value"
	],
	"object": {
    "key": "value"
	}
}
```

### Plain ol' title

``` Language unspecified
const rp = require('request-promise');

rp('http://www.google.com')
  .then(function (htmlString) {
    // Process html...
  })
  .catch(function (err) {
    // Crawling failed...
  });
```

### Title and language

``` { "title": "JavaScript", "language": "javascript"}
const rp = require('request-promise');

rp('http://www.google.com')
  .then(function (htmlString) {
    // Process html...
  })
  .catch(function (err) {
    // Crawling failed...
  });
```

### No title, highlighting turned off

``` { "language": "nohighlight" }
let thisCode = "not highlighted";

## Markdown just displays unrendered

* No
* Lists

or `inline` code
```
