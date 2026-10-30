import { describe, expect, test } from "bun:test";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { z } from "zod";
import {
	createRoutedProductionModelAdapter,
	ProductionQuotaExhaustedError,
} from "../../../../packages/harness/src/graph/production-model.ts";
import { contextFingerprint } from "../../../../packages/harness/src/graph/review-loop.ts";
import type { NodeContext } from "../../../../packages/harness/src/graph/executor.ts";
import type { AgentNode } from "../../../../packages/harness/src/graph/types.ts";

const message = (text: string) =>
	({
		content: [{ type: "text", text }],
	}) as AssistantMessage;

function context(outputs: Record<string, unknown>): NodeContext {
	return { runDir: "/isolated-run", runId: "durable-run", iteration: 1, outputs };
}

describe("production routed model stage captures", () => {
	test("Planning artifact binds verbatim Request, accepted criteria, current base, scope and decisions", async () => {
		const planningContext = {
			request: {
				issue: 47,
				body: "Implement secure startup",
				version: "2026-10-27T09:00:00Z",
				acceptanceCriteria: ["startup is reproducible"],
			},
			base: { defaultBranch: "main", sha: "a".repeat(40) },
			relationships: {},
			dependencies: [],
			approvedDecisions: ["single-owner graph"],
			shippedInterfaces: [],
			recovery: [],
		};
		const draft = {
			behavioralContract: ["startup is reproducible"],
			scope: ["src/**"],
			exclusions: [],
			dependencies: [],
			sequencing: ["plan", "implement"],
			verification: ["run unit tests"],
			implementation: { knownOwners: ["harness"], discoveryRequired: [] },
		};
		let receivedPrompt = "";
		const model = createRoutedProductionModelAdapter({
			runPrompt: async (prompt) => {
				receivedPrompt = prompt;
				return message("Draft prepared");
			},
			extractJudgement: async <T>({ schema }: { schema: z.ZodType<T> }) => schema.parse(draft),
		});
		const result = await model.agent(
			{ id: "planning", kind: "agent", outputs: ["plan_artifact"] } as AgentNode,
			context({ planning_context: planningContext }),
		);
		expect(result.outcome).toBe("success");
		const artifact = result.outputs.plan_artifact as Record<string, unknown>;
		expect(artifact.contextFingerprint).toBe(contextFingerprint(planningContext));
		expect(artifact.verbatimRequest).toBe(planningContext.request.body);
		expect(artifact.scope).toEqual(["src/**"]);
		expect(receivedPrompt).toContain("single-owner graph");
	});

	test("review findings are structured, routed and never inferred from model prose alone", async () => {
		const model = createRoutedProductionModelAdapter({
			runPrompt: async () => message("Looks clean to me"),
			extractJudgement: async <T>({ schema }: { schema: z.ZodType<T> }) =>
				schema.parse({
					findings: [
						{
							id: "issue-1",
							category: "scope",
							severity: "error",
							message: "Unapproved file",
						},
					],
					clean: false,
					deviation_detected: true,
				}),
		});
		const result = await model.agent({ id: "self-review", kind: "agent" }, context({}));
		expect(result.outcome).toBe("success");
		expect(result.outputs.review_clean).toBe(false);
		expect(result.outputs.deviation_detected).toBe(true);
		expect(result.outputs.review_findings).toHaveLength(1);
	});

	test("known quota exhaustion reports the provider/account/model for deterministic resumption", async () => {
		const candidate = { provider: "provider", account: "secondary", model: "model" };
		const model = createRoutedProductionModelAdapter({
			runPrompt: async () => {
				throw new ProductionQuotaExhaustedError("quota exhausted", candidate);
			},
			extractJudgement: async <T>({ schema }: { schema: z.ZodType<T> }) => schema.parse({}),
		});
		const result = await model.agent({ id: "planning", kind: "agent" }, context({}));
		expect(result).toMatchObject({ outcome: "quota_exhausted", outputs: { quota_candidate: candidate } });
	});
});
