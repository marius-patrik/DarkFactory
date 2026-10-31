import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { join, relative, resolve, isAbsolute } from "node:path";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { assertMergeAuthorization } from "../../harness/src/graph/approval-evidence.ts";
import { redactErrorMessage } from "../../harness/src/redaction.ts";
import type { RunState } from "../../protocol/src/workflow.ts";

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
	recovery: "pending" | "ready";
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
		.filter(([, value]) => !!value?.approvedFingerprint && !!value?.clean)
		.map(([name]) => name)
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
		recovery: pendingNode || pendingAction ? "pending" : "ready",
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
	let entries: Awaited<ReturnType<typeof readdir>>;
	try {
		entries = await readdir(runs, { withFileTypes: true }) as Awaited<ReturnType<typeof readdir>>;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT")
			throw new OperatorCliError("Production graph run store unavailable at " + safeText(resolve(runs)), 3);
		throw error;
	}
	const ids = entries.filter((entry) => entry.isDirectory() && REQUEST.test(entry.name))
		.map((entry) => parseRequestId(entry.name)).sort((a, b) => a - b);
	const runsFound: OperatorRun[] = [];
	for (const id of ids) runsFound.push(await inspectRequest(runs, id));
	return runsFound;
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
		"  df tui [--runs DIR]    # requires an interactive terminal",
		"  df operator approve|cancel|retry|restart <request-id>  # blocked until governed backend is exposed",
		"Production state is read-only. No operator command bypasses the graph's authorization gates.",
	].join("\n");
}

export async function runOperatorCli(args: string[]): Promise<void> {
	const parsed = parseOperatorArgs(args);
	if (parsed.command === "help") { console.log(operatorHelp()); return; }
	if (["approve", "cancel", "retry", "restart", "recover"].includes(parsed.command)) {
		if (!parsed.id) throw new OperatorCliError(parsed.command + " requires a request ID", 2);
		throw new OperatorCliError("BLOCKED: " + parsed.command +
			" needs an authorized graph lifecycle adapter; no safe mutation API exists on this branch", 3);
	}
	if (parsed.command !== "list" && parsed.command !== "inspect")
		throw new OperatorCliError("Unknown operator command: " + safeText(parsed.command) + "\n" + operatorHelp(), 2);
	if (parsed.command === "list" && parsed.id !== undefined)
		throw new OperatorCliError("list does not accept a request ID", 2);
	if (parsed.command === "inspect" && parsed.id === undefined)
		throw new OperatorCliError("inspect requires a request ID", 2);
	const value = parsed.id === undefined ? await listRequests(parsed.runs) : await inspectRequest(parsed.runs, parsed.id);
	if (parsed.json) { console.log(JSON.stringify({ type: parsed.command, value })); return; }
	const rows = Array.isArray(value) ? value : [value];
	if (!rows.length) { console.log("No durable Request runs."); return; }
	console.log("REQUEST\tNODE\tQUOTA\tRECOVERY\tPR\tAPPROVAL");
	for (const run of rows) {
		console.log([run.request, run.node, run.quotaBlocked ? "blocked" : "ready", run.recovery,
			run.pr ? "#" + run.pr.number : "-", run.approval].join("\t"));
	}
	if (!Array.isArray(value)) console.log(JSON.stringify(value, null, 2));
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

export function renderTui(runs: readonly OperatorRun[], cursor: TuiCursor, columns: number, rows: number, note = ""): string {
	const width = Math.max(24, columns || 80);
	const height = Math.max(8, rows || 24);
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
		if (picked.pr) lines.push("Checks SHA: " + (picked.pr.checkedSha ?? "not observed"),
			"Live PR/check progression unavailable: missing authenticated observation interface.");
	} else if (view === "providers") {
		lines.push("Provider/account/quota backend not connected to this read-only TUI.",
			"Use df quota --json and df accounts for available provider observations.");
	} else if (view === "recovery") {
		lines.push("Recovery: " + picked.recovery, "Pending action: " + (picked.pendingAction ?? "none"),
			"Mutation blocked without a durable graph reconciliation/authorization adapter.");
	}
	lines.push("", note || "↑↓ select · ←→/Tab views · r refresh · q exit · a approve · c cancel · x retry");
	return lines.slice(0, height).map((line) => safeText(line).slice(0, width)).join("\n");
}

/** Raw-mode cleanup, terminal resize and errors are all handled in the same interactive session. */
export async function runOperatorTui(args: string[]): Promise<void> {
	const parsed = parseOperatorArgs(["list", ...args]);
	if (parsed.id !== undefined || parsed.json) throw new OperatorCliError("TUI only supports --runs DIR", 2);
	if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function")
		throw new OperatorCliError("Interactive TUI requires an attached input and output TTY", 3);
	let runs = await listRequests(parsed.runs);
	let cursor: TuiCursor = { selected: 0, view: 0 };
	let note = "";
	const render = () => stdout.write("\u001b[H\u001b[2J" + renderTui(runs, cursor, stdout.columns, stdout.rows, note));
	emitKeypressEvents(stdin);
	const oldRaw = stdin.isRaw === true;
	stdin.setRawMode(true);
	stdin.resume();
	stdout.write("\u001b[?1049h\u001b[?25l");
	process.on("SIGWINCH", render);
	try {
		render();
		await new Promise<void>((done, reject) => {
			const keypress = (_: string, key: { name?: string; ctrl?: boolean } = {}) => {
				const name = key.name ?? "";
				if (name === "q" || name === "escape" || (key.ctrl && name === "c")) { done(); return; }
				if (name === "r") {
					void listRequests(parsed.runs).then((next) => {
						runs = next;
						cursor = { ...cursor, selected: Math.min(cursor.selected, Math.max(0, runs.length - 1)) };
						note = "Refreshed from durable state";
						render();
					}).catch((error: unknown) => {
						note = safeText(error);
						render();
					});
					return;
				}
				if (name === "a" || name === "c" || name === "x") {
					note = "BLOCKED: requires governed graph " + ({ a: "approval", c: "cancellation", x: "retry" } as Record<string, string>)[name] + " API";
				} else { cursor = stepCursor(cursor, name, runs.length); note = ""; }
				render();
			};
			stdin.on("keypress", keypress);
			const fail = (error: Error) => { stdin.off("keypress", keypress); reject(error); };
			stdin.once("error", fail);
			const cleanup = () => { stdin.off("keypress", keypress); stdin.off("error", fail); };
			// Keep listeners scoped to this session even on signal-driven exit.
			void Promise.resolve().then(() => undefined);
			const originalDone = done;
			done = () => { cleanup(); originalDone(); };
		});
	} finally {
		process.off("SIGWINCH", render);
		stdout.write("\u001b[?25h\u001b[?1049l");
		stdin.setRawMode(oldRaw);
		stdin.pause();
	}
}
