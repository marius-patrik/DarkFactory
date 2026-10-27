import { createHash } from "node:crypto";
import { join } from "node:path";
import type { GitHubRepository } from "../../../github/src/repository.ts";
import type { DispatchRuntime, DispatchRuntimeInput } from "./dispatch.ts";
import {
	FileProductionEffectJournal,
	runObservedProductionEffect,
} from "./durable-effects.ts";
import {
	createGitHubProductionEffects,
	createRepositoryProductionEffects,
	productionWorkspaceOperations,
	type GitHubMergeBoundary,
} from "./production-composition.ts";
import {
	createProductionGraphHandlers,
	type ProductionGraphHandlerOptions,
} from "./production-handlers.ts";
import type { RunState, PlanAction } from "./types.ts";

type ExternalAction = Exclude<PlanAction, { type: "run" } | { type: "none" }>;

/** Dependencies are supplied by the CLI/operator; no credentials or model routing live here. */
export interface ProductionRuntimeFactoryOptions {
	repoDir: string;
	repository: GitHubRepository;
	/** Conditional PR merger provided by packages/github; graph never issues REST directly. */
	mergeBoundary: GitHubMergeBoundary;
	model: ProductionGraphHandlerOptions["model"];
	loadPlanningContext: ProductionGraphHandlerOptions["loadPlanningContext"];
	automation?: ProductionGraphHandlerOptions["automation"];
	workRoot?: string;
}

/** Stable comment identity also differentiates repeated reminders by ingress delivery. */
function actionIdentity(state: RunState, action: ExternalAction): string {
	const eventId = (state as RunState & { active_event_id?: string }).active_event_id;
	if (!eventId) throw new Error("Production gate/comment action has no stable ingress identity");
	return createHash("sha256")
		.update(JSON.stringify([state.run_id, eventId, action.node, action.type, action])).digest("hex");
}

function actionMessage(action: ExternalAction): string {
	if (action.type === "gate") {
		return `Gate \`${action.node}\` awaits authorized approval. Reply \`/df approve\` or \`/df reject\`.`;
	}
	return action.type === "comment" ? action.message : `Hint: ${action.message}`;
}

/**
 * Compose one subject-scoped graph runtime from real workspace/GitHub adapters.
 *
 * This is a factory for the existing executor, not another stage scheduler.
 * CI and model routing enter exclusively through explicit dependencies.
 */
export function createProductionRuntimeFactory(options: ProductionRuntimeFactoryOptions) {
	const repository = createRepositoryProductionEffects({
		repoDir: options.repoDir,
		...(options.workRoot ? { workRoot: options.workRoot } : {}),
	});
	return async ({ subject, runDir, graph }: DispatchRuntimeInput): Promise<DispatchRuntime> => {
		const github = createGitHubProductionEffects(options.repository, {
			requiredChecks: graph.checks.filter((check) => check.required).map((check) => check.name),
			mergeBoundary: options.mergeBoundary,
		});
		const effects = new FileProductionEffectJournal(join(runDir, "effects"));
		const handlers = createProductionGraphHandlers({
			model: options.model,
			repository,
			github,
			workspace: productionWorkspaceOperations,
			loadPlanningContext: options.loadPlanningContext,
			...(options.automation ? { automation: options.automation } : {}),
		});
		const target = Number(subject);
		const issueNumber = Number.isSafeInteger(target) && target > 0 ? target : undefined;
		const performAction = async (action: ExternalAction, state: RunState) => {
			if (!issueNumber) {
				throw new Error("Production graph action requires an attributable positive GitHub subject");
			}
			const id = actionIdentity(state, action);
			const mutation = github.createComment({
				issueNumber, body: actionMessage(action),
			});
			await runObservedProductionEffect(effects, id, "github.comment", {
				observe: () => mutation.observe(id),
				execute: () => mutation.execute(id),
			});
		};
		const reconcileAction = async (action: ExternalAction, state: RunState) => {
			if (!issueNumber) throw new Error("Cannot reconcile action without GitHub subject");
			const id = actionIdentity(state, action);
			const mutation = github.createComment({ issueNumber, body: actionMessage(action) });
			// An interruption MAY have succeeded remotely, so replay only
			// observed evidence. It cannot publish another copy.
			await runObservedProductionEffect(effects, id, "github.comment", {
				observe: () => mutation.observe(id),
				execute: async () => {
					throw new Error("Interrupted action has no observed external evidence");
				},
			});
		};
		return {
			handlers, effects, onAction: performAction, reconcileAction,
			verifyChecks: async (headSha: string) => {
				const required = graph.checks.filter((item) => item.required).map((item) => item.name);
				if (required.length === 0) throw new Error("Graph has no explicit required external checks");
				const observed = await options.repository.requiredCheckStatus(headSha, required);
				return observed.state === "success" && !observed.missing.length && !observed.failing.length
					? "required_green" as const : observed.state === "failure" ? "failed" as const : "pending" as const;
			},
		};
	};
}
