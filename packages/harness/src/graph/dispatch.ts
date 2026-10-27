import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GitHubClient } from "../../../github/src/client.ts";
import { GitHubRepository } from "../../../github/src/repository.ts";
import { bundledGraphPath } from "./assets.ts";
import { type CheckStateSource, type ChecksGateResult, evaluateChecksGate } from "./checks-gate.ts";
import { type TranslatedEvent, translateGitHubEvent } from "./events.ts";
import { runGraph, type NodeHandlers, type RunGraphOptions } from "./executor.ts";
import type { WorkflowGraph } from "./types.ts";
import { plan } from "./planner.ts";
import { loadRunState, saveRunState } from "./run-state.ts";
import { validateGraph } from "./validator.ts";

/**
 * Options for the dispatch command.
 * Controls input paths, output behavior, and overrides.
 */
interface DispatchOptions {
	eventName: string;
	eventPath: string;
	graphPath?: string;
	runsPath?: string;
}

/** A graph runtime is composed by the caller; dispatch never invents model or credential adapters. */
export interface DispatchRuntime {
	handlers: NodeHandlers;
	onAction?: RunGraphOptions["onAction"];
	reconcileAction?: RunGraphOptions["reconcileAction"];
	effects?: RunGraphOptions["effects"];
	/** Observe every declared required external check for the event commit SHA. */
	verifyChecks?(sha: string): Promise<"required_green" | "failed" | "pending">;
	verifyPlanningContext?: RunGraphOptions["verifyPlanningContext"];
}

export interface DispatchRuntimeInput {
	subject: string;
	runDir: string;
	graph: WorkflowGraph;
}

interface GitHubTokenEnv {
	GH_TOKEN?: string;
	GITHUB_TOKEN?: string;
}

interface GitHubRepoEnv {
	GITHUB_REPOSITORY?: string;
}

function parseArgs(argv: string[]): DispatchOptions {
	const args: DispatchOptions = {
		eventName: "",
		eventPath: "",
	};

	let i = 0;
	while (i < argv.length) {
		const arg = argv[i++];
		switch (arg) {
			case "--event-name":
				args.eventName = argv[i++] ?? "";
				break;
			case "--event":
				args.eventPath = argv[i++] ?? "";
				break;
			case "--graph":
				if (i < argv.length) args.graphPath = argv[i++];
				break;
			case "--runs":
				if (i < argv.length) args.runsPath = argv[i++];
				break;
		}
	}

	return args;
}

async function readJsonFile(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"));
}

function extractSubject(translated: TranslatedEvent & { kind: "event" }): string {
	return `${translated.subject.number}`;
}

function githubCheckSource(token: string, repository: string): CheckStateSource {
	const [owner, repo] = repository.split("/");
	if (!owner || !repo) throw new Error("Invalid GITHUB_REPOSITORY format");
	const repoInstance = new GitHubRepository(new GitHubClient({ token }), owner, repo);
	return { checkStates: (ref) => repoInstance.checkStates(ref) };
}

/**
 * Dispatch a workflow based on a GitHub event.
 * @param argv - Command line arguments passed to the dispatch command.
 * @param options - Optional overrides, such as a custom check state source.
 * @returns A promise that resolves when dispatch processing is complete.
 */
export async function dispatch(
	argv: string[],
	options?: {
		checkStateSource?: CheckStateSource;
		/** Execute the canonical graph instead of merely emitting a planning preview. */
		runtime?: (input: DispatchRuntimeInput) => Promise<DispatchRuntime>;
		/** GitHub delivery ID when available; otherwise a stable event-body fingerprint is used. */
		deliveryId?: string;
	},
): Promise<void> {
	const opts = parseArgs(argv);

	// Load the event payload
	const eventPayload = await readJsonFile(opts.eventPath);

	// Translate the GitHub event
	const translated = translateGitHubEvent(opts.eventName, eventPayload);

	// Handle skip case
	if (translated.kind === "skip") {
		console.log(JSON.stringify({ type: "skip", reason: translated.reason }));
		return;
	}

	// Load the graph
	const graphPath = opts.graphPath ?? bundledGraphPath();
	const document = JSON.parse(await readFile(graphPath, "utf8")) as unknown;
	const workflowGraph = validateGraph(
		document && typeof document === "object" && "graph" in document ? (document as { graph: unknown }).graph : document,
	);

	// For checks.completed events, evaluate the checks gate if tokens are present
	let gateResult: ChecksGateResult | undefined;

	if (translated.event.type === "checks.completed" && !options?.runtime) {
		const env: GitHubTokenEnv & GitHubRepoEnv = {
			GH_TOKEN: process.env.GH_TOKEN,
			GITHUB_TOKEN: process.env.GITHUB_TOKEN,
			GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
		};
		const token = env.GH_TOKEN || env.GITHUB_TOKEN;
		const source = options?.checkStateSource ??
			(token && env.GITHUB_REPOSITORY ? githubCheckSource(token, env.GITHUB_REPOSITORY) : undefined);
		if (!source && options?.runtime) {
			throw new Error("Production graph checks ingress requires authoritative GitHub check-state readback");
		}
		if (source) {
			const sha = translated.subject.ref ?? "";
			if (!/^[0-9a-f]{40}$/iu.test(sha)) {
				throw new Error("Production checks ingress lacks an immutable commit SHA");
			}
			gateResult = await evaluateChecksGate(workflowGraph, source, sha);
			if (gateResult.conclusion === "pending") {
				console.log(JSON.stringify({ type: "none", reason: "required checks pending" }));
				return;
			}
			(translated.event as { type: "checks.completed"; conclusion: string }).conclusion =
				gateResult.conclusion === "required_green" ? "required_green" : "failed";
		}
	}

	// Get the subject number
	const subject = extractSubject(translated);

	// Load or create RunState
	const runsDir = opts.runsPath ?? ".darkfactory/runs";
	if (options?.runtime) {
		const runDir = join(runsDir, subject);
		const runtime = await options.runtime({ subject, runDir, graph: workflowGraph });
		if (translated.event.type === "checks.completed") {
			const ref = translated.subject.ref;
			if (!ref || !/^[a-f0-9]{40}$/iu.test(ref))
				throw new Error("Production checks event lacks exact immutable head SHA");
			if (!runtime.verifyChecks)
				throw new Error("Production graph execution requires authoritative external check readback");
			const observed = await runtime.verifyChecks(ref);
			if (observed === "pending") {
				console.log(JSON.stringify({ type: "none", subject, reason: "required external checks pending" }));
				return;
			}
			translated.event.conclusion = observed;
		}
		const eventId = options.deliveryId ?? createHash("sha256")
			.update(JSON.stringify([opts.eventName, eventPayload])).digest("hex");
		const state = await runGraph(workflowGraph, runDir, runtime.handlers, translated.event, {
			eventId,
			...(runtime.effects ? { effects: runtime.effects } : {}),
			...(runtime.verifyPlanningContext ? { verifyPlanningContext: runtime.verifyPlanningContext } : {}),
			...(runtime.onAction ? { onAction: runtime.onAction } : {}),
			...(runtime.reconcileAction ? { reconcileAction: runtime.reconcileAction } : {}),
		});
		console.log(JSON.stringify({ type: "executed", subject, event: translated.event.type,
			run_id: state.run_id, current_node: state.current_node, quota_blocked: !!state.quota_blocked }));
		return;
	}
	const runState = await loadRunState(runsDir, subject, workflowGraph);

	// Plan the action
	const action = plan(workflowGraph, translated.event, runState);

	// Advance the run state to the selected node before persisting
	if (action.type !== "none") {
		if (action.type === "run" && action.nodes.length > 0) {
			const firstNode = action.nodes[0];
			if (firstNode) runState.current_node = firstNode;
		} else if (action.type === "gate" || action.type === "hint" || action.type === "comment") {
			runState.current_node = action.node;
		}
	}

	// Prepare the base output
	const baseOutput = {
		subject,
		event: translated.event.type,
		current_node: runState.current_node,
		action: action.type,
		commands: action.type === "run" && action.nodes ? action.nodes.map((id) => `bun df run --node ${id}`) : [],
		execution: "not_run",
	};

	// If this is a checks.completed event with a non‑pending gate result, emit the checks JSON
	const output =
		translated.event.type === "checks.completed" && gateResult && gateResult.conclusion !== "pending"
			? {
					...baseOutput,
					type: "checks",
					result: gateResult.conclusion === "required_green" ? "pass" : "fail",
				}
			: baseOutput;

	// Print the output
	console.log(JSON.stringify(output));

	await saveRunState(runsDir, subject, runState);
}

export type { TranslatedEvent } from "./events.ts";
