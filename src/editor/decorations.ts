import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { LINE_TOKENS, TOKEN_NAMES as n } from "./consts";
import { FountainContext, FountainState } from "./interface";
import { editorInfoField } from "obsidian";

function composeFClass(t: string) {
	return `cm-formatting cm-fountain-formatting-${t}`;
}

function getLineFormat(
	line: string,
	state: FountainState,
	ctx: FountainContext,
) {
	if (!line.trim()) {
		// at least two spaces to be considered
		// https://fountain.io/syntax#line-breaks
		if (line.length < 2) state.inDialogue = false;
		return null;
	}

	for (const { id: tId, regex: tRegex } of LINE_TOKENS) {
		if (tRegex.test(line)) {
			if (tId === n.fBoneyardEnd) {
				state.inBoneyard = false;
			}
			if (state.inBoneyard) {
				return n.boneyard;
			}
			if (tId === n.fBoneyardStart) {
				state.inDialogue = false;
				state.inBoneyard = true;
			}
			if (tId === n.character) {
				if (ctx.afterEmptyLine && !ctx.beforeEmptyLine && !ctx.isLastLine) {
					state.inDialogue = true;
				} else {
					break;
				}
			}
			if (tId === n.parenthetical) {
				if (!state.inDialogue) break;
			}
			if (tId === n.transition) {
				if (!(ctx.afterEmptyLine && ctx.beforeEmptyLine)) break;
			}

			return tId;
		}
	}

	if (state.inDialogue) {
		return n.dialogue;
	}
	if (state.inBoneyard) {
		return n.boneyard;
	}
	return n.action;
}

export function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	if (!isFountainEnabled(view)) return builder.finish();

	function markDeco(start: number, end: number, className: string) {
		const deco = Decoration.mark({ class: className });
		builder.add(start, end, deco);
	}

	const state: FountainState = {
		inDialogue: false,
		inBoneyard: false,
	};

	for (const { from, to } of view.visibleRanges) {
		const visibleText = view.state.sliceDoc(from, to);
		const maxLines = view.state.doc.lines;

		for (let pos = from; pos <= to; ) {
			const line = view.state.doc.lineAt(pos);
			const { from: lFrom, to: lTo, text: lText } = line;

			const relFrom = lFrom - from;
			const relTo = lTo - from;

			const ctx = {
				afterEmptyLine: visibleText[relFrom - 2] === "\n",
				beforeEmptyLine: visibleText[relTo + 1] === "\n",
				isLastLine: line.number === maxLines,
			};
			const token = getLineFormat(lText, state, ctx);

			if (!token) {
				pos = lTo + 1;
				continue;
			}

			const deco = Decoration.line({ class: "cm-fountain-" + token });
			builder.add(lFrom, lFrom, deco);

			// Mark Decorations
			const firstChar = lText[0];
			const lastChar = lText[line.length - 1];
			if (
				token === n.action &&
				firstChar === "!" &&
				lText.substring(0, 3) !== "![["
			) {
				markDeco(lFrom, lFrom + 1, composeFClass(token));
			}
			if (token === n.sceneHeading && firstChar === ".") {
				markDeco(lFrom, lFrom + 1, composeFClass(token));
			}
			if (token === n.lyrics && firstChar === "~") {
				markDeco(lFrom, lFrom + 1, composeFClass(token));
			}
			if (token === n.synopsis && firstChar === "=") {
				markDeco(lFrom, lFrom + 2, composeFClass(token));
			}
			if (token === n.character) {
				if (firstChar === "@") {
					markDeco(lFrom, lFrom + 1, composeFClass(token));
				}
				if (lastChar === ")") {
					const charExt = lText.match(/(\(.*\))?$/g);
					if (charExt === null) {
						console.error(
							"Character regex broken; char ext segment should exist",
						);
						continue;
					}
					const charExtLength = charExt[0].length;
					const charExtStart = lTo - charExtLength;
					markDeco(charExtStart, lTo, "cm-fountain-character-extension");
				}
			}
			if (token === n.dialogue) {
				if (firstChar === "\\") {
					markDeco(lFrom, lFrom + 1, composeFClass(token));
				}
			}
			if (token === n.centered && lastChar === "<") {
				markDeco(lTo - 1, lTo, composeFClass(token));
			}

			pos = lTo + 1;
		}
	}

	return builder.finish();
}

function isFountainEnabled(view: EditorView) {
	const info = view.state.field(editorInfoField);
	const { app, file } = info;
	if (file?.extension == "fountain") return true;
	if (file) {
		const fileCache = app.metadataCache.getFileCache(file);
		const cssClasses = fileCache?.frontmatter?.cssclasses ?? [];
		return cssClasses.includes("fountain");
	}
}
