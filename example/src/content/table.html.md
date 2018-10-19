---
title: Table Test
---

# Basic table

Basic table with header and column alignment.

| Tables   |      Are      |  Cool |
|----------|:-------------:|------:|
| col 1 is |  left-aligned | $1600 |
| col 2 is |    centered   |   $12 |
| col 3 is | right-aligned |    $1 |
{: class="table table-striped"}


# Colspan Tests

Empty columns will be included in colspan.

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
|----------|:--------:|----------|----------|----------|
| R1-C1 | R1-C2 | R1-C3 | R1-C4 | R1-C5 |
| R2-C1 | R2-C2 (colspan=2) || R2-C4 | R2-C5 |
| R2-C1 | R2-C2 (colspan=3) ||| R2-C5 |
| R3-C1 | R3-C2 (no colspan) | | R3-C4 | R3-C5 |
| R4-C1 | | R4-C3 (no colspan, C2 is a space) | R4-C4 | R4-C5 |
| R5-C1 (colspan) || R5-C3 | R5-C4 | R5-C5 |
{: class="table table-striped"}


# Inline rendering

| Feature | Test |
|---------|------|
| Inline code | `var x = 2` |
| Link | [Genesys](https://genesys.com) |
| Italic | _Do you know who I am?_ |
| Bold | **I AM THE JUGGERNAUT!**


# Multi-line table content

TODO: see if this can work.

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| R1-C1 | R1-C2 | R1-C3 |
| R2-C1 | R2-C2 | R3-C3 \
| more R1 | more R2 | more R3 \
| | more R2-2 | |
| List in C2 | * LI 1 | \
| | * LI 2 | 3rd column content | 
{: class="table table-striped"}


# Table Features

Status of desired features.

| Status | Feature | Notes |
|--------|---------|-------|
| ✅ | Zebra striping | `{: class="table table-striped"}` TODO: parse that for classes instead of a string literal |
| ✅ | Colspan | Use double pipes, must add colspans to the right of content |
| ✅ | inline markdown rendering in table | See table above |
| ❓ | | |
{: class="table table-striped"}

Some more text


Here's more text


And a [link](/).
