
Component Block Tag for nunjucks
================================================================================

A nunjucks extension to render fractal style blocks in 11ty and include them by
using their handle.


Requirements
--------------------------------------------------------------------------------

Node >= 17.0

This is not meant to be used in a browser but from a static site generator.


Install
--------------------------------------------------------------------------------

```bash
$ npm install --save nunjucks-component-tag
```


Usage
--------------------------------------------------------------------------------

After installation get the ComponentTag with e.g `require` and register it with
nunjucks.

For plain JavaScript e.g. in express it would work like this:

```JavaScript
const nunjucks = require("nunjucks");
var ComponentTag = require("nunjucks-component-tag");

var env = new nunjucks.Environment();
env.addExtension("component", new ComponentTag());
```
