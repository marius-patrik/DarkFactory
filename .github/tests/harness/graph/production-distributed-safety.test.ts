import { describe, expect, test } from "bun:test";
import type { GitHubRepository } from "../../../../packages/github/src/repository.ts";
import { createProductionRuntimeFactory } from "../../../../packages/harness/src/graph/runtime-composition.ts";
import type { WorkflowGraph } from "../../../../packages/harness/src/graph/types.ts";

describe("DF-21 production multi-runner safety gate", () => {
	test("a distributed lease without an external effect fence and shared journal cannot start", async () => {
		const runtime = createProductionRuntimeFactory({
			repoDir: "/unreachable-repo",
			repository: {} as GitHubRepository,
			model: { agent: async () => ({ outcome: "failure", outputs: {} }) },
			loadPlanningContext: async () => ({}),
			distributedLease: {
				withLease: async (_runDir, work) => work({ assertOwned: async () => undefined }),
			},
		});
		const graph: WorkflowGraph = { version: 1, checks: [], nodes: [], edges: [] };
		await expect(
			runtime({ subject: "2699", runDir: "/nonshared-run", graph }),
		).rejects.toThrow("PostgreSQL lease ownership alone cannot fence in-flight GitHub mutations");
	});

	test("unconfigured multi-runner dispatch rejects silent local-only fallback", async () => {
		const runtime = createProductionRuntimeFactory({
			repoDir: "/unreachable-repo",
			repository: {} as GitHubRepository,
			model: { agent: async () => ({ outcome: "failure", outputs: {} }) },
			loadPlanningContext: async () => ({}),
		});
		const graph: WorkflowGraph = { version: 1, checks: [], nodes: [], edges: [] };
		await expect(
			runtime({ subject: "2699", runDir: "/nonshared-run", graph }),
		).rejects.toThrow("explicit localOnly mode");
	});
});
