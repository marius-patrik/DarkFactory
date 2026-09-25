import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CapabilityGraphRegistry, CapabilityRuntimeContext } from "@darkfactory/capability";
import {
	type CheckStateSource,
	type ChecksGateResult,
	evaluateChecksGate,
	type NodeHandlers,
	type PlanAction,
	type RunState,
	runGraph,
	type TranslatedEvent,
	translateGitHubEvent,
	validateGraph,
	type WorkflowGraph,
} from "@darkfactory/core/graph";
import { GitHubClient } from "../github/client.ts";
import { GitHubRepository } from "../github/repository.ts";
import { bundledGraphPath } from "./assets.ts";

/** Options for the graph dispatch command. */
export interface DispatchOptions {
	eventName: string;
	eventPath: string;
	graphPath?: string;
	runsPath?: string;
	eventId?: string;
}

export interface DispatchRuntime {
	handlers: NodeHandlers;
	onAction?: (action: Exclude<PlanAction, { type: "run" } | { type: "none" }>, state: RunState) => void | Promise<void>;
	capabilityGraph?: CapabilityGraphRegistry;
	capabilityRuntime?: CapabilityRuntimeContext;
}

export interface DispatchRuntimeInput {
	subject: string;
	runDir: string;
	graph: WorkflowGraph;
	translated: TranslatedEvent & { kind: "event" };
}

interface GitHubTokenEnv {
	GH_TOKEN?: string;
	GITHUB_TOKEN?: string;
}

interface GitHubRepoEnv {
	GITHUB_REPOSITORY?: string;
}

function parseArgs(argv: string[]): DispatchOptions {
	const args: DispatchOptions = { eventName: "", eventPath: "" };
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
			case "--event-id":
				if (i < argv.length) args.eventId = argv[i++];
				break;
		}
	}
	if (!args.eventName) throw new Error("graph dispatch requires --event-name <name>");
	if (!args.eventPath) throw new Error("graph dispatch requires --event <file>");
	return args;
}

function stableEventId(eventName: string, rawPayload: string, explicit?: string): string {
	if (explicit?.trim()) return explicit.trim();
	const runId = process.env.GITHUB_RUN_ID?.trim();
	const repository = process.env.GITHUB_REPOSITORY?.trim() ?? "";
	const identity = runId ? ["github-run", repository, eventName, runId] : ["payload", eventName, rawPayload];
	return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

function extractSubject(translated: TranslatedEvent & { kind: "event" }): string {
	return String(translated.subject.number);
}

function githubCheckSource(token: string, repository: string): CheckStateSource {
	const [owner, repo] = repository.split("/");
	if (!owner || !repo) throw new Error("Invalid GITHUB_REPOSITORY format");
	const repoInstance = new GitHubRepository(new GitHubClient({ token }), owner, repo);
	return { checkStates: (ref) => repoInstance.checkStates(ref) };
}

/**
 * Dispatch one GitHub event through the real persisted graph executor.
 *
 * Actionable events require a production runtime. Planner-only command emission is intentionally unsupported.
 */
export async function dispatch(
	argv: string[],
	options: {
		checkStateSource?: CheckStateSource;
		createRuntime?: (input: DispatchRuntimeInput) => Promise<DispatchRuntime>;
	} = {},
): Promise<void> {
	const opts = parseArgs(argv);
	const rawPayload = await readFile(opts.eventPath, "utf8");
	const eventPayload = JSON.parse(rawPayload) as unknown;
	const translated = translateGitHubEvent(opts.eventName, eventPayload);
	if (translated.kind === "skip") {
		console.log(JSON.stringify({ type: "skip", reason: translated.reason }));
		return;
	}
	translated.event.event_id = stableEventId(opts.eventName, rawPayload, opts.eventId);

	const graphPath = opts.graphPath ?? bundledGraphPath();
	const document = JSON.parse(await readFile(graphPath, "utf8")) as unknown;
	const graph = validateGraph(
		document && typeof document === "object" && "graph" in document ? (document as { graph: unknown }).graph : document,
	);

	let gateResult: ChecksGateResult | undefined;
	if (translated.event.type === "checks.completed") {
		const env: GitHubTokenEnv & GitHubRepoEnv = {
			GH_TOKEN: process.env.GH_TOKEN,
			GITHUB_TOKEN: process.env.GITHUB_TOKEN,
			GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
		};
		const token = env.GH_TOKEN || env.GITHUB_TOKEN;
		const source =
			options.checkStateSource ??
			(token && env.GITHUB_REPOSITORY ? githubCheckSource(token, env.GITHUB_REPOSITORY) : undefined);
		if (source) {
			gateResult = await evaluateChecksGate(graph, source, translated.subject.ref ?? "");
			if (gateResult.conclusion === "pending") {
				console.log(JSON.stringify({ type: "none", reason: "required checks pending" }));
				return;
			}
			translated.event.conclusion = gateResult.conclusion === "required_green" ? "required_green" : "failed";
		}
	}

	const subject = extractSubject(translated);
	const runsDir = opts.runsPath ?? ".darkfactory/runs";
	const runDir = join(runsDir, subject);
	if (!options.createRuntime) throw new Error("graph dispatch requires a production runtime for actionable events");
	const runtime = await options.createRuntime({ subject, runDir, graph, translated });
	const state = await runGraph(graph, runDir, runtime.handlers, translated.event, {
		...(runtime.onAction ? { onAction: runtime.onAction } : {}),
		...(runtime.capabilityGraph ? { capabilityGraph: runtime.capabilityGraph } : {}),
		...(runtime.capabilityRuntime ? { capabilityRuntime: runtime.capabilityRuntime } : {}),
	});

	const isChecksEvent = translated.event.type === "checks.completed";
	const checksPass = gateResult
		? gateResult.conclusion === "required_green"
		: translated.event.type === "checks.completed" && translated.event.conclusion === "required_green";

	console.log(
		JSON.stringify({
			type: isChecksEvent ? "checks" : "executed",
			...(isChecksEvent ? { result: checksPass ? "pass" : "fail" } : {}),
			subject,
			event: translated.event.type,
			event_id: translated.event.event_id,
			run_id: state.run_id,
			current_node: state.current_node,
			quota_blocked: state.quota_blocked ?? false,
			processed: state.processed_events?.includes(translated.event.event_id ?? "") ?? false,
		}),
	);
}

export type { TranslatedEvent } from "@darkfactory/core/graph";
