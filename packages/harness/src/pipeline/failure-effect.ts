/**
 * The identity of a pipeline failure, and the election that bounds repair.
 *
 * A failure is repaired by committing, and committing turns CI red again, so an unbounded
 * "dispatch on failure" loop is the reason the `pipeline-failure` label was once used as a mute.
 * A label cannot bound that loop: it is a human-readable triage tag a human may add to any issue,
 * and gating a mutation on one is what made the loop impossible to resume.
 *
 * What bounds it here is the identity of the *failing run* - the workflow that failed plus that
 * run's own id - which the failure reporter records in the issue body. One repair is in flight per
 * failing run, elected rather than check-then-act, so DF-RULE-018's "concurrent duplicates cannot
 * both enter the mutation" holds without a new store. The workflow half of the identity lives in
 * the body rather than the title so retitling an issue cannot fork it.
 *
 * The election is a pure function of the claim comment ids the API returns. The caller posts a
 * claim and then reads them back; what it does with the answer is decided here.
 */

/** Hidden marker `report-failure.yml`'s runtime writes into every failure issue body. */
const FAILURE_MARKER_RE = /<!--\s*pipeline-failure:\s*([^>]+?)\s*-->/u;

/** The failing run's own id, written into the same body. */
const FAILURE_RUN_RE = /^[ \t]*-[ \t]*Run id:[ \t]*`([^`]+)`/mu;

/** A re-failure is commented onto the still-open issue, so its run identity is in the comment. */
const FAILED_AGAIN_RE = /^Failed again:[ \t]*(\S+)/mu;

/** Opening delimiter of the claim marker left by whichever run won the election. */
export const CLAIM_PREFIX = "<!-- df-dispatch: ";

/** Closing delimiter of the claim marker. */
export const CLAIM_SUFFIX = " -->";

/**
 * The deterministic effect identity of a failure issue body.
 *
 * @param body - The issue body.
 * @returns `"<workflow>@<run id>"`, or `undefined` when the text is not a failure report.
 */
export function failureEffectId(body: string): string | undefined {
	const marker = FAILURE_MARKER_RE.exec(body ?? "");
	const run = FAILURE_RUN_RE.exec(body ?? "");
	if (!marker || !run) return undefined;
	return `${marker[1]?.trim()}@${run[1]}`;
}

/**
 * The effect identity of a `Failed again` re-report on a failure issue.
 *
 * @param issueBody - The body of the issue the comment is on; carries the workflow identity.
 * @param commentBody - The comment body; carries the new run's identity.
 * @returns `"<workflow>@<run url>"`, or `undefined` when this is not a re-failure report.
 */
export function refailureEffectId(issueBody: string, commentBody: string): string | undefined {
	const marker = FAILURE_MARKER_RE.exec(issueBody ?? "");
	const again = FAILED_AGAIN_RE.exec(commentBody ?? "");
	if (!marker || !again) return undefined;
	return `${marker[1]?.trim()}@${again[1]}`;
}

/** One comment row as the paginated read returns it. */
export interface ClaimRow {
	/** The comment id GitHub assigned, which orders the claims. */
	id: number;
	/** The comment body. */
	body: string;
}

/**
 * Parse the per-page JSON arrays `gh api --paginate --jq` prints, one per line.
 *
 * A page that will not parse is skipped rather than failing the run: a malformed read must not turn
 * into a mute, which is the failure mode this whole mechanism exists to remove.
 *
 * @param listed - Command stdout, one JSON array per line.
 * @returns Every comment row across all pages.
 */
export function claimRows(listed: string): ClaimRow[] {
	const rows: ClaimRow[] = [];
	for (const line of (listed ?? "").split("\n")) {
		if (!line.trim()) continue;
		let page: unknown;
		try {
			page = JSON.parse(line);
		} catch {
			continue;
		}
		if (!Array.isArray(page)) continue;
		for (const row of page) {
			if (row !== null && typeof row === "object") {
				const candidate = row as { id?: unknown; b?: unknown; body?: unknown };
				const id = Number(candidate.id);
				const body = typeof candidate.b === "string" ? candidate.b : (candidate.body ?? "");
				if (Number.isFinite(id)) rows.push({ id, body: String(body) });
			}
		}
	}
	return rows;
}

/**
 * The claim marker for one effect identity.
 *
 * @param effect - The effect identity.
 * @returns The exact comment body every contender posts.
 */
export function claimBody(effect: string): string {
	return `${CLAIM_PREFIX}${effect}${CLAIM_SUFFIX}`;
}

/**
 * Decide whether this run won the election to repair a failure.
 *
 * Every contender posts the same claim and the one GitHub assigned the lowest comment id wins, so
 * two runs racing one failure cannot both enter the repair. A run that cannot tell the claims apart
 * dispatches rather than mutes, because a mute is the failure mode this exists to remove.
 *
 * @param effect - The effect identity being claimed.
 * @param rows - Every comment row read back from the pull request, across all pages.
 * @param claimSucceeded - Whether this run's own claim was written.
 * @returns `true` when this run may dispatch the repair.
 */
export function decideClaimElection(effect: string, rows: readonly ClaimRow[], claimSucceeded: boolean): boolean {
	if (!claimSucceeded) return false;
	const wanted = claimBody(effect);
	const claims = rows
		.filter((row) => row.body.trim() === wanted)
		.map((row) => row.id)
		.sort((a, b) => a - b);
	// GitHub issues comment ids in creation order, so the lowest claim is the earliest writer and
	// the highest is this run's own. A single claim, or an unreadable set, is this run's to take.
	if (claims.length > 0 && claims[0] !== claims[claims.length - 1]) return false;
	return true;
}
