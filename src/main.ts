import { Prec } from "@codemirror/state";
import { Plugin } from "obsidian";
import { fountainPlugin } from "./editor/plugin";
import { markdownPostProcessor } from "./markdownPostProcessor";

export default class FountainPlugin extends Plugin {
	async onload() {
		this.registerEditorExtension(Prec.lowest(fountainPlugin));

		this.registerMarkdownPostProcessor((el, ctx) => markdownPostProcessor(this, el, ctx));
	}
	onunload() {}
}
