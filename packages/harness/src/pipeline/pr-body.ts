/**
 * The deterministic pull request body, and the names derived from an issue.
 *
 * A pull request description assembled from an approved plan and the run's own statistics is the
 * same description on every re-run, which is what makes it reviewable: nothing in it is the
 * model's phrasing. The agent's own output is included, but only inside a collapsed block, because
 * an implementation agent narrates its reasoning and that narration is not the change.
 */

import { isPlanComment } from "./plan-scope.ts";

/** Section headings the scope extractor reads, in preference order after `Scope` itself. */
const FALLBACK_SCOPE_HEADINGS = ["Objectives", "Overview", "Summary", "Description"] as const;

/** The `Scope` section, up to the next heading of the same or a shallower level. */
const SCOPE_SECTION_RE = /(?:^|\n)#{2,4}\s*Scope[ \t]*\n([\s\S]*?)(?=\n#{2,4}\s|$)/iu;

/** Longest a plan's free-text fallback scope is allowed to be in a pull request body. */
const MAX_FALLBACK_SCOPE = 500;

/** Longest an agent's own notes are allowed to be inside the collapsed block. */
const MAX_AGENT_NOTES = 2000;

/** Longest branch name slug, so a branch stays a legal and readable ref name. */
const MAX_BRANCH_SLUG = 50;

/**
 * Conventional Commit type for a pipeline type label.
 *
 * `bug` is a label; `fix` is the commit type. The two vocabularies overlap and must not leak into
 * each other, or a commit titled `bug(...)` is not a Conventional Commit at all.
 *
 * @param typeLabel - The label the classifier applied.
 * @param scope - The area label, whose leading `area:` prefixes are dropped.
 * @param description - The change's description.
 * @returns A Conventional Commit subject line.
 */
export function formatConventionalCommit(typeLabel: string, scope: string, description: string): string {
	const type = typeLabel === "bug" ? "fix" : typeLabel;
	// Every leading `area:` is stripped, not just the first. A colon inside the scope is not a
	// cosmetic problem: the first colon in `type(scope): description` terminates the header, so a
	// surviving `area:` yields `feat(area:agents): ...`, which is not a Conventional Commit at all.
	const scopeClean = scope.replace(/^(?:area:)+/u, "").trim();
	let descriptionClean = description.trim();
	if (descriptionClean && /^[A-Z]$/u.test(descriptionClean[0] as string)) {
		descriptionClean = descriptionClean[0]?.toLowerCase() + descriptionClean.slice(1);
	}
	return `${type}(${scopeClean}): ${descriptionClean}`;
}

/**
 * Build a branch name from a plan or request title.
 *
 * Lowercase, hyphenated, prefixed with `feature/`. Issue references are stripped, because
 * the `branches-and-pull-requests` skill forbids an issue number in a branch name.
 *
 * @param title - The plan or request issue title.
 * @returns The branch name.
 */
export function generateBranchName(title: string): string {
	const withoutPrefix = title.replace(/^(?:Plan|Request):\s*/iu, "").trim();
	const withoutIssue = withoutPrefix.replace(/#\d+/gu, "").trim();
	let slug = withoutIssue
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-+|-+$/gu, "");
	slug = slug.replace(/-{2,}/gu, "-");
	if (slug.length > MAX_BRANCH_SLUG) slug = slug.slice(0, MAX_BRANCH_SLUG).replace(/-+$/u, "");
	return `feature/${slug}`;
}

/**
 * Extract a plan's own scope statement, or a fallback summary.
 *
 * @param planText - The approved plan's markdown.
 * @param fallbackTitle - The plan's title, used when the plan has no recognisable section.
 * @returns The scope text, never empty.
 */
export function extractPlanScope(planText: string, fallbackTitle = ""): string {
	const scopeMatch = SCOPE_SECTION_RE.exec(planText);
	const scope = scopeMatch?.[1]?.trim();
	if (scope) return scope;

	for (const heading of FALLBACK_SCOPE_HEADINGS) {
		const pattern = new RegExp(`(?:^|\n)#{2,4}\\s*${heading}[ \\t]*\\n([\\s\\S]*?)(?=\\n#{2,4}\\s|$)`, "iu");
		const match = pattern.exec(planText);
		const body = match?.[1]?.trim();
		if (body) return body;
	}

	// The plan is prose with no headings at all, so the markers and footers the pipeline itself
	// added are dropped and what is left is the author's own text.
	const lines = planText
		.split("\n")
		.filter(
			(line) =>
				!line.startsWith("<!--") &&
				!line.startsWith("#") &&
				!line.includes("PLAN_FOOTER") &&
				!line.includes("Parent Request"),
		);
	const text = lines.join("\n").trim();
	if (text) return text.slice(0, MAX_FALLBACK_SCOPE);
	return fallbackTitle || "Implementation changes as approved in the plan.";
}

/**
 * Extract the final result summary line from test suite output.
 *
 * @param stdout - The suite's standard output.
 * @param stderr - The suite's standard error.
 * @returns The last non-empty line, or `Tests passed` when the suite printed nothing.
 */
export function extractTestResultLine(stdout = "", stderr = ""): string {
	const output = `${stdout ?? ""}\n${stderr ?? ""}`;
	const lines = output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length === 0) return "Tests passed";
	return lines[lines.length - 1] as string;
}

/** Everything a pull request body is assembled from. */
interface PrBodyInput {
	planTitle: string;
	planText: string;
	requestNumber: number;
	planNumber?: number | undefined;
	diffStat?: string;
	testCommand?: string;
	testResultLine?: string;
	agentNotes?: string;
}

/**
 * Build a pull request description deterministically from the approved plan and the run's stats.
 *
 * @param input - The plan, the parent request, and what the run observed.
 * @returns The pull request body markdown.
 */
export function buildPrBody(input: PrBodyInput): string {
	const scope = extractPlanScope(input.planText, input.planTitle);
	const sections: string[] = [`## Summary\n\n${scope}`];

	if (input.diffStat?.trim()) sections.push(`## Changed Files\n\n\`\`\`\n${input.diffStat.trim()}\n\`\`\``);

	if (input.testCommand || input.testResultLine) {
		const verification = ["## Verification\n"];
		if (input.testCommand) verification.push(`- **Command**: \`${input.testCommand}\``);
		if (input.testResultLine) verification.push(`- **Result**: \`${input.testResultLine}\``);
		sections.push(verification.join("\n"));
	}

	const closes = [`Closes #${input.requestNumber}`];
	if (input.planNumber && input.planNumber !== input.requestNumber) closes.push(`Closes #${input.planNumber}`);
	sections.push(closes.join("\n"));

	if (input.agentNotes?.trim()) {
		sections.push(
			`<details>\n<summary>Agent notes</summary>\n\n${input.agentNotes.slice(0, MAX_AGENT_NOTES).trim()}\n</details>`,
		);
	}

	return `${sections.join("\n\n")}\n`;
}

/**
 * Find the most recent approved plan comment on an issue.
 *
 * The plan is a comment rather than the issue body, and once scope amendments became comments too
 * there is more than one candidate, so the newest plan wins.
 *
 * @param comments - The issue's comment bodies, oldest first.
 * @param issueBody - The issue body, used when no comment carries a plan.
 * @returns The approved plan's markdown.
 */
export function approvedPlanText(comments: readonly string[], issueBody = ""): string {
	for (let index = comments.length - 1; index >= 0; index -= 1) {
		const body = comments[index] as string;
		if (isPlanComment(body)) return body;
	}
	return issueBody;
}

/** The scope amendments a plan accumulated as comments. */
export const SCOPE_AMENDMENT_MARKER = "Scope Amendment";

/**
 * Fold a plan's scope amendments into its scope.
 *
 * An amendment is a comment on the plan, and an implementation that ignored one diverged from the
 * plan the reviewers were reading.
 *
 * @param planBody - The plan's body.
 * @param comments - The plan issue's comment bodies, oldest first.
 * @returns The plan's scope with every amendment appended.
 */
export function fullPlanScope(planBody: string, comments: readonly string[]): string {
	const amendments = comments.filter((body) => body.includes(SCOPE_AMENDMENT_MARKER));
	if (amendments.length === 0) return planBody;
	return `${planBody}\n\n## Scope Amendments\n${amendments.join("\n")}`;
}
