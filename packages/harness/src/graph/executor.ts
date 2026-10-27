import { existsSync } from "node:fs";
import { mkdir, open, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReviewRuntimeState, ReviewSubject } from "../../../protocol/src/review.ts";
import { FileProductionEffectJournal, IndeterminateEffectError, StaleEffectError, productionEffectId, replaceDurableJson, runObservedProductionEffect, withGraphFileLock, type ObservedEffect } from "./durable-effects.ts";
import { amendmentProposalFingerprint, mergeProposalFingerprint } from "./approval-evidence.ts";
import { plan } from "./planner.ts";
import { planningReviewAdapter } from "./planning.ts";
import {
	approveReview,
	contextFingerprint,
	evaluateReview,
	prepareReviewState,
	type ReviewSubjectAdapter,
	recordReviewFix,
	reviewApprovalFresh,
} from "./review-loop.ts";
import type { AgentNode, AutomationNode, GraphEvent, GraphNode, PlanAction, RunState, WorkflowGraph } from "./types.ts";

/** Outcome of one node run, as the planner's `node_outcome` edges expect. */
type NodeOutcome = "success" | "failure" | "quota_exhausted";

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
	/** Stable identity shared by retries of a durable graph run. */
	runId: string;
	/** Cooperative cancellation checked before and between durable graph stages. */
	signal?: AbortSignal;
	/** A mutation boundary that journals intent before the external effect. */
	effect?<T>(kind: string, operations: { observe(effectId: string): Promise<ObservedEffect<T> | undefined>; execute(effectId: string): Promise<ObservedEffect<T>> }, suffix?: string): Promise<ObservedEffect<T>>;
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
	/** Explicit, durable effect substrate injected into graph node handlers. */
	effects?: FileProductionEffectJournal;
	/** Stable ingress delivery identity; duplicate deliveries are suppressed. */
	eventId?: string;
	/** Cooperative cancellation; cannot retroactively undo externally observed effects. */
	signal?: AbortSignal;
	/** Re-observes immutable Request, dependencies and base before authorization or mutation. */
	verifyPlanningContext?(state: RunState): Promise<boolean>;
	/** Required to safely reconcile an interrupted external gate/comment action. */
	reconcileAction?(action: Exclude<PlanAction, { type: "run" } | { type: "none" }>, state: RunState): Promise<void>;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await replaceDurableJson(path, value);
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

function reviewContextKey(graph: WorkflowGraph, subject: ReviewSubject): { context: string; artifact: string } | undefined {
	for (const node of graph.nodes) {
		if (node.kind !== "agent") continue;
		const review = node.review;
		if (review?.subject === subject) return { context: review.context, artifact: review.artifact };
	}
	return undefined;
}

function refreshReviewContexts(graph: WorkflowGraph, state: RunState): void {
	state.reviews ??= {};
	for (const subject of ["planning", "implementation"] as const) {
		const key = reviewContextKey(graph, subject);
		if (!key || state.outputs[key.context] === undefined) continue;
		const prepared = prepareReviewState(subject, state.outputs[key.context], state.reviews[subject]);
		const observed = state.outputs[`${subject}_reviewed_fingerprint`];
		const current = contextFingerprint([state.outputs[key.context], state.outputs[key.artifact]]);
		state.reviews[subject] = prepared.clean && observed !== current
			? { ...prepared, clean: false, approvedFingerprint: undefined, approvedAt: undefined }
			: prepared;
	}
}

function isApprovalEvent(event: GraphEvent): boolean {
	if (event.type === "review") return event.state === "APPROVED";
	if (event.type !== "comment") return false;
	return /^\s*(?:\/df\s+|\/)approve\s*$/u.test(event.body ?? "");
}

function effectFor(
	journal: FileProductionEffectJournal | undefined,
	runId: string,
	nodeId: string,
	iteration: number,
): NodeContext["effect"] {
	if (!journal) return undefined;
	return async (kind, operations, suffix = "") => {
		const id = productionEffectId(runId, nodeId, iteration, kind, suffix);
		const record = await runObservedProductionEffect(journal, id, kind, { observe: () => operations.observe(id), execute: () => operations.execute(id) });
		return { value: record.value, evidence: record.evidence };
	};
}

async function invoke(handlers: NodeHandlers, node: GraphNode, ctx: NodeContext): Promise<NodeResult> {
	try {
		if (node.kind === "agent") return await handlers.agent(node, ctx);
		if (node.kind === "automation") return await handlers.automation(node, ctx);
		return { outcome: "failure", outputs: { error: `node ${node.id} of kind ${node.kind} cannot be run` } };
	} catch (error) {
		// Ambiguous/stale mutations must NOT be consumed by the graph's
		// ordinary repair edges, which would risk replay under a new effect ID.
		if (error instanceof IndeterminateEffectError || error instanceof StaleEffectError) throw error;
		return { outcome: "failure", outputs: { error: error instanceof Error ? error.message : String(error) } };
	}
}

/**
 * Runs a `foreach` node: one child per item of `state.outputs[foreach.items]`, at most `max_parallel` (default 1) at a
 * time. Each child keeps its result in `children/<node>/<index>/result.df`, so a resumed fan-out re-runs only the
 * children that did not succeed. Each child result and effect identity is bound
 * to its immutable Planning context and item; a re-plan cannot reuse a
 * successful result from an unrelated item at the same array index.
 */
async function runForeach(
	node: GraphNode,
	action: Extract<PlanAction, { type: "run" }>,
	state: RunState,
	runDir: string,
	handlers: NodeHandlers,
	iteration: number,
	journal?: FileProductionEffectJournal,
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
			const item = items[index];
			const fingerprint = contextFingerprint({
				item,
				planningContext: state.outputs.planning_context,
				plan: state.outputs.plan_artifact,
				branch: state.outputs.branch,
				requiredTests: state.outputs.required_tests,
			});
			const childRunId = `${state.run_id}/${node.id}/${index}/${fingerprint}`;
			const childDir = join(runDir, "children", node.id, String(index), fingerprint);
			await mkdir(childDir, { recursive: true });
			const resultPath = join(childDir, "result.df");
			const previous = await readJson<NodeResult & { input_fingerprint?: string }>(resultPath);
			if (previous?.outcome === "success") {
				if (previous.input_fingerprint !== fingerprint) throw new Error("Unbound fan-out result cannot be reused");
				results[index] = { ...previous, index };
				continue;
			}
			const result = await invoke(handlers, node, {
				runDir: childDir,
				runId: childRunId,
				outputs: { ...state.outputs, [as]: item },
				item,
				iteration,
				...(journal ? { effect: effectFor(journal, childRunId, node.id, 1) } : {}),
				...(action.feedback ? { feedback: action.feedback } : {}),
				...(action.alerts ? { alerts: action.alerts } : {}),
			});
			await writeJson(resultPath, { ...result, input_fingerprint: fingerprint });
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
		run_id: `${state.run_id}/${node.id}/${result.index}/${contextFingerprint({
			item: items[result.index],
			planningContext: state.outputs.planning_context,
			plan: state.outputs.plan_artifact,
			branch: state.outputs.branch,
			requiredTests: state.outputs.required_tests,
		})}`,
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
async function runGraphUnlocked(
	graph: WorkflowGraph,
	runDir: string,
	handlers: NodeHandlers,
	event: GraphEvent,
	options: RunGraphOptions = {},
): Promise<RunState> {
	await mkdir(runDir, { recursive: true });
	const statePath = join(runDir, "state.df");
	const eventsPath = join(runDir, "events.df");
	const record = async (entry: unknown) => {
		const file = await open(eventsPath, "a", 0o600);
		try {
			await file.writeFile(`${JSON.stringify(entry)}\n`, "utf8");
			await file.sync();
		} finally {
			await file.close();
		}
	};
	const state: RunState & {
		processed_event_ids?: string[];
		active_event_id?: string;
		recovery_event?: GraphEvent;
		pending_node?: { node: string; iteration: number };
		pending_action?: Exclude<PlanAction, { type: "run" } | { type: "none" }>;
	} = (await readJson<RunState>(statePath)) ?? {
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
	state.processed_event_ids ??= [];
	const ingressId = options.eventId ?? ("event_id" in event && typeof event.event_id === "string" ? event.event_id : undefined);
	if (ingressId && state.processed_event_ids.includes(ingressId)) return state;
	if (state.active_event_id && ingressId !== state.active_event_id) {
		throw new Error(`Run ${state.run_id} must reconcile active event ${state.active_event_id} before processing another delivery`);
	}
	const save = () => writeJson(statePath, state);
	if (state.pending_node) {
		const { node, iteration } = state.pending_node;
		const checkpointPath = join(runDir, "checkpoints", node, `${iteration}.df`);
		const checkpoint = await readJson<{ node: string; iteration: number; state: RunState; event: GraphEvent }>(checkpointPath);
		if (!checkpoint || checkpoint.node !== node || checkpoint.iteration !== iteration) {
			throw new Error(`Interrupted node ${node}#${iteration} has no committed result; reconcile effects before retry`);
		}
		Object.assign(state, checkpoint.state);
		delete state.pending_node;
		state.recovery_event = checkpoint.event;
		await save();
	}
	if (state.pending_action) {
		if (!options.reconcileAction) throw new Error("Interrupted external graph action requires explicit reconciliation");
		await options.reconcileAction(state.pending_action, state);
		delete state.pending_action;
		delete state.recovery_event;
		delete state.active_event_id;
		if (ingressId && !state.processed_event_ids.includes(ingressId)) state.processed_event_ids.push(ingressId);
		await save();
		return state;
	}
	if (ingressId) state.active_event_id = ingressId;
	await save();
	await record({ type: "event", event });

	const maxSteps = options.maxSteps ?? 1000;
	let steps = 0;
	let current: GraphEvent = state.recovery_event ?? event;
	const finishIngress = async () => {
		delete state.recovery_event;
		delete state.active_event_id;
		if (ingressId && !state.processed_event_ids!.includes(ingressId)) state.processed_event_ids!.push(ingressId);
		await save();
		return state;
	};
	for (;;) {
		if (options.signal?.aborted) throw new Error("Graph run cancelled before next transition");
		refreshReviewContexts(graph, state);
		const currentNode = graph.nodes.find((node) => node.id === state.current_node);
		const action = plan(graph, current, state);
		if (options.verifyPlanningContext && (
			isApprovalEvent(current) ||
			(action.type === "run" && graph.nodes.some((candidate) => action.nodes.includes(candidate.id) && (
				(candidate.kind === "agent" && (candidate.mode === "write" || candidate.id === "implement" || candidate.id === "review-fix")) ||
				(candidate.kind === "automation" && candidate.script === "pr-merge")
			)))
		)) {
			if (!(await options.verifyPlanningContext(state)))
				throw new Error("Authoritative Request, dependencies or base changed; Planning approval is stale");
		}
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
		if (currentNode?.id === "deviation-gate" && currentNode.kind === "gate" && action.type === "run" && isApprovalEvent(current)) {
			const fingerprint = amendmentProposalFingerprint(state.outputs);
			if (state.outputs.awaiting_amendment_fingerprint !== fingerprint) {
				throw new Error("Stale amendment authorization: implementation changed since gate opened");
			}
			if (!("actor" in current) || !current.actor.login)
				throw new Error("Amendment approval has no accountable actor");
			state.outputs.amendment_authorization = {
				fingerprint, actor: current.actor.login,
				approvedAt: (options.now?.() ?? new Date()).toISOString(),
			};
		}
		if (currentNode?.id === "merge-gate" && currentNode.kind === "gate" && action.type === "run" && isApprovalEvent(current)) {
			if (!reviewApprovalFresh(state.reviews.planning))
				throw new Error("Final merge authorization requires fresh approved Planning");
			if (!("actor" in current) || !current.actor.login) throw new Error("Final approval has no attributable actor");
			state.outputs.merge_authorization = {
				fingerprint: mergeProposalFingerprint(state.outputs),
				prNumber: state.outputs.pr_number,
				headSha: state.outputs.commit_sha,
				actor: current.actor.login,
				approvedAt: (options.now?.() ?? new Date()).toISOString(),
			};
		}
		await record({ type: "action", action });
		if (action.type === "none") return finishIngress();
		if (action.type !== "run") {
			if (action.type === "gate" && action.node === "deviation-gate") {
				state.outputs.awaiting_amendment_fingerprint = amendmentProposalFingerprint(state.outputs);
				delete state.outputs.amendment_authorization;
			}
			if (action.type === "gate" && action.node === "merge-gate") {
				const checked = "ref" in current ? current.ref : undefined;
				if (typeof checked !== "string" || checked !== state.outputs.commit_sha ||
					current.type !== "checks.completed" || current.conclusion !== "required_green") {
					throw new Error("Cannot enter final merge gate without passing external checks for exact implementation SHA");
				}
				state.outputs.external_checks_head_sha = checked;
			}
			state.current_node = action.node;
			if (action.type === "hint" && !state.hints.includes(action.node)) state.hints.push(action.node);
			if (action.type === "gate" || action.type === "comment")
				state.blocked_since ??= (options.now?.() ?? new Date()).toISOString();
			if (action.type === "comment" && /quota/iu.test(action.message)) state.quota_blocked = true;
			state.pending_action = action;
			await save();
			await options.onAction?.(action, state);
			delete state.pending_action;
			return finishIngress();
		}
		const nodeId = action.nodes[0];
		const node = graph.nodes.find((candidate) => candidate.id === nodeId);
		if (!node) throw new Error(`Planner chose unknown node ${nodeId}`);
		if (++steps > maxSteps)
			throw new Error(`Run ${state.run_id} exceeded ${maxSteps} node runs; check the graph for an undeclared loop`);
		if (action.revert) {
			throw new Error(`Graph requested ${action.revert}; deterministic rollback evidence is not installed`);
		}
		if (node.kind === "agent") {
			const planningGateExists = graph.nodes.some((candidate) => candidate.kind === "gate" && candidate.approves_review === "planning");
			const writesCode = node.mode === "write" || node.id === "implement" || node.id === "review-fix";
			if (planningGateExists && writesCode && !reviewApprovalFresh(state.reviews.planning))
				throw new Error(`Node ${node.id} cannot mutate code without fresh approved Planning`);
			if (node.requires_review_approval && !reviewApprovalFresh(state.reviews[node.requires_review_approval]))
				throw new Error(`Node ${node.id} requires a fresh approved ${node.requires_review_approval} review`);
		}
		const iteration = (state.iterations[node.id] ?? 0) + 1;
		state.iterations[node.id] = iteration;
		state.current_node = node.id;
		delete state.blocked_since;
		delete state.quota_blocked;
		if (node.kind === "check-reference" || node.kind === "gate") {
			// A check or gate is an external wait, not a successful mutation.
			return finishIngress();
		}
		// One durable transaction boundary: incrementing iteration without also
		// persisting the pending effect could cause an unsafe new effect ID on
		// recovery after a crash in between two state writes.
		state.pending_node = { node: node.id, iteration };
		await save();
		if (node.foreach) {
			current = await runForeach(node, action, state, runDir, handlers, iteration, options.effects);
		} else {
			const reviewConfig = node.kind === "agent" ? node.review : undefined;
			const existingReview = reviewConfig ? state.reviews[reviewConfig.subject] : undefined;
			if (reviewConfig && !existingReview)
				throw new Error(`Node ${node.id} requires review context ${reviewConfig.context}`);
			if (reviewConfig?.phase === "fix" && existingReview?.findings.length === 0 && !action.feedback)
				throw new Error(`Review fix node ${node.id} has no findings or owner feedback to fix`);
			const result = await invoke(handlers, node, {
				runDir,
				runId: state.run_id,
				outputs: state.outputs,
				iteration,
				...(options.effects ? { effect: effectFor(options.effects, state.run_id, node.id, iteration) } : {}),
				...(options.signal ? { signal: options.signal } : {}),
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
					state.outputs[`${reviewConfig.subject}_reviewed_fingerprint`] = contextFingerprint([
						state.outputs[reviewConfig.context], state.outputs[reviewConfig.artifact],
					]);
					result.outputs[reviewConfig.findings] = review.findings.length > 0 ? review.findings : null;
					result.outputs[reviewConfig.clean] = review.clean;
				} else {
					delete state.outputs[`${reviewConfig.subject}_reviewed_fingerprint`];
					state.reviews[reviewConfig.subject] = recordReviewFix(
						existingReview ??
							(() => {
								throw new Error(`Missing ${reviewConfig.subject} review state`);
							})(),
						iteration,
						options.now?.(),
					);
				}
			}
			state.outputs = { ...state.outputs, ...result.outputs };
			if (result.outcome === "quota_exhausted" && node.kind === "agent" && node.quota_policy) {
				state.checkpoints ??= [];
				const existing = state.checkpoints.find((checkpoint) => checkpoint.run_id === state.run_id && checkpoint.node === node.id);
				if (existing) existing.eligible = false;
				else state.checkpoints.push({ run_id: state.run_id, node: node.id, eligible: false });
			}
			if (node.kind === "automation" && node.side_effects?.clear_checkpoints && result.outcome === "success") {
				state.checkpoints = [];
			}
			refreshReviewContexts(graph, state);
			current = { type: "node.completed", node: node.id, outcome: result.outcome, outputs: result.outputs };
		}
		// Persist the completed transition before clearing the in-flight node.
		// Recovery can adopt this snapshot without rerunning an ambiguous effect.
		const completedState = { ...state, pending_node: undefined, recovery_event: current };
		await writeJson(join(runDir, "checkpoints", node.id, `${iteration}.df`), {
			node: node.id, iteration, state: completedState, event: current,
		});
		delete state.pending_node;
		state.recovery_event = current;
		await save();
		await record({ type: "event", event: current });
	}
}

/** The canonical graph executor, serialized per run on a local filesystem. */
export async function runGraph(
	graph: WorkflowGraph,
	runDir: string,
	handlers: NodeHandlers,
	event: GraphEvent,
	options: RunGraphOptions = {},
): Promise<RunState> {
	await mkdir(runDir, { recursive: true });
	return withGraphFileLock(join(runDir, "locks"), "run", () => runGraphUnlocked(graph, runDir, handlers, event, options));
}
