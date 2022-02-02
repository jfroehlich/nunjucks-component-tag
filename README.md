
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

### Plain JavaScript

When you do your custom nunjucks rendering somewhere on a server e.g. in an 
express app you could do somthing like this:

```JavaScript
const nunjucks = require("nunjucks");
const ComponentTag = require("nunjucks-component-tag");

// Register the tag with the nunjucks environment
const env = new nunjucks.Environment();
env.addExtension("component", new ComponentTag());

// Prepare a base context which is handet to all templates
const baseContext = {
  components: ComponentTag.findComponents({
  		componentDir: "./assets/", 
			templateExtensions: "njk",
			ignore: ["layouts/**/*"]
  });
};
const result = nunjucks.render("foo.html", baseContext);
```

For a particular page you could refetch the components or you cache them
and expand the context to the pages data:

```JavaScript
// ...

const pageContext = Object.assign({}, baseContext, {
  name: "Bob"
});
const result = nunjucks.render("foo.html", pageContext);
```

Inside the template you can use the tag like this:

```JavaScript
{% component '@text', {classes: "schnick", text: "Hello " + name} %}
```

The component is automatically retrieved from `./assets/` and used as
a nunjucks template. The given context is deep merged with the context from
the components config file.
