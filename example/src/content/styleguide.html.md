---
title: Style Guide
---

---

TODO: Create a guide covering how to write content. This page will be documentation.

* Markdown guide
	* Good info: https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet
* templating
* custom functions

---


# Markdown Reference

# H1
## H2
### H3
#### H4
##### H5
###### H6

more stuff

* list
* items
* more


# Templating Guide

Use `{{= context.data }}` to output stuff
Use `{{ testing }}` to output stuff


## Built-in Template Functions

### include('partialname')

Using `{{= context.include('partialname') }}` will render the named partial
