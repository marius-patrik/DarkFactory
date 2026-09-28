/** @packageDocumentation
 * Deciding whether a branch's required status checks need reconciling.
 *
 * Installing the pipeline must not switch protection on for a repository that has not asked for it.
 * But where protection already exists, leaving it demanding contexts that no longer report is worse
 * than not touching it at all: every merge blocks, and the reason is a string mismatch nothing
 * surfaces.
 *
 * That is what a re-install did to ChessWithQuests. Its protection required
 * `pipeline / pipeline (3.10)` from the caller job the previous installation happened to name, the
 * new caller reports `ci / pipeline (3.10)`, and the pull request sat unmergeable with nine checks
 * "expected" and nine green ones ignored.
 *
 * So the four outcomes are distinguished rather than collapsed into "needs updating or not": a branch
 * with no protection, a branch whose protection carries no checks at all, a branch already matching,
 * and a branch that has genuinely drifted. Only the last one is written to.
 */

/** What reconciling one branch's required checks concluded. */
export type RequiredChecksOutcome =
	/** The branch carries no protection. Installing must not create it. */
	| "unprotected"
	/** The branch is protected but declares no required checks. Nothing to reconcile. */
	| "unchecked"
	/** The required contexts already match. */
	| "current"
	/** The required contexts differ, and are named here. */
	| "drifted";

/** The conclusion drawn about one branch's required status checks. */
export interface RequiredChecksAssessment {
	outcome: RequiredChecksOutcome;
	/** Contexts currently required, sorted; empty unless the branch declares some. */
	current: string[];
	/** Contexts the pipeline requires, sorted. */
	required: string[];
}

/** Reads the `required_status_checks.contexts` array out of a protection document, if it is there. */
function declaredContexts(protection: unknown): string[] | undefined {
	const checks = (protection as { required_status_checks?: { contexts?: unknown } })?.required_status_checks;
	if (!Array.isArray(checks?.contexts)) return undefined;
	return checks.contexts.map((entry) => String(entry));
}

/**
 * Classifies one branch's required status checks.
 *
 * The comparison is order-insensitive: GitHub returns the contexts in its own order, and a
 * reordering is not a drift worth a write.
 *
 * @param protection The decoded protection document, or `null` when the branch has no protection.
 * @param required The contexts the pipeline requires.
 * @returns Which of the four outcomes applies, with both context lists.
 */
export function assessRequiredChecks(protection: unknown, required: readonly string[]): RequiredChecksAssessment {
	const wanted = [...required].sort();
	if (protection === null || protection === undefined) {
		return { outcome: "unprotected", current: [], required: wanted };
	}
	const contexts = declaredContexts(protection);
	if (contexts === undefined) return { outcome: "unchecked", current: [], required: wanted };
	const current = [...contexts].sort();
	const unchanged = current.length === wanted.length && current.every((name, index) => name === wanted[index]);
	return { outcome: unchanged ? "current" : "drifted", current, required: wanted };
}

/** The branch protection paths the reconciler reads and writes, for one development branch. */
export function protectionPaths(
	slug: string,
	branch: string,
): {
	read: string;
	write: string;
} {
	const base = `repos/${slug}/branches/${branch}/protection`;
	return { read: base, write: `${base}/required_status_checks` };
}

/** The request body that brings a branch's required checks in line with the pipeline's. */
export function requiredStatusChecksBody(required: readonly string[]): {
	strict: true;
	contexts: readonly string[];
} {
	return { strict: true, contexts: required };
}
