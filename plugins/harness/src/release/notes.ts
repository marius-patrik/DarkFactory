/**
 * Release notes: Conventional Commits grouped into sections a reader can skim.
 *
 * The grouping is the point. A wall of commit subjects tells a consumer nothing about whether
 * anything they depend on changed, so entries are bucketed by type and a breaking change leads.
 */

/** Sections in the order they appear, and the heading each gets. */
const NOTE_SECTIONS: readonly (readonly [string, string])[] = [
	["feat", "Features"],
	["fix", "Fixes"],
	["perf", "Performance"],
	["refactor", "Refactoring"],
	["docs", "Documentation"],
	["test", "Tests"],
	["ci", "Pipeline"],
	["chore", "Maintenance"],
];

/** `type(scope)!: subject` */
const COMMIT = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s*(?<subject>.+)$/;

/** A `BREAKING CHANGE:` trailer anywhere in the message body. */
const BREAKING_TRAILER = /^BREAKING[ -]CHANGE:/m;

/**
 * Groups Conventional Commits into release notes.
 *
 * @param messages Full commit messages since the previous release, newest first.
 * @param version Version being released; carried for the caller's benefit, since the window is
 *   chosen by the caller and the notes must describe the same one.
 * @param previous Previous version, or `null` for a first release.
 * @returns Markdown notes. Sections with no commits are omitted entirely.
 */
export function buildNotes(messages: Iterable<string>, version: string, previous: string | null): string {
	void version;
	const grouped = new Map<string, string[]>(NOTE_SECTIONS.map(([key]) => [key, []]));
	const breaking: string[] = [];

	for (const message of messages) {
		const header = (message.split("\n")[0] ?? "").trim();
		const match = COMMIT.exec(header);
		if (!match?.groups) continue;
		const scope = match.groups["scope"] ?? "";
		const subject = (match.groups["subject"] ?? "").trim();
		const entry = scope ? `**${scope}**: ${subject}` : subject;
		if (match.groups["bang"] || BREAKING_TRAILER.test(message)) breaking.push(entry);
		grouped.get(match.groups["type"] ?? "")?.push(entry);
	}

	const lines: string[] = [];
	if (breaking.length > 0) {
		lines.push("### Breaking changes", ...breaking.map((entry) => `- ${entry}`), "");
	}
	for (const [key, heading] of NOTE_SECTIONS) {
		const entries = grouped.get(key) ?? [];
		if (entries.length > 0) lines.push(`### ${heading}`, ...entries.map((entry) => `- ${entry}`), "");
	}

	if (lines.length === 0) lines.push("No user-facing changes recorded.", "");
	lines.push(previous ? `Changes since \`${previous}\`.` : "First release.");
	return `${lines.join("\n").trim()}\n`;
}
