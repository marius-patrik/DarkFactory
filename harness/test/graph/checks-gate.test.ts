import { describe, expect, test } from "bun:test";
import type { WorkflowGraph } from "@darkfactory/core/graph";
import { type CheckStateSource, evaluateChecksGate } from "@darkfactory/core/graph";

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
		{ name: "quality", required: true },
		{ name: "verify-bound-issue", required: true },
	];

	test("all green including matrix suffixes -> required_green", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["quality", "success"],
			["verify-bound-issue", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "required_green", failing: [], missing: [] });
	});

	test("one matrix leg failing -> failed with declared name in failing", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["quality", "failure"],
			["verify-bound-issue", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result.conclusion).toBe("failed");
		expect(result.failing).toEqual(["quality"]);
		expect(result.missing).toEqual([]);
	});

	test("required check absent -> pending with missing", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["quality", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "pending", failing: [], missing: ["verify-bound-issue"], pending: [] });
	});

	test("one leg in progress -> pending with pending", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["quality", "pending"],
			["verify-bound-issue", "success"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "pending", failing: [], missing: [], pending: ["quality"] });
	});

	test("non-required checks are ignored", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["quality", "success"],
			["optional-lint", "failure"],
		]);
		const graph = graphWithChecks([
			{ name: "quality", required: true },
			{ name: "optional-lint", required: false },
		]);
		const result = await evaluateChecksGate(graph, fakeSource(states), "main");
		expect(result).toEqual({ conclusion: "required_green", failing: [], missing: [] });
	});

	test("lists are sorted by declared order", async () => {
		const states = new Map<string, "success" | "pending" | "failure">([
			["quality", "pending"],
			["verify-bound-issue", "failure"],
		]);
		const result = await evaluateChecksGate(graphWithChecks(requiredChecks), fakeSource(states), "main");
		expect(result.conclusion).toBe("failed");
		expect(result.failing).toEqual(["verify-bound-issue"]);
		expect(result.missing).toEqual([]);
	});
});
