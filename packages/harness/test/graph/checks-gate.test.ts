import { describe, expect, test } from "bun:test";
import { type CheckStateSource, evaluateChecksGate } from "../../src/graph/index.ts";
import type { WorkflowGraph } from "../../src/graph/types.ts";

function fakeSource(states: Map<string, "success" | "pending" | "failure">): CheckStateSource {
	return { checkStates: async () => states };
}

function graphWithChecks(checks: { name: string; required: boolean }[]): WorkflowGraph {
	return {
		version: 1,
		checks,
		nodes: checks.map((check) => ({
			id: check.name,
			kind: "check-reference" as const,
			check: check.name,
			required: check.required,
		})),
		edges: [],
	};
}

describe("evaluateChecksGate", () => {
	const requiredChecks = [
		{ name: "pipeline", required: true },
		{ name: "harness", required: true },
		{ name: "verify-bound-issue", required: true },
	];

	test("all green including matrix suffixes -> required_green", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["pipeline (3.10)", "success"],
			["pipeline (3.11)", "success"],
			["pipeline (3.12)", "success"],
			["harness", "success"],
			["verify-bound-issue", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "required_green", failing: [], missing: [] });
	});

	test("one matrix leg failing -> failed with declared name in failing", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["pipeline (3.10)", "failure"],
			["pipeline (3.11)", "success"],
			["harness", "success"],
			["verify-bound-issue", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result.conclusion).toBe("failed");
		expect(result.failing).toEqual(["pipeline"]);
		expect(result.missing).toEqual([]);
	});

	test("required check absent -> pending with missing", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["pipeline", "success"],
			["verify-bound-issue", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "pending", failing: [], missing: ["harness"], pending: [] });
	});

	test("one leg in progress -> pending with pending", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["pipeline (3.10)", "pending"],
			["pipeline (3.11)", "success"],
			["harness", "success"],
			["verify-bound-issue", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "pending", failing: [], missing: [], pending: ["pipeline"] });
	});

	test("non-required checks are ignored", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["pipeline", "success"],
			["optional-lint", "failure"],
		]);
		const graph = graphWithChecks([
			{ name: "pipeline", required: true },
			{ name: "optional-lint", required: false },
		]);
		const result = await evaluateChecksGate(graph, fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "required_green", failing: [], missing: [] });
	});

	test("lists are sorted by declared order", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["pipeline", "pending"],
			["harness", "failure"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result.conclusion).toBe("failed");
		expect(result.failing).toEqual(["harness"]);
		expect(result.missing).toEqual(["verify-bound-issue"]);
	});
});
