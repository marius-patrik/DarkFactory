import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import graph from "../../assets/graph.darkfactory.json";

const repoRoot = join(import.meta.dir, "..", "..", "..", "..");

/** Every workflow file the repository tracks, including the managed templates df installs. */
function workflowFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...workflowFiles(full));
		else if (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")) out.push(full);
	}
	return out;
}

/**
 * Job names declared by a workflow, which is what GitHub reports as the check context for a
 * matrix-less job. Matrix jobs report `matrix-id` instead and are covered by the ci matrix gate.
 */
function jobNames(source: string): string[] {
	const names: string[] = [];
	const inJobs = /^jobs:\s*$/m.test(source);
	if (!inJobs) return names;
	const jobsBody = source.slice(source.search(/^jobs:\s*$/m));
	for (const line of jobsBody.split("\n")) {
		const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
		if (match?.[1]) names.push(match[1]);
	}
	return names;
}

const workflows = [
	...workflowFiles(join(repoRoot, ".github", "workflows")),
	...workflowFiles(join(repoRoot, "packages", "harness", "assets", "workflows")),
];
const allJobNames = new Set(workflows.flatMap((file) => jobNames(readFileSync(file, "utf8"))));

const required = graph.checks.filter((check) => check.required).map((check) => check.name);

/** The `check` field only exists on check-reference nodes, so narrow before reading it. */
function nodeOf(node: { check?: string }): { check: string } {
	if (typeof node.check !== "string") throw new Error(`node is missing a check name: ${JSON.stringify(node)}`);
	return { check: node.check };
}

describe("the graph's required checks are checks this repository can actually report", () => {
	// #1218. The graph declared `pipeline` and `harness` as required check references. Neither is
	// a job in any tracked workflow, and neither is in branch protection, so evaluateChecksGate
	// classified them as `missing` on every ref and the gate could only ever return `pending`.
	// Meanwhile `quality` — which branch protection does require — was absent from the graph.
	test("every required check name resolves to a job in a tracked workflow or managed template", () => {
		const unresolvable = required.filter((name) => !allJobNames.has(name));
		expect(unresolvable).toEqual([]);
	});

	test("the required checks are the ones branch protection names", () => {
		// develop's required_status_checks.contexts, recorded here as the expectation. If branch
		// protection changes, this test is the place that has to be updated deliberately.
		expect(required.sort()).toEqual(["quality", "verify-bound-issue"]);
	});

	test("every check-reference node refers to a declared check", () => {
		const declared = new Set(graph.checks.map((check) => check.name));
		for (const node of graph.nodes) {
			if (node.kind !== "check-reference") continue;
			expect(declared.has(nodeOf(node).check)).toBe(true);
		}
	});

	test("no check-reference node claims a required check the graph does not require", () => {
		const requiredSet = new Set(required);
		for (const node of graph.nodes) {
			if (node.kind !== "check-reference") continue;
			expect(requiredSet.has(nodeOf(node).check)).toBe(node.required === true);
		}
	});

	test("the gate cannot be satisfied by a check the graph never required", () => {
		// Guards the specific regression: a non-required check passing must not make the gate green.
		const declared = new Set(graph.checks.map((check) => check.name));
		expect(declared.has("detect")).toBe(false);
		expect(declared.has("quality-run")).toBe(false);
	});
});

describe("job name extraction", () => {
	test("finds top-level job keys and ignores steps and keys outside jobs", () => {
		const names = jobNames(
			[
				"name: Thing",
				"on:",
				"  push:",
				"jobs:",
				"  build:",
				"    steps:",
				"      - run: x",
				"  test:",
				"    steps: []",
			].join("\n"),
		);
		expect(names).toEqual(["build", "test"]);
	});

	test("returns nothing for a file with no jobs block", () => {
		expect(jobNames("name: Thing\non:\n  push:\n")).toEqual([]);
	});
});
