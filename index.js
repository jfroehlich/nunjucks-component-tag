/* eslint-env node */
const YAML = require("yaml");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

const TAG_NAME = "component";

module.exports = class ComponentExtension {
    constructor(engine) {
		this.engine = engine;
		this.tags = [TAG_NAME];
		this._components = {};

		const componentsFile = path.resolve(process.cwd(), "components.json");
		try {
			if (fs.existsSync(componentsFile)) {
				this._components = JSON.parse(
					fs.readFileSync(path.resolve(process.cwd(), "components.json"))
				);
			}
		} catch (error) {
			console.error("Couldn't access the components.json file.", error);
		}
	}

	parse(parser, nodes) {
		let tok = parser.nextToken();
		let args = parser.parseSignature(null, true);

		parser.advanceAfterBlockEnd(tok.value);
		return new nodes.CallExtension(this, "run", args);
	}

	/**
	 * Renders a component like from a fractal component library.
	 * 
	 * This requires a map of components in form of `components.json` file to be placed
	 * in the root directory of the project.
	 * 
	 * When everything is fine you can use `{% render '@myHandle', {name: "schnick"}, true %}`
	 * in your templates – like you are used to from fractal.
	 * 
	 * @param {object} context - The current context from nunjucks
	 * @param {string} handle - The handle of the component you want to use e.g `@my-component--best-variant`
	 * @param {object} data - The data you want to put into this component
	 * @param {boolean} partial - Whether that data is the full set or just some parts (default: false)
	 */
	run(context, handle, data={}, partial=true) {
		let result = "";
		let component = {};

		if (handle in this._components) {
			component = this._components[handle];
		} else if (handle in context.ctx.components) {
			component = context.ctx.components[handle];
		} else {
			console.error(`[ComponentTag] Component with handle '${handle}' not found for '${context.ctx.page.inputPath}'.`);
			return result;
		}

		let ctx = Object.assign({}, context.ctx, structuredClone(data));
		if (partial) {
			ctx = Object.assign({}, structuredClone(component.ctx), ctx);
		}

		try {
			result = context.env.render(component.path, ctx);
		} catch (error) {
			console.error(`Failed to render component '${handle}'!`);
			throw error;
		}

		return new this.engine.runtime.SafeString(result);
	}
}
