/*
 * Ambient declarations for `turndown` and `turndown-plugin-gfm`, neither of which is installed or
 * declared as a dependency yet.
 *
 * This is a placeholder for a planned HTML source in the docs domain, kept deliberately: the docs
 * pipeline currently reads `.md` only, and the one place this repository handles HTML
 * (`packages/web/src/docs.ts`) goes the other way, rendering Markdown into a web page. When an
 * HTML source is added, `turndown` is the library this declaration was written for.
 *
 * Nothing imports these types today, so nothing typechecks them in a way that could drift from a
 * real dependency. If that changes, re-check them against the installed version's own types rather
 * than trusting this file.
 */
declare module "turndown" {
	export interface TurndownOptions {
		headingStyle?: "setext" | "atx";
		bulletListMarker?: "-" | "+" | "*";
		codeBlockStyle?: "indented" | "fenced";
	}

	export type Plugin = unknown;

	export default class TurndownService {
		constructor(options?: TurndownOptions);
		use(plugin: Plugin): this;
		keep(selector: string | string[]): this;
		turndown(input: string): string;
	}
}

declare module "turndown-plugin-gfm" {
	import type { Plugin } from "turndown";

	export const gfm: Plugin;
}
