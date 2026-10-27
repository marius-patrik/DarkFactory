/**
 * Parsing of an agent review pass into discrete findings.
 *
 * A review is free prose, but the convergence machine compares one review against the next, and a
 * prose blob cannot be compared to anything. So the pass is cut into top-level items - the
 * numbered and bulleted lines an author actually uses to enumerate findings - and continuation
 * lines fold into the item they belong to.
 */

/** Prefix an agent's review answer carries when it found nothing actionable. */
export const NO_FINDINGS_PREFIX = "NO_FINDINGS";

/** A numbered item, with the `1. ` marker removed. */
const NUMBERED_ITEM_RE = /^\d+\.\s*/u;

/** A bulleted item. `-` and `*` are the only markers an agent review is read as using. */
const BULLET_ITEM_RE = /^[-*]/u;

/**
 * Cut a review pass into one string per finding.
 *
 * Numbered items (`1.`, `2.`) and bullet items (`* `, `-`) are each one finding; subsequent
 * indented or wrapped lines belong to the item above them. A review with no list structure at all
 * is one finding, so a finding is never lost to a formatting the parser did not anticipate.
 *
 * @param text - The agent's review answer.
 * @returns One stripped string per finding, in the order the review listed them.
 */
export function parseReviewFindings(text: string): string[] {
	const strippedText = text.trim();
	if (strippedText.startsWith(NO_FINDINGS_PREFIX)) return [];

	const items: string[] = [];
	let current: string[] = [];
	let inItem = false;

	for (const line of text.split("\n")) {
		const stripped = line.trim();
		if (!stripped) continue;
		const numbered = NUMBERED_ITEM_RE.exec(stripped);
		const bullet = numbered ? null : BULLET_ITEM_RE.exec(stripped);
		if (numbered || bullet) {
			if (current.length > 0) {
				items.push(
					current
						.map((part) => part.trim())
						.filter(Boolean)
						.join(" "),
				);
			}
			inItem = true;
			// The matched text's length, not the match array's: `* text` drops two characters and
			// `-text` drops one, and reading the array length would drop the same count for every
			// marker, turning `*Bullet two` into `ullet two`.
			const markerLength = (numbered ?? bullet)?.[0].length ?? 0;
			current = [stripped.slice(markerLength).trim()];
			continue;
		}
		if (inItem) current.push(stripped);
	}

	if (current.length > 0) {
		items.push(
			current
				.map((part) => part.trim())
				.filter(Boolean)
				.join(" "),
		);
	}

	if (items.length === 0 && strippedText) return [strippedText];
	return items;
}

/**
 * Split findings into the ones that name an out-of-scope path and the rest.
 *
 * The scope gate contributes its own findings in a fixed shape, and a fix stage has to act on the
 * two kinds differently: an out-of-scope path is reverted from the base branch in its own commit,
 * while anything else needs the agent to reason about it. Merging them would make one mechanism
 * serve two decisions.
 *
 * @param findings - Findings as {@link parseReviewFindings} returned them.
 * @returns The out-of-scope paths and the remaining findings, in their original order.
 */
export function splitScopeFindings(findings: readonly string[]): {
	outOfScope: string[];
	other: string[];
} {
	const outOfScope: string[] = [];
	const other: string[] = [];
	for (const finding of findings) {
		const match = /Out of scope:\s*([^\s(]+)/iu.exec(finding);
		if (match?.[1]) outOfScope.push(match[1]);
		else other.push(finding);
	}
	return { outOfScope, other };
}
