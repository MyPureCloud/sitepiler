---
title: Building Locally
---

# TL;DR

To build this example site and serve it locally, clone the [sitepiler]() repo and run:

```sh
npm i
sh build-local.sh
```

Then visit http://localhost:4567/sitepiler/ in your browser.

# Command Line Options

Invoking sitepiler without options will display the CLI options:

```
Usage: sitepiler [options] <configFiles ...>

Options:
  -b --build <stage>       Build to target (data|compile|publish)
  -o --buildOnly <stage>   Build a single stage (data|compile|publish)
  -l --local               Serve the page locally
  -p --localPort <n>       Port for serving the page locally (default: 4567)
  -r --livereload          Enable livereload server when serving locally
  -r --livereloadPort <n>  Custom livereload server port (default: 35729)
  -t --tracing <level>     Tracing level (error|warn|info|verbose|debug|silly) (default: "debug")
  -v, --version            output the version number
  -h, --help               output usage information
```

When developing locally, this would be a common invocation of sitepiler:

```sh
node sitepiler.js --build compile --local --livereload example/sitepiler.yml example/sitepiler-local.yml
```
