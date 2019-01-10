---
title: Code Fences and Alert Blocks
---

The extended fences plugin allows for fancy syntax-highlighted code blocks.

:::toc:::

## Fence Options

Use three backticks to open and close a fence. The opening colons support either a title or a JSON configuration object on the same line directly following the colons. The following options are supported:

| Option | Example | Description |
|--------|---------|-------------|
| title | Some Code | Displays a header before the code block with the given title |
| maxHeight | 100px | Sets the `max-height` CSS property, must include units. Create a CSS rule in the stylesheet for `.fence .fence-body pre { max-height: 500px; }` to set a global default. | 
| autoCollapse | true | When `true`, the element will be displayed in its collapsed state initially. Default: `false` |
| language | json | Syntax highlighting language. Default: `nohighlight`. See [Language names and aliases](https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html#language-names-and-aliases). Use the values in the right column. |
| tabsToSpaces | 2 | When specified, replaces all tab characters in the content with the specified number of spaces. |
| alert | primary | When specified, the code fence does not use code formatting and displays as a styled alert instead. Valid types: `vanilla`, `primary`, `secondary`, `success`, `danger`, `warning`, `info`, `light`, `dark`. |
{: class="table-striped"}

## Examples

### Vanilla markdown

This is the standard markdown code fence. Code highlighting is disabled by default.

```
\```
// Code goes here
\```
```

### Title only

Provide a title for the code block.

``` Some Title Text
\``` Some Title Text
// Code goes here
\```
```

### Configuration Object

Specify configuration options as a JSON object.

``` { "title":"Test Heading", "maxHeight": "30px", "autoCollapse": true, "language": "json", "tabsToSpaces": 2 }
\``` { "title":"Test Heading", "maxHeight": "30px", "autoCollapse": true, "language": "json", "tabsToSpaces": 2 }
// Code goes here
\```
```

### Alerts

Alerts don't use the `<pre>` or `<code>` tags and are styled based on [Bootstrap Alerts](https://getbootstrap.com/docs/4.0/components/alerts/). See [Alert Examples](#alertexamples) for all alert types. 

```{"title":"Alert Title","alert":"primary"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```



## More examples

### All config options specified

``` { "title":"Test Heading", "maxHeight": "70px", "autoCollapse": true, "language": "json", "tabsToSpaces": 2 }
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

### Alert Examples

```{"title":"Vanilla","alert":"vanilla"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Primary","alert":"primary"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Secondary","alert":"secondary"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Success","alert":"success"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Danger","alert":"danger"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Warning","alert":"warning"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Info","alert":"info"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Light","alert":"light"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```

```{"title":"Dark","alert":"dark"}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
```
