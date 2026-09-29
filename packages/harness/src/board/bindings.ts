/**
 * Issue binding: the text in a pull request body or a commit message that names a Request.
 *
 * Two vocabularies, deliberately different. GitHub's closing keywords mean "this completes that
 * issue", so they are terminal bindings. `Advances` means "this moves part of that issue forward
 * and leaves it open", so it is not. Reading `Advances` as closing is how a partial slice closed the
 * Request it was working on; reading `Closes` as nonterminal is how a shipped fix left its issue
 * open forever.
 */

/** GitHub's closing keywords: a terminal binding. */
const CLOSING_PATTERN =
	/\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#(\d+)|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/(\d+))\b/gi;

/** Closing keywords plus the nonterminal `Advances`. */
const BINDING_PATTERN =
	/\b(?:advance|advances|advanced|close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#(\d+)|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/(\d+))\b/gi;

/** The canonical html url of a GitHub issue or pull request, with the kind and number captured. */
const CONTENT_URL_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/;

/**
 * Every issue number a pattern names, deduplicated and sorted.
 *
 * Both capture groups are accepted because a reference is either a short form (`#12`) or a full url;
 * either may name the same issue twice in one body, and a board that applies `Done` twice is no
 * different from one that applies it once.
 */
function issueNumbersFrom(pattern: RegExp, text: string | null | undefined): number[] {
	if (!text) return [];
	const numbers = new Set<number>();
	for (const match of text.matchAll(pattern)) {
		// The two capture groups are the short form and the url form of the same reference.
		const named = match[1] || match[2];
		if (named) numbers.add(Number.parseInt(named, 10));
	}
	return [...numbers].sort((left, right) => left - right);
}

/** The issue numbers a pull request body or commit message closes outright. */
export function extractClosingIssues(text: string | null | undefined): number[] {
	return issueNumbersFrom(CLOSING_PATTERN, text);
}

/**
 * Every Request a pull request is bound to, terminal or not.
 *
 * A binding is a claim about intent, not a completion: `Advances` binds a Request to a pull request
 * without completing it, and both are read here so the board can show the work in flight.
 */
export function extractBoundIssues(body: string | null | undefined): number[] {
	return issueNumbersFrom(BINDING_PATTERN, body);
}

/** A repository slug and issue number read out of a board item's content. */
interface ContentTarget {
	readonly repo: string | null;
	readonly number: number | null;
}

/**
 * The repository slug and number a board item refers to.
 *
 * A board item carries the number in `content.number` and the repository only in its url, so the
 * number is taken from the field when it is present and from the url otherwise. `repo` is null when
 * the item is not a GitHub issue or pull request url at all, which is the signal that this item
 * cannot be labelled - not a number to guess at.
 */
export function repoAndNumberFromContent(
	content: { readonly number?: number | string | null; readonly url?: string | null },
	url?: string | null,
): ContentTarget {
	const declared = Number.parseInt(String(content.number ?? ""), 10);
	const number = Number.isNaN(declared) ? null : declared;
	const match = CONTENT_URL_PATTERN.exec(url || content.url || "");
	if (!match) return { repo: null, number };
	const owner = match[1] ?? "";
	const name = match[2] ?? "";
	return { repo: `${owner}/${name}`, number: number ?? Number.parseInt(match[3] ?? "", 10) };
}

/** The html url of an issue, the form every board item is keyed by. */
export function issueUrl(repo: string, number: number): string {
	return `https://github.com/${repo}/issues/${number}`;
}
