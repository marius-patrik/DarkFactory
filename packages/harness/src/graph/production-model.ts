import type { AssistantMessage } from "@earendil-works/pi-ai";
import { z } from "zod";
import type { PlanningArtifact, PlanningContextPacket } from "../../../protocol/src/planning.ts";
import { alignmentResultSchema, reviewResultSchema } from "../../../protocol/src/result-capture.ts";
import type { NodeContext, NodeResult } from "./executor.ts";
import { contextFingerprint } from "./review-loop.ts";
import type { AgentNode } from "./types.ts";
import type { ProductionGraphHandlerOptions } from "./production-handlers.ts";

const planningDraftSchema = z.object({
	behavioralContract: z.array(z.string()).min(1),
	scope: z.array(z.string()).min(1),
	exclusions: z.array(z.string()),
	dependencies: z.array(z.string()),
	sequencing: z.array(z.string()).min(1),
	verification: z.array(z.string()).min(1),
	implementation: z.object({
		knownOwners: z.array(z.string()),
		discoveryRequired: z.array(z.string()),
	}),
	hold: z.object({
		kind: z.enum(["dependency", "recovery"]),
		refs: z.array(z.string()).min(1),
		reason: z.string().min(1),
	}).optional(),
});

export interface ProductionModelEffects {
	runPrompt(
		prompt: string,
		options: {
			workdir?: string;
			reasoning?: "standard" | "hard";
			chain?: string[];
			timeout?: string;
			feedback?: string;
			nodeId: string;
		},
	): Promise<AssistantMessage>;
	extractJudgement<T>(input: {
		answer: string;
		schema: z.ZodType<T>;
		nodeId: string;
		ctx: NodeContext;
	}): Promise<T>;
}

export class ProductionQuotaExhaustedError extends Error {
	constructor(message: string, readonly candidate: {
		provider: string;
		account: string;
		model: string;
	}) {
		super(message);
		this.name = "ProductionQuotaExhaustedError";
	}
}

function answerText(message: AssistantMessage): string {
	return message.content.flatMap((block) => block.type === "text" ? [block.text] : []).join("\n");
}

/** This is a model adapter, not a second execution engine. */
export function createRoutedProductionModelAdapter(
	effects: ProductionModelEffects,
): ProductionGraphHandlerOptions["model"] {
	return {
		async agent(node: AgentNode, ctx: NodeContext, worktree?: string): Promise<NodeResult> {
			try {
				if (ctx.signal?.aborted) throw new Error("Graph agent run cancelled");
				const reviewedContext = ctx.outputs.planning_context as PlanningContextPacket | undefined;
				const planningArtifact = ctx.outputs.plan_artifact as PlanningArtifact | undefined;
				const prompt = [
					node.prompt ?? `Perform the graph stage ${node.id}.`,
					...(reviewedContext ? [
						`\nAuthoritative immutable Planning context:\n${JSON.stringify(reviewedContext)}`,
					] : []),
					...(planningArtifact ? [
						`\nCurrently reviewed Planning artifact:\n${JSON.stringify(planningArtifact)}`,
					] : []),
					...(ctx.review ? [`\nReview history and findings:\n${JSON.stringify(ctx.review)}`] : []),
					...(ctx.feedback ? [`\nOwner feedback:\n${ctx.feedback}`] : []),
					...(worktree ? [`\nPerform authorized changes in this isolated worktree: ${worktree}`] : []),
				].join("\n\n");
				const message = await effects.runPrompt(prompt, {
					nodeId: node.id, ...(worktree ? { workdir: worktree } : {}),
					...(node.reasoning ? { reasoning: node.reasoning } : {}),
					...(node.chain ? { chain: node.chain } : {}),
					...(node.timeout ? { timeout: node.timeout } : {}),
					...(ctx.feedback ? { feedback: ctx.feedback } : {}),
				});
				const answer = answerText(message);
				if (node.id === "planning" || node.id === "planning-fix") {
					if (!reviewedContext?.request?.version || typeof reviewedContext.request.body !== "string")
						throw new Error("Planning requires an authoritative versioned Request");
					const draft = await effects.extractJudgement({
						answer, schema: planningDraftSchema, ctx, nodeId: node.id,
					});
					const artifact: PlanningArtifact = {
						contextFingerprint: contextFingerprint(reviewedContext),
						verbatimRequest: reviewedContext.request.body,
						acceptanceCriteria: reviewedContext.request.acceptanceCriteria,
						...draft,
					};
					return { outcome: "success", outputs: { plan_artifact: artifact } };
				}
				if (node.id === "planning-review" || node.id === "self-review") {
					const result = await effects.extractJudgement({
						answer, schema: reviewResultSchema, ctx, nodeId: node.id,
					});
					return { outcome: "success", outputs: node.id === "planning-review"
						? { planning_findings: result.findings, planning_review_clean: result.clean }
						: { review_findings: result.findings, review_clean: result.clean,
							deviation_detected: result.deviation_detected ?? false } };
				}
				if (node.id === "plan-alignment") {
					const result = await effects.extractJudgement({
						answer, schema: alignmentResultSchema, ctx, nodeId: node.id,
					});
					return { outcome: "success", outputs: {
						aligned: result.aligned, rationale: result.rationale, deviations: result.deviations ?? [],
					} };
				}
				if (worktree) return { outcome: "success", outputs: {} };
				return { outcome: "success", outputs: { [node.outputs?.[0] ?? "result"]: answer } };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (error instanceof ProductionQuotaExhaustedError) {
					return { outcome: "quota_exhausted", outputs: {
						error: message, quota_candidate: error.candidate,
					} };
				}
				if (/quota|rate_limited|429/iu.test(message)) {
					return { outcome: "quota_exhausted", outputs: { error: message } };
				}
				return { outcome: "failure", outputs: { error: message } };
			}
		},
	};
}
