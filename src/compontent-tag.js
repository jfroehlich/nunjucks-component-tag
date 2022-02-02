/* eslint-env node */
const YAML = require("yaml");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

const TAG_NAME = "component";

/**
 * 
 */
class ComponentTag {
    constructor() {
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

/**
 * A asynchronous wrapper around glob.js
 * 
 * @param {string} pattern The glob pattern that should be matched
 * @param {object} options The options for glob.js
 * @returns A promise to the list of stings.
 */
ComponentTag._findFiles = async (pattern, options) => {
	return new Promise((resolve, reject) => {
		glob(pattern, options, (error, files) => {
			if (error) {
				return reject(error);
			}
			resolve(files);
		});
	});
};

ComponentTag.findComponents = async options => {
	const config = Object.assign({
		componentDir: "./assets",
		templateExtensions: "njk,hbs,html",
		ignore: []
	}, options);

	const components = {};
	const pattern = `**/*.{${config.templateExtensions}}`;

	// Finds the files provided by the pattern and ignores variants -- they are handled below.
	// Variant templates should have the parents context, but they won't have it if added here directly.
	const templates = await ComponentTag._findFiles(
		pattern, 
		{cwd: config.componentDir, ignore: config.ignore.concat(["**/*--*.*"])}
	);

	for (const file of templates) {
		let handle = path.basename(file, path.extname(file));
		const comp = {
			path: `${file}`,
			ctx: {}
		};

		// TODO Move this part to it's own function
		const configFiles = await ComponentTag._findFiles(
			`${path.dirname(file)}/${handle}.config.{yml,yaml}`, 
			{cwd: config.componentDir}
		);
		if (configFiles.length > 0) {
			const cf = fs.readFileSync(path.posix.join(config.componentDir, configFiles[0]), "utf-8");
			const compConfig = YAML.parse(cf);

			if (!!compConfig === true) {
				// Fetch the context from the configuration. That's we why do all this.
				comp.ctx = !!compConfig.context === true ? Object.assign(comp.ctx, compConfig.context) : comp.ctx;

				// The handle can be overriden in the config.
				handle = !!compConfig.handle === true ? compConfig.handle : handle;

				// Finding the variants
				if (compConfig.variants) {
					for (const variant of compConfig.variants) {
						if (!!variant.name === false) {
							continue;
						}
						
						// Clone the parents context and merge the variants context if it exists.
						const vcomp = structuredClone(comp); // requires min nodejs 17.0, but does an actual deep clone
						vcomp.ctx = !!variant.context === true ? Object.assign(vcomp.ctx, variant.context) : vcomp.ctx;
						
						// Check if there is a template file for this variant
						const vtempls = await ComponentTag._findFiles(
							`${path.dirname(file)}/${handle}--${variant.name}.{${config.templateExtensions}}`,
							{cwd: config.componentDir}
						);
						if (vtempls.length > 0) {
							vcomp.path = vtempls[0];
						}

						components[`@${handle}--${variant.name}`] = vcomp;
					}
				}
			}
		}

		// Add the file to the components list
		components[`@${handle}`] = comp;
	}
	return components;
};

module.exports = ComponentTag
