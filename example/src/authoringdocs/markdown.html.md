---
title: Basic Formatting with Markdown
---

This page covers standard Markdown syntax.

:::toc:::

## Advanced Syntax

See the advanced guides for additional features:

* [Code Fences and Alert Blocks](codeFence.html)
* [Tables](table.html)
* [Templating](templating.html)


## Inline Styling

### Bold

Here is some **bold text** inline.

```
Here is some **bold text** inline.
```

### Italics

Here is some _italic text_ inline.

```
Here is some _italic text_ inline.
```

### Links

You can [Google](https://google.com) for answers.

```
You can [Google](https://google.com) for answers.
```


## Block Styling

### Line Breaks

Text on lines without a blank line
is lumped together.

One or more blank lines in between blocks of text

Makes it a new paragraph.

```
Text on lines without a blank line
is lumped together.

One or more blank lines in between blocks of text

Makes it a new paragraph.
```


### Headers

```
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

# H1
## H2
### H3
#### H4
##### H5
###### H6


### Lists

* list
* items
* more

### Images

![Alt text for accessibility](/img/dog-lion.png)

```
![Alt text for accessibility](/img/dog-lion.png)
```

### Blockquotes

> Single line quoted text

> Linebreaks are removed in multi-line quoted text when there isn't a blank line in between.
> Any blockquotes can use _inline_ **styles**.

```
> Single line quoted text

> Linebreaks are removed in multi-line quoted text when there isn't a blank line in between.
> Any blockquotes can use _inline_ **styles**.
```

### Horizontal Rules

Horizontal rules require a blank line preceding them.

---
But a blank line is not required after.

```
Horizontal rules require a blank line preceding them.

---
But a blank line is not required after.
```