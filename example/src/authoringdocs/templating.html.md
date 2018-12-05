---
title: Templating
---

:::toc:::

## Basic Syntax

### Displaying a value

Use `{{= context.data }}` to output the value of the expression.

### Running arbitrary JavaScript

Use `{{ console.log('Hello World!'); }}` to execute arbitrary JavaScript code. Can be multi-line and must use semicolons.

#### Example: advanced looping using lodash

View the source of this page to see the code that generates the following list:

{{ context._.forOwn({ "key1": "value1", "key2": "value2"}, (value, key) => { }}
* {{= key }} -> {{= value }} {{ }); }}


## Built-in Template Functions

### include('partialname')

Using `{{= context.include('partialname') }}` will render the named partial. Additional parameters beyond the first are placed into an array and the array is provided to the included page as `context.additionalContext`. The included page would access the first additional parameter using `context.additionalContext[0]`.
