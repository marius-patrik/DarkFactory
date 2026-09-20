import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReviewRuntimeState, ReviewSubject } from "@darkfactory/protocol/review";
import { planningReviewAdapter } from "./planning.ts";
import { plan } from "./planner.ts";
import {
	approveReview,
	evaluateReview,
	prepareReviewState,
	recordReviewFix,
	reviewApprovalFresh,
	type ReviewSubjectAdapter,
} from "./review-loop.ts";
import type { AgentNode, AutomationNode, GraphEvent, GraphNode, PlanAction, RunState, WorkflowGraph } from "./types.ts";

/** Outcome of one node run, as the planner's `node_outcome` edges expect. */
export type NodeOutcome = "success" | "failure" | "quota_exhausted";

/** What a node handler reports back to the executor. */
export interface NodeResult {
	/** Selects the outgoing `node_outcome` edge. */
	outcome: NodeOutcome;
	/** Merged into the run's outputs; edge guards and later nodes read them. */
	outputs: Record<string, unknown>;
}

/** Everything a handler needs to run one node (or one fan-out item). */
export interface NodeContext {
	/** Directory owned by this run (or this fan-out child) for scratch files. */
	runDir: string;
	/** The run's outputs so far; for a fan-out child it also holds the item under `foreach.as`. */
	outputs: Record<string, unknown>;
	/** The fan-out item, for a child of a `foreach` node. */
	item?: unknown;
	/** Reviewer or gate feedback the planner attached to this run. */
	feedback?: string;
	/** 1 on the first run of this node, incremented every time a loop runs it again. */
	iteration: number;
	/** Safety-budget alerts the planner raised for this run. */
	alerts?: string[];
	/** Durable generic review state for reviewer/fixer nodes. */
	review?: ReviewRuntimeState;
}

/** Executes agent and automation nodes; everything else (gates, comments, board moves) is the caller's side effect. */
export interface NodeHandlers {
	/** Runs an agent node (a df model run). */
	agent(node: AgentNode, ctx: NodeContext): Promise<NodeResult>;
	/** Runs an automation node (deterministic engine work: worktrees, commits, PRs). */
	automation(node: AutomationNode, ctx: NodeContext): Promise<NodeResult>;
}

/** Options for {@link runGraph}. */
export interface RunGraphOptions {
	/**
	 * Receives gate, hint and comment actions (post the comment, move the board card). The run then stops and waits
	 * for the next external event; a gate is never passed without one.
	 */
	onAction?(action: Exclude<PlanAction, { type: "run" } | { type: "none" }>, state: RunState): void | Promise<void>;
	/** Clock for `blocked_since`; defaults to `new Date()`. */
	now?: () => Date;
	/** Upper bound on node runs per call, guarding against an undeclared infinite loop; default 1000. */
	maxSteps?: number;
	/** Subject-specific deterministic validation layered onto model findings. */
	reviewAdapters?: Partial<Record<ReviewSubject, ReviewSubjectAdapter>>;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	const temp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp.df`;
	await writeFile(temp, `${JSON.stringify(value)}\n`, "utf8");
	await rename(temp, path);
}

async function readJson<T>(path: string): Promise<T | undefined> {
	if (!existsSync(path)) return undefined;
	return JSON.parse(await readFile(path, "utf8")) as T;
}

/** A trigger node for a fresh run: the node whose trigger matches the starting event. */
function startNode(graph: WorkflowGraph, event: GraphEvent): string {
	const byEvent = graph.nodes.find((node) => node.trigger?.event?.split("|").includes(event.type));
	const bySchedule =
		event.type === "schedule" ? graph.nodes.find((node) => node.trigger?.schedule === event.schedule) : undefined;
	return (byEvent ?? bySchedule ?? graph.nodes[0])?.id ?? "";
}

function reviewContextKey(graph: WorkflowGraph, subject: ReviewSubject): string | undefined {
	for (const node of graph.nodes) {
		if (node.kind === "agent" && node.review?.subject === subject) return node.review.context;
	}
	return undefined;
}

function refreshReviewContexts(graph: WorkflowGraph, state: RunState): void {
	state.reviews ??= {};
	for (const subject of ["planning", "implementation"] as const) {
		const key = reviewContextKey(graph, subject);
		if (!key || state.outputs[key] === undefined) continue;
		state.reviews[subject] = prepareReviewState(subject, state.outputs[key], state.reviews[subject]);
	}
}

function isApprovalEvent(event: GraphEvent): boolean {
	if (event.type === "review") return event.state === "APPROVED";
	if (event.type !== "comment") return false;
	return /^\s*(?:\/df\s+|\/)approve\s*$/u.test(event.body ?? "");
}

async function invoke(handlers: NodeHandlers, node: GraphNode, ctx: NodeContext): Promise<NodeResult> {
	try {
		if (node.kind === "agent") return await handlers.agent(node, ctx);
		if (node.kind === "automation") return await handlers.automation(node, ctx);
		return { outcome: "failure", outputs: { error: `node ${node.id} of kind ${node.kind} cannot be run` } };
	} catch (error) {
		// A crashing handler is a failed node, routed by the graph like any other failure.
		return { outcome: "failure", outputs: { error: error instanceof Error ? error.message : String(error) } };
	}
}

/**
 * Runs a `foreach` node: one child per item of `state.outputs[foreach.items]`, at most `max_parallel` (default 1) at a
 * time. Each child keeps its result in `children/<node>/<index>/result.df`, so a resumed fan-out re-runs only the
 * children that did not succeed.
 */
async function runForeach(
	node: GraphNode,
	action: Extract<PlanAction, { type: "run" }>,
	state: RunState,
	runDir: string,
	handlers: NodeHandlers,
	iteration: number,
): Promise<Extract<GraphEvent, { type: "children.completed" }>> {
	const spec = node.foreach!;
	const items = state.outputs[spec.items];
	const as = spec.as ?? "item";
	if (!Array.isArray(items)) {
		state.outputs[`${node.id}_results`] = [];
		state.outputs[`${node.id}_error`] = `foreach.items "${spec.items}" is not an array`;
		return { type: "children.completed", node: node.id, outcome: "any_failed" };
	}
	const results: (NodeResult & { index: number })[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			const childDir = join(runDir, "children", node.id, String(index));
			await mkdir(childDir, { recursive: true });
			const resultPath = join(childDir, "result.df");
			const previous = await readJson<NodeResult>(resultPath);
			if (previous?.outcome === "success") {
				results[index] = { ...previous, index };
				continue;
			}
			const item = items[index];
			const result = await invoke(handlers, node, {
				runDir: childDir,
				outputs: { ...state.outputs, [as]: item },
				item,
				iteration,
				...(action.feedback ? { feedback: action.feedback } : {}),
				...(action.alerts ? { alerts: action.alerts } : {}),
			});
			await writeJson(resultPath, result);
			await appendFile(
				join(childDir, "events.df"),
				`${JSON.stringify({ type: "node.completed", node: node.id, outcome: result.outcome, outputs: result.outputs })}\n`,
			);
			results[index] = { ...result, index };
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(Math.max(1, spec.max_parallel ?? 1), Math.max(1, items.length)) }, worker),
	);
	state.children = results.map((result) => ({
		run_id: `${state.run_id}/${node.id}/${result.index}`,
		node: node.id,
		eligible: result.outcome === "quota_exhausted",
	}));
	state.outputs[`${node.id}_results`] = results.map((result) => ({
		index: result.index,
		outcome: result.outcome,
		outputs: result.outputs,
	}));
	return {
		type: "children.completed",
		node: node.id,
		outcome: results.every((result) => result.outcome === "success") ? "all_done" : "any_failed",
	};
}

/**
 * Drives a run of a workflow graph from one incoming event until the run completes or waits for the outside world.
 *
 * State and events live in `runDir` (`state.df`, `events.df`), written after every step, so a crashed or
 * interrupted run resumes from the last completed node. The planner decides every step: `run` executes nodes through
 * `handlers` (a node may run again when a loop routes back to it; its iteration count grows), `gate` / `hint` /
 * `comment` are handed to `options.onAction` and stop the run until an external event (approval comment, review,
 * checks, schedule) is passed to the next call, and `none` ends the call.
 *
 * @param graph - A validated workflow graph.
 * @param runDir - Directory holding this run's state and events.
 * @param handlers - Agent and automation node executors.
 * @param event - The event that starts or continues the run.
 * @param options - Side-effect hook for gates/comments, clock and step bound.
 * @returns The persisted run state after the call.
 * @throws Error when the run exceeds `maxSteps` node runs in one call.
 */
export async function runGraph(
	graph: WorkflowGraph,
	runDir: string,
	handlers: NodeHandlers,
	event: GraphEvent,
	options: RunGraphOptions = {},
): Promise<RunState> {
	await mkdir(runDir, { recursive: true });
	const statePath = join(runDir, "state.df");
	const eventsPath = join(runDir, "events.df");
	const record = (entry: unknown) => appendFile(eventsPath, `${JSON.stringify(entry)}\n`);
	const state: RunState = (await readJson<RunState>(statePath)) ?? {
		run_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		current_node: startNode(graph, event),
		outputs: {},
		hints: [],
		iterations: {},
	};
	state.outputs ??= {};
	state.hints ??= [];
	state.iterations ??= {};
	state.reviews ??= {};
	const save = () => writeJson(statePath, state);
	await save();
	await record({ type: "event", event });

	const maxSteps = options.maxSteps ?? 1000;
	let steps = 0;
	let current: GraphEvent = event;
	for (;;) {
		refreshReviewContexts(graph, state);
		const currentNode = graph.nodes.find((node) => node.id === state.current_node);
		const action = plan(graph, current, state);
		if (
			currentNode?.kind === "gate" &&
			currentNode.approves_review &&
			action.type === "run" &&
			isApprovalEvent(current)
		) {
			const review = state.reviews[currentNode.approves_review];
			if (!review) throw new Error(`Missing ${currentNode.approves_review} review state for approval gate`);
			state.reviews[currentNode.approves_review] = approveReview(review, options.now?.() ?? new Date());
		}
		await record({ type: "action", action });
		if (action.type === "none") {
			await save();
			return state;
		}
		if (action.type !== "run") {
			state.current_node = action.node;
			if (action.type === "hint" && !state.hints.includes(action.node)) state.hints.push(action.node);
			if (action.type === "gate" || action.type === "comment")
				state.blocked_since ??= (options.now?.() ?? new Date()).toISOString();
			if (action.type === "comment" && /quota/iu.test(action.message)) state.quota_blocked = true;
			await save();
			await options.onAction?.(action, state);
			return state;
		}
		const nodeId = action.nodes[0];
		const node = graph.nodes.find((candidate) => candidate.id === nodeId);
		if (!node) throw new Error(`Planner chose unknown node ${nodeId}`);
		if (++steps > maxSteps)
			throw new Error(`Run ${state.run_id} exceeded ${maxSteps} node runs; check the graph for an undeclared loop`);
		const iteration = (state.iterations[node.id] ?? 0) + 1;
		state.iterations[node.id] = iteration;
		state.current_node = node.id;
		delete state.blocked_since;
		delete state.quota_blocked;
		await save();
		if (node.kind === "check-reference" || node.kind === "gate") {
			// Nothing to execute: the run waits for the checks (or gate) event.
			return state;
		}
		if (node.kind === "agent" && node.requires_review_approval) {
			const review = state.reviews[node.requires_review_approval];
			if (!reviewApprovalFresh(review))
				throw new Error(`Node ${node.id} requires a fresh approved ${node.requires_review_approval} review`);
		}
		if (node.foreach) {
			current = await runForeach(node, action, state, runDir, handlers, iteration);
		} else {
			const reviewConfig = node.kind === "agent" ? node.review : undefined;
			const existingReview = reviewConfig ? state.reviews[reviewConfig.subject] : undefined;
			if (reviewConfig && !existingReview)
				throw new Error(`Node ${node.id} requires review context ${reviewConfig.context}`);
			if (reviewConfig?.phase === "fix" && existingReview?.findings.length === 0)
				throw new Error(`Review fix node ${node.id} has no findings to fix`);
			const result = await invoke(handlers, node, {
				runDir,
				outputs: state.outputs,
				iteration,
				...(existingReview ? { review: existingReview } : {}),
				...(action.feedback ? { feedback: action.feedback } : {}),
				...(action.alerts ? { alerts: action.alerts } : {}),
			});
			if (reviewConfig && result.outcome === "success") {
				if (reviewConfig.phase === "review") {
					const adapter =
						options.reviewAdapters?.[reviewConfig.subject] ??
						(reviewConfig.subject === "planning" ? planningReviewAdapter : undefined);
					const review = evaluateReview({
						subject: reviewConfig.subject,
						context: state.outputs[reviewConfig.context],
						artifact: state.outputs[reviewConfig.artifact],
						modelFindings: result.outputs[reviewConfig.findings],
						previous: existingReview,
						adapter,
						iteration,
						now: options.now?.(),
					});
					state.reviews[reviewConfig.subject] = review;
					result.outputs[reviewConfig.findings] = review.findings.length > 0 ? review.findings : null;
					result.outputs[reviewConfig.clean] = review.clean;
				} else {
					state.reviews[reviewConfig.subject] = recordReviewFix(existingReview!, iteration, options.now?.());
				}
			}
			state.outputs = { ...state.outputs, ...result.outputs };
			refreshReviewContexts(graph, state);
			current = { type: "node.completed", node: node.id, outcome: result.outcome, outputs: result.outputs };
		}
		await save();
		await record({ type: "event", event: current });
	}
}
