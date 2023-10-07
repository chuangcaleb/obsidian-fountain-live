import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import postcssImport from "postcss-import";
import copy from "rollup-plugin-copy";
import postcss from "rollup-plugin-postcss";

const TEST_VAULT_PLUGIN_DIR =
	"obsidian-fountain-editor-test/.obsidian/plugins/fountain-editor";
const BUILD_DIR = "build";

/* ------------------------------------ - ----------------------------------- */

const isProduction = process.env.BUILD === "production";
const OUT_DIR = isProduction ? BUILD_DIR : TEST_VAULT_PLUGIN_DIR;

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source, visit the plugin's github repository
*/
`;

const jsConfig = {
	input: "src/main.ts",
	external: ["obsidian", "@codemirror/view", "@codemirror/state"],
	output: {
		dir: OUT_DIR,
		sourcemap: "inline",
		format: "cjs",
		sourcemapExcludeSources: isProduction,
		exports: "default",
		banner: isProduction ? banner : undefined,
	},
	plugins: [
		// postcss({
		// 	extensions: [".css"],
		// 	minimize: true,
		// 	extract: path.resolve("HELP.css"),
		// 	sourceMap: !isProduction,
		// }),
		typescript({
			sourceMap: !isProduction,
			inlineSources: !isProduction,
			rootDir: "./src",
		}),
		commonjs(),
		copy({
			targets: [{ src: "manifest.json", dest: OUT_DIR }],
			hook: "writeBundle",
			// verbose: true,
			overwrite: true,
		}),
	],
};

const cssConfig = {
	input: "src/styles/index.css",
	output: { file: OUT_DIR + "/styles.css" },
	plugins: [
		postcss({
			extract: true,
			sourceMap: !isProduction,
			plugins: [postcssImport()],
		}),
	],
};

export default [cssConfig, jsConfig];
