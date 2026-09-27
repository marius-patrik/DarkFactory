import type { CanonicalStatus } from "@darkfactory/protocol/workflow";
import { issueUrl, repoAndNumberFromContent } from "./bindings.ts";
import { BoardGroup, type BoardTarget, ProjectClient, type ReconcilableBoard } from "./client.ts";
import type { BoardGraphqlClient, BoardItemContent, BoardItemNode } from "./graphql.ts";
import type { BoardRestClient, RestIssue } from "./rest.ts";
import type { BoardRun } from "./run.ts";
import { expectedStatus, statusOfFieldValues } from "./status.ts";
import { isStatusLabel, isTerminalStatus } from "./taxonomy.ts";

/**
 * Self-healing: bringing the boards back into agreement with the repository.
 *
 * A board is never *wrong*, only quietly incomplete. An item reaches a board by passing through a
 * lifecycle event, so anything opened while the automation could not write is absent and stays
 * absent. These passes exist so that absence has a repair, and so an item that drifted - a stale
 * terminal label on an open issue, a closed issue still reading `In Progress` - is corrected by the
 * same projection the events use rather than by a second, gentler rule set.
 */

/** How long to wait between board writes, to stay clear of a secondary rate limit. */
const WRITE_PACING_MS = 50;

/** Pause between writes so a long sweep does not trip a secondary rate limit. */
function pace(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, WRITE_PACING_MS);
	});
}

/** What a reconciliation pass changed, counted by the kind of correction. */
export interface ReconcileSummary {
	readonly itemsScanned: number;
	readonly corrections: ReconcileCorrections;
	readonly dryRun: boolean;
	readonly skipped?: boolean;
}

/** One counter per kind of fault a pass repairs. */
export interface ReconcileCorrections {
	missing_from_board: number;
	status_updated: number;
	closed_not_terminal: number;
	open_terminal: number;
	board_status_mismatch: number;
	labels_corrected: number;
	no_status_label: number;
	label_mismatch: number;
	multiple_status_labels: number;
}

/** A summary with every counter at zero. */
function emptyCorrections(): ReconcileCorrections {
	return {
		missing_from_board: 0,
		status_updated: 0,
		closed_not_terminal: 0,
		open_terminal: 0,
		board_status_mismatch: 0,
		labels_corrected: 0,
		no_status_label: 0,
		label_mismatch: 0,
		multiple_status_labels: 0,
	};
}

/** Label names on a REST label list. */
function restLabelNames(labels: RestIssue["labels"]): string[] {
	return (labels ?? []).flatMap((label) => {
		const name = typeof label === "string" ? label : label?.name;
		return name ? [name] : [];
	});
}

/** Label names on a GraphQL `labels(first: 10)` connection. */
function graphQLLabelNames(content: BoardItemContent): string[] {
	return (content.labels?.nodes ?? []).flatMap((label) => (label?.name ? [label.name] : []));
}

/** The boards behind a target, whether it is one board or a group. */
function boardsOf(target: ReconcilableBoard): readonly ReconcilableBoard[] {
	return target instanceof BoardGroup ? target.clients : [target];
}

/** Everything a reconciliation pass needs from the process around it. */
export interface ReconcileDeps {
	readonly run: BoardRun;
	readonly rest: BoardRestClient;
	readonly graphql: BoardGraphqlClient;
	/** The repositories to scan. */
	readonly repoSlugs: readonly string[];
	/** The board titles by project number, when the caller has resolved them. */
	readonly titleByNumber: ReadonlyMap<number, string>;
	/** Which items the passes list: `all`, `open` or `closed`. */
	readonly state: string;
	/** The title of the board aggregating every repository. */
	readonly globalTitle: string;
}

/** What one pass repairs, and where it should look. */
export interface ReconcileOptions {
	/** The boards to reconcile, or the single board or group a caller already resolved. */
	readonly target?: ReconcilableBoard;
	/** Detect and report corrections without writing. */
	readonly dryRun?: boolean;
	/** The login that owns the boards, for boards the caller did not resolve. */
	readonly owner?: string;
	/** Restrict the pass to these project numbers. */
	readonly boardNumbers?: readonly number[] | null;
	/** Which items to list, overriding the run's configured state. */
	readonly state?: string;
}

/**
 * Tracks every issue and pull request in a repository onto the boards.
 *
 * Membership first, statuses second: a board that is missing the item cannot have its status
 * corrected. Items are tracked with the fast path off, so the pass diffs against the board listing
 * it has already loaded and writes only what differs.
 */
export async function reconcileMembership(
	target: ReconcilableBoard,
	repo: string,
	deps: ReconcileDeps,
	state?: string,
): Promise<number> {
	const { run } = deps;
	if (!run.canReconcile()) {
		run.notice(`Quota reserve preserved (${run.graphqlRemaining} remaining); skipping bulk reconciliation.`);
		return 0;
	}
	await target.loadExistingItems();

	let tracked = 0;
	for (const entry of await deps.rest.listIssuesAndPrs(repo, state ?? deps.state, 5000)) {
		if (!run.canMutate()) break;
		const url = entry.html_url;
		if (!url) continue;
		const isPr = Boolean(entry.pull_request);
		const status = expectedStatus({ ...entry, is_pr: isPr, kind: isPr ? "PullRequest" : "Issue" });
		await target.track(url, status, { contentId: entry.node_id, fastPath: false });
		if (entry.number) await target.setStatusLabel(repo, entry.number, status, entry.labels);
		tracked += 1;
		await pace();
	}

	run.say(`Reconciled membership for ${repo}: ${tracked} item(s) checked/tracked.`);
	return tracked;
}

/**
 * Brings every board item's status back into agreement with the repository.
 *
 * Reads the board listing once and rewrites only the items whose projected status differs. It runs
 * last, after membership and the correction pass, because it is the one pass that can see an item
 * the earlier passes have not written yet.
 */
export async function reconcileStatuses(target: ReconcilableBoard, deps: ReconcileDeps): Promise<void> {
	const { run } = deps;
	for (const board of boardsOf(target)) {
		const projectId = await board.projectId();
		if (projectId === null) continue;
		const items: readonly BoardItemNode[] = board.rawItems ?? (await deps.graphql.fetchBoardItems(projectId, 2000));
		const existing = await board.loadExistingItems();

		for (const item of items) {
			if (!run.canMutate()) break;
			const itemId = item.id;
			const content: BoardItemContent = item.content ?? {};
			const url = content.url ?? null;
			if (!itemId || !url) continue;

			const current = statusOfFieldValues(item.fieldValues);
			const labels = graphQLLabelNames(content);
			const wanted = expectedStatus({ ...content, labels });

			if (wanted !== current && (await board.editStatus(itemId, wanted))) {
				run.recordMutation();
				existing.set(url, { itemId, status: wanted });
				run.say(`Reconciled item ${itemId} (${content.title ?? ""}): ${current ?? "None"} -> ${wanted}`);
				await pace();
			}

			const { repo, number } = repoAndNumberFromContent(content, url);
			if (repo && number) await board.setStatusLabel(repo, number, wanted, labels);
		}
	}
}

/**
 * Reconciles every declared board and repository into strict agreement with `expectedStatus`.
 *
 * For each board and each repository it carries: adds missing items, sets the board status, and
 * applies exactly one status label while preserving every non-status label. A dry run answers "how
 * far has this board drifted" without writing.
 *
 * Repairs are counted separately because they call for different responses. A missing item is a
 * completeness problem and a batch is the fix; a closed issue reading `In Progress` is a projection
 * problem, and seeing many of them means the projection is wrong rather than the board.
 */
export async function reconcile(options: ReconcileOptions, deps: ReconcileDeps): Promise<ReconcileSummary> {
	const { run } = deps;
	const corrections = emptyCorrections();
	const dryRun = options.dryRun === true;

	if (!dryRun && !run.canReconcile()) {
		run.notice(`Quota reserve preserved (${run.graphqlRemaining} remaining); skipping bulk reconciliation.`);
		return { itemsScanned: 0, corrections, dryRun, skipped: true };
	}

	const boards: ReconcilableBoard[] = options.target
		? [...boardsOf(options.target)]
		: (options.boardNumbers ?? []).map(
				(number) =>
					new ProjectClient({
						owner: options.owner ?? "",
						projectNumber: number,
						rest: deps.rest,
						graphql: deps.graphql,
						run,
					}),
			);

	let totalScanned = 0;
	for (const board of boards) {
		const title = deps.titleByNumber.get(board.projectNumber) ?? "";
		const isGlobal = title.toLowerCase() === deps.globalTitle.toLowerCase();
		const existing = await board.loadExistingItems();

		for (const repo of deps.repoSlugs) {
			if (!repo) continue;
			const repoName = repo.split("/").at(-1) ?? repo;
			if (!isGlobal) {
				// A scoped board carries only its own repository. With an unknown title the only
				// repository it can be said to carry is the one this run belongs to; every other
				// repository is aggregated on the global board alone.
				if (title) {
					if (repoName.toLowerCase() !== title.toLowerCase() && repo.toLowerCase() !== title.toLowerCase()) continue;
				} else if (repo !== deps.repoSlugs[0]) continue;
			}

			for (const item of await deps.rest.listIssuesAndPrs(repo, options.state ?? deps.state, 5000)) {
				if (!dryRun && !run.canMutate()) break;
				totalScanned += 1;

				const url = (item.html_url ?? item.url) as string | undefined;
				if (!url) continue;
				const number = item.number;
				const statusLabels = new Set(restLabelNames(item.labels).filter((label) => isStatusLabel(label)));
				const expected = expectedStatus(item);

				const known = existing.get(url);
				if (!known) {
					corrections.missing_from_board += 1;
					corrections.status_updated += 1;
					if (!dryRun && run.canMutate()) {
						const itemId = await board.addItem(url, item.node_id);
						if (itemId !== null) {
							run.recordMutation();
							if (await board.editStatus(itemId, expected)) {
								run.recordMutation();
								existing.set(url, { itemId, status: expected });
							}
						}
					}
				} else if (known.status !== expected) {
					corrections.status_updated += 1;
					const state = String(item.state ?? "").toUpperCase();
					const closed = state === "CLOSED" || state === "MERGED" || Boolean(item.merged);
					if (closed && !isTerminalStatus(known.status ?? "")) corrections.closed_not_terminal += 1;
					else if (!closed && isTerminalStatus(known.status ?? "")) corrections.open_terminal += 1;
					else corrections.board_status_mismatch += 1;

					if (!dryRun && run.canMutate() && (await board.editStatus(known.itemId, expected))) {
						run.recordMutation();
						existing.set(url, { itemId: known.itemId, status: expected });
					}
				}

				if (statusLabels.size !== 1 || !statusLabels.has(expected)) {
					corrections.labels_corrected += 1;
					if (statusLabels.size === 0) corrections.no_status_label += 1;
					else if (statusLabels.size > 1) corrections.multiple_status_labels += 1;
					else corrections.label_mismatch += 1;

					if (!dryRun && run.canMutate() && number) {
						await board.setStatusLabel(repo, number, expected, item.labels);
					}
				}
			}
		}
	}

	const mode = dryRun ? "dry-run" : "live";
	run.say(
		`Reconciliation (${mode}): scanned ${totalScanned} item(s); ` +
			`missing_from_board=${corrections.missing_from_board}, ` +
			`status_updated=${corrections.status_updated} ` +
			`(closed_not_terminal=${corrections.closed_not_terminal}, ` +
			`open_terminal=${corrections.open_terminal}, ` +
			`board_status_mismatch=${corrections.board_status_mismatch}), ` +
			`labels_corrected=${corrections.labels_corrected} ` +
			`(no_status_label=${corrections.no_status_label}, ` +
			`label_mismatch=${corrections.label_mismatch}, ` +
			`multiple_status_labels=${corrections.multiple_status_labels}).`,
	);
	return { itemsScanned: totalScanned, corrections, dryRun };
}

/**
 * Applies a status to an issue a pull request or commit binds, the form all three handlers use.
 *
 * The label goes on the issue, the board item follows, and a terminal binding also closes the issue
 * - because an issue whose work merged is finished, and leaving it open is what keeps a `Done` label
 * and an open state disagreeing.
 */
export async function applyBoundIssueStatus(
	target: BoardTarget,
	repo: string,
	number: number,
	status: CanonicalStatus,
	close: boolean,
): Promise<void> {
	await target.setStatusLabel(repo, number, status);
	await target.track(issueUrl(repo, number), status, { fastPath: true });
	if (close) await target.closeIssue(repo, number, "completed");
}
