---
title: Table Test
---

Markdown table documentation. View this page's source to inspect the markdown required to display each table.


## Table Styling

Tables have basic bootstrap styling by default. To add additional style classes to the table element, use the notation `{: class="table-striped table-bordered"}` on the line directly following the last row of the table. Class names should be space-separated. For full documentation, see [Bootstrap Tables](https://getbootstrap.com/docs/4.0/content/tables/).

### Supported Bootstrap Table Styles

* `table-striped` - add zebra-striping to any table row within the `<tbody>`
* `table-dark` - invert the colors with light text on dark backgrounds
* `table-bordered` - for borders on all sides of the table and cells
* `table-hover` - to enable a hover state on table rows within a `<tbody>`
* `table-sm` - to make tables more compact by cutting cell padding in half


## Basic table

Basic table with header and column alignment.

| Left Aligned | Centered | Right Aligned |
|--------------|:--------:|--------------:|
| Left 1 | Center 1 | Right 1 |
| Left 2 | Center 2 | Right 2 |
| Left 3 | Center 3 | Right 3 |


## Colspan Examples

Create colspans by using empty cells to the right of the content to be spanned. Must be `||` without spaces. Using `| |` will create an empty cell. Column alignment is determined by the first/leftmost spanning column.

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
|----------|:--------:|----------|---------:|----------|
| R1-C1 | R1-C2 | R1-C3 | R1-C4 | R1-C5 |
| R2-C1 | R2-C2 (colspan=2) || R2-C4 | R2-C5 |
| R2-C1 | R2-C2 (colspan=3) ||| R2-C5 |
| R3-C1 | R3-C2 (no colspan) | | R3-C4 | R3-C5 |
| R4-C1 | | R4-C3 (no colspan, C2 is a space) | R4-C4 | R4-C5 |
| R5-C1 (colspan) || R5-C3 | R5-C4 | R5-C5 |
{: class="table-bordered"}


## Inline rendering

Inline markdown may be rendered inside of a table. Block elements, such as lists, are not supported.

| Feature | Syntax | Display |
|---------|------|---|
| Inline code | `` `var x = 2` `` | `var x = 2` |
| Link | `[Genesys](https://genesys.com)` | [Genesys](https://genesys.com) |
| Strikethrough | `~~Some Text~~` | ~~Some Text~~ |
| Italic | `_Do you know who I am?_` | _Do you know who I am?_ |
| Bold | `**I AM THE JUGGERNAUT!**` | **I AM THE JUGGERNAUT!** |
| Image | `![Genesys](/img/genesys-logo-50.png) ` | ![Genesys](/img/genesys-logo-50.png) |
{: class="table table-striped"}


## Multi-line table content

End a table line with `\` instead of `|` to make the next line append to the previous row's cells instead of creating a new row. A `<br />` element will be added after the content of each cell on each line.

| Column 1 | Column 2 | Column 3 | Column 4 |
|----------|----------|----------|----------|
| R1-C1 | R1-C2 | R1-C3 | R1-C4 |
| R2-C1 | R2-C2 | R3-C3 | R2-C4 \
| more R2-C1 | more R2-C2 | more R2-C3 | More R2-C4 \
| | more R2-C2 again | | more R2-C4 again |
| R3-C1 | R3-C2 || \
| more R3-C1 | More R3-C2 | First R3-C3 | R3-C4 \
| MORE R3-C1 | MORE R3-C2 | MORE R3-C3 | MORE R3-C4 |
{: class="table-striped table-bordered"}
