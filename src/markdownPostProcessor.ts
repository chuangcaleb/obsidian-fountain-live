import { MarkdownPostProcessorContext, Plugin } from "obsidian";
import { LINE_TOKENS, TOKEN_NAMES as n } from "./editor/consts";
import { FountainState } from "./editor/interface";

function getLineFormat(line: string, state: FountainState) {
	if (!line.trim()) return "empty";

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
			if (tId === n.parenthetical) {
				if (!state.inDialogue) break;
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

export function markdownPostProcessor(
	plugin: Plugin,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	const cssClasses = ctx.frontmatter?.cssclasses ?? [];
	if (!cssClasses.includes("fountain")) return;

	const paragraphs = el.querySelectorAll("p");
	const quotes = el.querySelectorAll("blockquote");

	const state: FountainState = {
		inDialogue: false,
		inBoneyard: false,
	};

	for (const p of Array.from(paragraphs)) {
		if (p.parentNode?.nodeName === "BLOCKQUOTE") continue;

		const text = p.innerHTML;
		let firstLine = text.split("<br>")[0];
		const token = getLineFormat(firstLine, state);

		const firstChar = firstLine[0];
		const lastChar = firstLine[firstLine.length - 1];
		// Forced Scene Heading
		if (token === n.sceneHeading && firstChar === ".") {
			p.innerHTML = text.substring(1);
		}
		// Forced Action
		if (token === n.action && firstChar === "!") {
			p.innerHTML = text.substring(1);
		}
		// Lyrics
		if (token === n.lyrics && firstChar === "~") {
			p.innerHTML = text.substring(1);
		}
		// Synopsis
		if (token === n.synopsis && firstChar === "=") {
			p.innerHTML = text.substring(1);
		}
		// Character block
		if (token === n.character) {
			p.addClass(`fountain-${n.character}`);

			if (firstChar === "@") firstLine = firstLine.substring(1);
			if (lastChar === ")") {
				const charExt = firstLine.match(/(\(.*\))?$/g);
				if (charExt === null) continue;
				const charExtLength = charExt[0].length;
				const charExtStart = firstLine.length - charExtLength;

				const span = createSpan("fountain-character-extension");
				span.innerHTML = firstLine.substring(charExtStart);
				firstLine = firstLine.substring(0, charExtStart);
				p.innerHTML = firstLine;
				p.appendChild(span);
			} else {
				p.innerHTML = firstLine;
			}

			state.inDialogue = true;
			const lines = text.split("<br>").slice(1);
			for (const line of lines) {
				const tLine = line.trim();
				const subtoken = getLineFormat(tLine, state);

				const child = createEl("p", {
					cls: `fountain-${subtoken}`,
				});

				// Lyrics in dialogue
				if (subtoken === n.lyrics && tLine[0] === "~") {
					child.innerHTML = tLine.substring(1);
				} else {
					child.innerHTML = tLine;
				}

				p.parentElement?.appendChild(child);
			}
			state.inDialogue = false;
			continue;
		}
		p.addClass(`fountain-${token}`);
	}

	// Process BlockQuote blocks
	for (const bq of Array.from(quotes)) {
		const p = bq.firstElementChild as HTMLParagraphElement;
		const text = p.getText();

		const lastChar = text[text.length - 1];
		if (lastChar === "<") {
			p.addClass("fountain-centered");
			p.innerHTML = text.substring(0, text.length - 1);
		} else {
			p.addClass("fountain-transition");
		}
	}
}
