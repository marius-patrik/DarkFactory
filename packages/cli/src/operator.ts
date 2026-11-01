import type { Dirent } from "node:fs";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { join, relative, resolve, isAbsolute } from "node:path";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { assertMergeAuthorization } from "../../harness/src/graph/approval-evidence.ts";
import { bundledGraphPath } from "../../harness/src/graph/assets.ts";
import { validateGraph } from "../../harness/src/graph/validator.ts";
import { GitHubClient } from "../../github/src/client.ts";
import { GitHubRepository } from "../../github/src/repository.ts";
import { reviewApprovalFresh } from "../../harness/src/graph/review-loop.ts";
import { redactErrorMessage } from "../../harness/src/redaction.ts";
import type { RunState } from "../../protocol/src/workflow.ts";
import type { OperatorQuotaSnapshot } from "../../protocol/src/quota.ts";

/** An operator command cannot silently succeed without an authoritative backend. */
export class OperatorCliError extends Error {
	constructor(message: string, readonly exitCode: number = 3) {
		super(message);
		this.name = "OperatorCliError";
	}
}

export interface OperatorRun {
	request: number;
	runId: string;
	node: string;
	iterations: Record<string, number>;
	quotaBlocked: boolean;
	pendingNode: string | null;
	pendingAction: string | null;
	pr: { number: number; headSha: string; checkedSha: string | null } | null;
	approval: "valid" | "stale" | "missing";
	approvedReviews: string[];
	recovery: "pending" | "blocked" | "idle";
}

/**
 * DF-09/10/11 integration handoff. The CLI deliberately does not implement these
 * effects from mutable local files or GitHub comments. A production adapter must
 * read back the exact Request/PR/head and enforce graph authorization atomically.
 * Until an adapter is supplied, every mutation remains explicitly blocked.
 */
export interface GovernedOperatorPort {
	observe(request: number): Promise<OperatorRun>;
	approve(input: {
		request: number;
		expectedRunId: string;
		expectedNode: string;
		expectedHeadSha: string;
		actor: string;
	}): Promise<{ result: "observed" | "blocked"; reason?: string }>;
	cancel(input: {
		request: number;
		expectedRunId: string;
		expectedNode: string;
		actor: string;
	}): Promise<{ result: "observed" | "blocked"; reason?: string }>;
	retry(input: {
		request: number;
		expectedRunId: string;
		expectedNode: string;
		actor: string;
	}): Promise<{ result: "observed" | "blocked"; reason?: string }>;
}

const REQUEST = /^[1-9][0-9]*$/u;
const SHA = /^[a-f0-9]{40}$/iu;

export function parseRequestId(value: string): number {
	if (!REQUEST.test(value)) throw new OperatorCliError("Request ID must be a positive decimal integer", 2);
	const number = Number(value);
	if (!Number.isSafeInteger(number)) throw new OperatorCliError("Request ID is out of range", 2);
	return number;
}

function safeText(value: unknown): string {
	return redactErrorMessage(String(value)).replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ");
}

async function checkedStatePath(runs: string, id: number): Promise<string> {
	const root = resolve(runs);
	const dir = join(root, String(id));
	const file = join(dir, "state.df");
	try {
		const base = await realpath(root);
		const info = await lstat(dir);
		if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Run directory is not a regular directory");
		const actual = await realpath(dir);
		const rel = relative(base, actual);
		if (rel === ".." || rel.startsWith("../") || isAbsolute(rel))
			throw new Error("Run directory escapes the selected runs root");
		const state = await lstat(file);
		if (!state.isFile() || state.isSymbolicLink()) throw new Error("Run state is not a regular file");
		return file;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT")
			throw new OperatorCliError("Request #" + id + " has no durable production state", 3);
		throw new OperatorCliError("Cannot trust run state for request #" + id + ": " + safeText(error), 3);
	}
}

/** Never return raw outputs, tokens, prompts or journal entries to an operator surface. */
export function summarizeRun(request: number, state: RunState): OperatorRun {
	if (!state || typeof state.run_id !== "string" || typeof state.current_node !== "string" ||
		!state.outputs || typeof state.outputs !== "object" || Array.isArray(state.outputs))
		throw new OperatorCliError("Malformed durable run state for request #" + request, 3);
	const extra = state as RunState & {
		pending_node?: { node?: unknown };
		pending_action?: { node?: unknown; type?: unknown };
	};
	const output = state.outputs;
	const number = output.pr_number;
	const head = output.commit_sha;
	const checked = output.external_checks_head_sha;
	const pr = Number.isSafeInteger(number) && (number as number) > 0 && typeof head === "string" && SHA.test(head)
		? { number: number as number, headSha: head, checkedSha: typeof checked === "string" && SHA.test(checked) ? checked : null }
		: null;
	let approval: OperatorRun["approval"] = "missing";
	if (output.merge_authorization !== undefined) {
		approval = "stale";
		try {
			assertMergeAuthorization(output);
			approval = "valid";
		} catch {
			// Stale approval is observable information, never permission to merge.
		}
	}
	const approvedReviews = Object.entries(state.reviews ?? {})
		.filter(([, value]) => reviewApprovalFresh(value))
		.map(([name]) => safeText(name))
		.sort();
	const pendingNode = typeof extra.pending_node?.node === "string" ? safeText(extra.pending_node.node) : null;
	const pendingAction = typeof extra.pending_action?.type === "string"
		? safeText(extra.pending_action.type) + (typeof extra.pending_action.node === "string" ?
			" (" + safeText(extra.pending_action.node) + ")" : "")
		: null;
	return {
		request,
		runId: safeText(state.run_id),
		node: safeText(state.current_node),
		iterations: Object.fromEntries(Object.entries(state.iterations ?? {})
			.filter(([key, value]) => typeof value === "number" && Number.isSafeInteger(value))
			.map(([key, value]) => [safeText(key), value])),
		quotaBlocked: state.quota_blocked === true,
		pendingNode,
		pendingAction,
		pr,
		approval,
		approvedReviews,
		recovery: pendingNode || pendingAction ? "pending" : state.quota_blocked === true ? "blocked" : "idle",
	};
}

export async function inspectRequest(runs: string, id: number): Promise<OperatorRun> {
	const path = await checkedStatePath(runs, id);
	try {
		return summarizeRun(id, JSON.parse(await readFile(path, "utf8")) as RunState);
	} catch (error) {
		if (error instanceof OperatorCliError) throw error;
		throw new OperatorCliError("Unreadable or corrupt durable state for request #" + id + ": " + safeText(error), 3);
	}
}

export async function listRequests(runs: string): Promise<OperatorRun[]> {
	let entries: Dirent[];
	try {
		entries = await readdir(runs, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT")
			throw new OperatorCliError("Production graph run store unavailable at " + safeText(resolve(runs)), 3);
		throw new OperatorCliError("Cannot read production run store: " + safeText(error), 3);
	}
	const ids = entries.filter((entry) => entry.isDirectory() && REQUEST.test(entry.name))
		.map((entry) => parseRequestId(entry.name)).sort((a, b) => a - b);
	const runsFound: OperatorRun[] = [];
	for (const id of ids) runsFound.push(await inspectRequest(runs, id));
	return runsFound;
}

/** Exact-head GitHub observation. Never interprets a passing check as approval to merge. */
export interface OperatorCheckSnapshot {
	request: number;
	pr: number;
	persistedHead: string;
	observedHead: string;
	headMatches: boolean;
	state: "green" | "pending" | "failed" | "stale";
	required: readonly string[];
	missing: readonly string[];
	failing: readonly string[];
	mergeAuthorization: OperatorRun["approval"];
}

export async function inspectChecks(runs: string, id: number): Promise<OperatorCheckSnapshot> {
	const snapshot = await inspectRequest(runs, id);
	if (!snapshot.pr) throw new OperatorCliError("BLOCKED: Request #" + id + " has no observed PR and commit SHA", 3);
	const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
	const slug = process.env.GITHUB_REPOSITORY ?? process.env.DF_REPO;
	if (!token || !slug || !/^[^/\s]+\/[^/\s]+$/u.test(slug))
		throw new OperatorCliError("BLOCKED: exact-head checks require GH_TOKEN and GITHUB_REPOSITORY", 3);
	const [owner, name] = slug.split("/");
	const repo = new GitHubRepository(new GitHubClient({ token }), owner!, name!);
	try {
		const source = JSON.parse(await readFile(bundledGraphPath(), "utf8")) as unknown;
		const graph = validateGraph(source && typeof source === "object" && "graph" in source
			? (source as { graph: unknown }).graph : source);
		const required = graph.checks.filter((item) => item.required).map((item) => item.name);
		if (required.length === 0) throw new Error("Graph has no explicitly required external checks");
		const observedHead = await repo.getPullRequestHeadSha(snapshot.pr.number);
		if (!SHA.test(observedHead)) throw new Error("GitHub PR has no immutable commit SHA");
		if (observedHead !== snapshot.pr.headSha)
			return {
				request: id,
				pr: snapshot.pr.number,
				persistedHead: snapshot.pr.headSha,
				observedHead,
				headMatches: false,
				state: "stale",
				required,
				missing: required,
				failing: [],
				mergeAuthorization: snapshot.approval,
			};
		const checks = await repo.requiredCheckStatus(observedHead, required);
		return {
			request: id,
			pr: snapshot.pr.number,
			persistedHead: snapshot.pr.headSha,
			observedHead,
			headMatches: true,
			state: checks.state === "success" ? "green" : checks.state === "failure" ? "failed" : "pending",
			required,
			missing: checks.missing,
			failing: checks.failing,
			mergeAuthorization: snapshot.approval,
		};
	} catch (error) {
		throw new OperatorCliError("BLOCKED: authoritative GitHub checks unavailable: " + safeText(error), 3);
	}
}

export function parseOperatorArgs(args: readonly string[]): { command: string; id?: number; runs: string; json: boolean } {
	let command = "";
	let id: number | undefined;
	let runs = ".darkfactory/runs";
	let json = false;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--json") { json = true; continue; }
		if (arg === "--runs") {
			const value = args[++i];
			if (!value || value.startsWith("--")) throw new OperatorCliError("--runs requires a directory", 2);
			runs = value;
			continue;
		}
		if (arg?.startsWith("-")) throw new OperatorCliError("Unknown operator option: " + arg, 2);
		if (!command) command = arg ?? "";
		else if (id === undefined) id = parseRequestId(arg ?? "");
		else throw new OperatorCliError("Unexpected operator argument: " + safeText(arg), 2);
	}
	return { command: command || "list", ...(id === undefined ? {} : { id }), runs, json };
}

function operatorHelp(): string {
	return [
		"Usage:",
		"  df operator list [--runs DIR] [--json]",
		"  df operator inspect <request-id> [--runs DIR] [--json]",
		"  df operator checks <request-id> [--runs DIR] [--json]   # GitHub exact-head readback",
		"  df tui [--runs DIR]    # requires an interactive terminal",
		"  df operator approve|cancel|retry|restart|recover <request-id>  # explicitly blocked",
		"Production state is read-only. No operator command bypasses the graph's authorization gates.",
	].join("\n");
}

export async function runOperatorCli(args: string[]): Promise<number> {
	const parsed = parseOperatorArgs(args);
	if (parsed.command === "help") { console.log(operatorHelp()); return 0; }
	if (["approve", "cancel", "retry", "restart", "recover"].includes(parsed.command)) {
		if (!parsed.id) throw new OperatorCliError(parsed.command + " requires a request ID", 2);
		throw new OperatorCliError("BLOCKED: " + parsed.command +
			" needs an authorized graph lifecycle adapter; no safe mutation API exists on this branch", 3);
	}
	if (parsed.command !== "list" && parsed.command !== "inspect" && parsed.command !== "checks")
		throw new OperatorCliError("Unknown operator command: " + safeText(parsed.command) + "\n" + operatorHelp(), 2);
	if (parsed.command === "list" && parsed.id !== undefined)
		throw new OperatorCliError("list does not accept a request ID", 2);
	if ((parsed.command === "inspect" || parsed.command === "checks") && parsed.id === undefined)
		throw new OperatorCliError(parsed.command + " requires a request ID", 2);
	if (parsed.command === "checks") {
		const checks = await inspectChecks(parsed.runs, parsed.id!);
		if (parsed.json) console.log(JSON.stringify({ type: "checks", value: checks }));
		else console.log("PR #" + checks.pr + "  " + checks.state.toUpperCase() +
			"  exact-head: " + checks.headMatches + "  authorization: " + checks.mergeAuthorization +
			"\n" + JSON.stringify(checks, null, 2));
		return checks.state === "green" && checks.headMatches ? 0 : 3;
	}
	const value = parsed.id === undefined ? await listRequests(parsed.runs) : await inspectRequest(parsed.runs, parsed.id);
	if (parsed.json) { console.log(JSON.stringify({ type: parsed.command, value })); return 0; }
	const rows = Array.isArray(value) ? value : [value];
	if (!rows.length) { console.log("No durable Request runs."); return 0; }
	console.log("REQUEST\tNODE\tQUOTA\tRECOVERY\tPR\tAPPROVAL");
	for (const run of rows) {
		console.log([run.request, run.node, run.quotaBlocked ? "blocked" : "ready", run.recovery,
			run.pr ? "#" + run.pr.number : "-", run.approval].join("\t"));
	}
	if (!Array.isArray(value)) console.log(JSON.stringify(value, null, 2));
	return 0;
}

export type TuiView = "requests" | "graph" | "approvals" | "pr" | "providers" | "recovery";
export const TUI_VIEWS: readonly TuiView[] = ["requests", "graph", "approvals", "pr", "providers", "recovery"];
export interface TuiCursor { selected: number; view: number }
export function stepCursor(cursor: TuiCursor, key: string, count: number): TuiCursor {
	if (key === "up" || key === "k") return { ...cursor, selected: Math.max(0, cursor.selected - 1) };
	if (key === "down" || key === "j") return { ...cursor, selected: Math.min(Math.max(0, count - 1), cursor.selected + 1) };
	if (key === "tab" || key === "right" || key === "l")
		return { ...cursor, view: (cursor.view + 1) % TUI_VIEWS.length };
	if (key === "left" || key === "h")
		return { ...cursor, view: (cursor.view + TUI_VIEWS.length - 1) % TUI_VIEWS.length };
	return cursor;
}

export function renderTui(
	runs: readonly OperatorRun[],
	cursor: TuiCursor,
	columns: number,
	rows: number,
	note = "",
	quota?: OperatorQuotaSnapshot,
	checks?: OperatorCheckSnapshot,
): string {
	const width = Math.max(1, columns || 80);
	const height = Math.max(1, rows || 24);
	const picked = runs[cursor.selected];
	const view = TUI_VIEWS[cursor.view] ?? "requests";
	const lines: string[] = [
		"DARKFACTORY / OPERATOR    " + view.toUpperCase(),
		"Requests " + runs.length + " | read-only authoritative graph state",
		"Tabs: " + TUI_VIEWS.map((label, index) => index === cursor.view ? "[" + label + "]" : label).join(" "),
		"─".repeat(Math.min(width, 80)),
	];
	if (view === "requests") {
		for (const [index, run] of runs.entries()) lines.push((index === cursor.selected ? "› " : "  ") +
			"#" + run.request + "  " + run.node + (run.quotaBlocked ? "  [QUOTA BLOCKED]" : ""));
	} else if (view === "providers") {
		if (!quota) {
			lines.push("Provider observations unavailable. Use df quota --json for diagnostics.");
		} else {
			lines.push("Provider observations: " + quota.generatedAt + " (local canonical quota engine)");
			for (const provider of quota.providers) {
				lines.push(provider.id + "  " + provider.state + "  credential: " + provider.credentials);
				for (const account of provider.accounts) {
					lines.push("  @" + account.label);
					for (const model of account.models) {
						const sources = [...new Set(model.items.map((item) => item.source))].join(",");
						lines.push("    " + model.model + "  " + model.state + "  " + (sources || "no observation"));
					}
				}
			}
		}
	} else if (!picked) {
		lines.push("No durable Request selected.");
	} else if (view === "graph") {
		lines.push("Request #" + picked.request, "Current: " + picked.node,
			"Pending node: " + (picked.pendingNode ?? "none"));
		for (const [node, count] of Object.entries(picked.iterations)) lines.push(node + ": " + count + " iteration(s)");
	} else if (view === "approvals") {
		lines.push("Merge authorization: " + picked.approval,
			"Approved reviews: " + (picked.approvedReviews.join(", ") || "none"),
			"NOTE: approval actions require authoritative immutable-head validation.");
	} else if (view === "pr") {
		lines.push(picked.pr ? "PR #" + picked.pr.number + " head " + picked.pr.headSha :
			"No PR head has been recorded.");
		if (picked.pr) {
			lines.push("Recorded checks SHA: " + (picked.pr.checkedSha ?? "not observed"));
			if (checks?.request === picked.request) {
				lines.push("GitHub readback: " + checks.state.toUpperCase(),
					"Exact current head: " + checks.headMatches,
					"Required checks: " + checks.required.join(", "),
					"Missing: " + (checks.missing.join(", ") || "none"),
					"Failing: " + (checks.failing.join(", ") || "none"));
			} else {
				lines.push("Live checks: entering this view fetches authoritative GitHub readback.");
			}
		}
	} else if (view === "recovery") {
		lines.push("Recovery: " + picked.recovery, "Pending action: " + (picked.pendingAction ?? "none"),
			"Mutation blocked without a durable graph reconciliation/authorization adapter.");
	}
	const footer = note || "↑↓ select · ←→/Tab views · r refresh · q exit · a approve · c cancel · x retry";
	const headerRows = Math.min(4, height);
	const footerRows = Math.min(2, Math.max(0, height - headerRows));
	const availableRows = Math.max(0, height - headerRows - footerRows);
	const body = lines.slice(4);
	const offset = view === "requests"
		? Math.min(Math.max(0, cursor.selected - availableRows + 1), Math.max(0, body.length - availableRows))
		: 0;
	const visible = [
		...lines.slice(0, headerRows),
		...body.slice(offset, offset + availableRows),
		...(footerRows === 2 ? ["", footer] : footerRows === 1 ? [footer] : []),
	];
	return visible.map((line) => safeText(line).slice(0, width)).join("\n");
}

/** Raw-mode cleanup, terminal resize and errors are all handled in the same interactive session. */
export async function runOperatorTui(
	args: string[],
	loadQuota?: () => Promise<OperatorQuotaSnapshot>,
): Promise<void> {
	const parsed = parseOperatorArgs(["list", ...args]);
	if (parsed.id !== undefined || parsed.json) throw new OperatorCliError("TUI only supports --runs DIR", 2);
	if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function")
		throw new OperatorCliError("Interactive TUI requires an attached input and output TTY", 3);
	let runs = await listRequests(parsed.runs);
	let quota: OperatorQuotaSnapshot | undefined;
	let quotaStatus = "Provider observations unavailable";
	if (loadQuota) {
		try { quota = await loadQuota(); quotaStatus = ""; }
		catch (error) { quotaStatus = safeText(error); }
	}
	let cursor: TuiCursor = { selected: 0, view: 0 };
	let note = "";
	let closed = false;
	let refreshSequence = 0;
	let checkSequence = 0;
	let checkSnapshot: OperatorCheckSnapshot | undefined;
	const render = () => stdout.write("\u001b[H\u001b[2J" +
		renderTui(runs, cursor, stdout.columns, stdout.rows,
			note || (TUI_VIEWS[cursor.view] === "providers" ? quotaStatus : ""), quota, checkSnapshot));
	const refreshChecks = () => {
		const picked = runs[cursor.selected];
		if (TUI_VIEWS[cursor.view] !== "pr" || !picked?.pr) return;
		const sequence = ++checkSequence;
		note = "Reading immutable GitHub PR head and required checks...";
		render();
		void inspectChecks(parsed.runs, picked.request)
			.then((value) => {
				if (closed || sequence !== checkSequence || runs[cursor.selected]?.request !== value.request) return;
				checkSnapshot = value;
				note = "";
				render();
			}).catch((error: unknown) => {
				if (closed || sequence !== checkSequence) return;
				checkSnapshot = undefined;
				note = safeText(error);
				render();
			});
	};
	emitKeypressEvents(stdin);
	const oldRaw = stdin.isRaw === true;
	stdin.setRawMode(true);
	stdin.resume();
	try {
		stdout.write("\u001b[?1049h\u001b[?25l");
		process.on("SIGWINCH", render);
		stdout.on("resize", render);
		render();
		await new Promise<void>((done, reject) => {
			const keypress = (_: string, key: { name?: string; ctrl?: boolean } = {}) => {
				const name = key.name ?? "";
				if (name === "q" || name === "escape" || (key.ctrl && name === "c")) { cleanup(); done(); return; }
				if (name === "r") {
					const sequence = ++refreshSequence;
					void Promise.all([listRequests(parsed.runs), loadQuota ? loadQuota() : Promise.resolve(undefined)])
						.then(([next, latestQuota]) => {
							if (closed || sequence !== refreshSequence) return;
							runs = next;
							if (latestQuota) { quota = latestQuota; quotaStatus = ""; }
							cursor = { ...cursor, selected: Math.min(cursor.selected, Math.max(0, runs.length - 1)) };
							note = "Refreshed from authoritative snapshots";
							if (TUI_VIEWS[cursor.view] === "pr") refreshChecks();
							else render();
						}).catch((error: unknown) => {
							if (closed || sequence !== refreshSequence) return;
							note = safeText(error);
							render();
						});
					return;
				}
				if (name === "a" || name === "c" || name === "x") {
					note = "BLOCKED: requires governed graph " + ({ a: "approval", c: "cancellation", x: "retry" } as Record<string, string>)[name] + " API";
				} else {
					const next = stepCursor(cursor, name, runs.length);
					const changed = next.view !== cursor.view || next.selected !== cursor.selected;
					cursor = next;
					note = "";
					if (changed && TUI_VIEWS[cursor.view] === "pr") { refreshChecks(); return; }
				}
				render();
			};
			stdin.on("keypress", keypress);
			const fail = (error: Error) => { cleanup(); reject(error); };
			const cleanup = () => { stdin.off("keypress", keypress); stdin.off("error", fail); };
			stdin.once("error", fail);
		});
	} finally {
		closed = true;
		process.off("SIGWINCH", render);
		stdout.off("resize", render);
		stdout.write("\u001b[?25h\u001b[?1049l");
		stdin.setRawMode(oldRaw);
		stdin.pause();
	}
}
