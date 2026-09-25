/** @packageDocumentation
 * Release notes generation from Conventional Commits.
 */

import { resolve } from "node:path";

/** Conventional Commit type -> the heading it appears under in the release notes, in order. */
export const NOTE_SECTIONS: ReadonlyArray<[string, string]> = Object.freeze([
	["feat", "Features"],
	["fix", "Fixes"],
	["perf", "Performance"],
	["refactor", "Refactoring"],
	["docs", "Documentation"],
	["test", "Tests"],
	["ci", "Pipeline"],
	["chore", "Maintenance"],
] as const);

/** `type(scope)!: subject` */
const COMMIT_RE = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s*(?<subject>.+)$/;

/** Groups Conventional Commits into release notes.
 *
 * @param messages - Full commit messages since the previous release, newest first.
 * @param version - The version being released.
 * @param previous - The previous version, or `null` for a first release.
 * @returns Markdown release notes. Sections with no commits are omitted entirely.
 */
export function buildNotes(
	messages: readonly string[],
	version: string,
	previous: string | null,
): string {
	const grouped: Record<string, string[]> = {};
	for (const [key] of NOTE_SECTIONS) grouped[key] = [];
	const breaking: string[] = [];

	for (const message of messages) {
		const header = message.split("\n")[0] ?? "";
		const match = COMMIT_RE.exec(header.trim());
		if (!match) continue;
		const scope = match.groups?.scope ?? "";
		const subject = match.groups?.subject?.trim() ?? "";
		const entry = scope ? `**${scope}**: ${subject}` : subject;
		if (match.groups?.bang || /^BREAKING[ -]CHANGE:/m.test(message)) {
			breaking.push(entry);
		}
		const commitType = match.groups?.type ?? "";
		if (commitType in grouped) {
			grouped[commitType].push(entry);
		}
	}

	const lines: string[] = [];
	if (breaking.length > 0) {
		lines.push("### Breaking changes");
		lines.push(...breaking.map((entry) => `- ${entry}`));
		lines.push("");
	}
	for (const [key, heading] of NOTE_SECTIONS) {
		if (grouped[key].length > 0) {
			lines.push(`### ${heading}`);
			lines.push(...grouped[key].map((entry) => `- ${entry}`));
			lines.push("");
		}
	}

	if (lines.length === 0) {
		lines.push("No user-facing changes recorded.", "");
	}

	if (previous) {
		lines.push(`Changes since \`${previous}\`.`);
	} else {
		lines.push("First release.");
	}
	return lines.join("\n").trim() + "\n";
}