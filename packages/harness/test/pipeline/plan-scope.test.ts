/**
 * The deterministic scope gate, and the file-citation parsing it is built on.
 *
 * The expected values here were produced by running the Python implementation this replaces on the
 * same inputs, so each case is a claim about identical behaviour rather than about what the
 * TypeScript happens to do.
 */

import { describe, expect, test } from "bun:test";
import {
	checkScope,
	cleanPath,
	isFileInPlan,
	isPlanComment,
	isTestFile,
	looksLikeFilePath,
	PLAN_MARKER,
	parseExplicitPlanFiles,
	parsePlanFiles,
} from "../../src/pipeline/plan-scope.ts";

/** A plan citing its files the three ways an agent actually cites them. */
const CITING_PLAN =
	"### Implementation Plan\n\n" +
	"### Scope\n" +
	"- `.github/scripts/commands.py`\n" +
	"- `tests/test_commands.py`\n" +
	"Also update [agent runner](https://github.com/marius-patrik/darkfactory/blob/darkfactory/.github/scripts/agent_runner.py).\n";

describe("plan file citations", () => {
	test("blob links, backticks and list items all yield paths", () => {
		// The Python returned exactly these three, in this set.
		expect([...parsePlanFiles(CITING_PLAN)].sort()).toEqual([
			".github/scripts/agent_runner.py",
			".github/scripts/commands.py",
			"tests/test_commands.py",
		]);
	});

	test("a behavioral plan's references do not become an allowlist", () => {
		// Package names, config files and example paths are architectural context, not permission to
		// mutate. Only the dedicated heading may narrow the gate.
		const behavioral =
			"## Scope\nBuild the shared `@darkfactory/web` shell using current `repo.dfconfig` state.\n" +
			"Inspect `packages/web` and choose the concrete files from the current tree.\n";
		expect(parsePlanFiles(behavioral).size).toBeGreaterThan(0);
		expect([...parseExplicitPlanFiles(behavioral)]).toEqual([]);
	});

	test("an explicit file-scope section is the only allowlist", () => {
		const explicit =
			"## Scope\nImplement the approved behavior using current owners.\n\n" +
			"## File Scope\n" +
			"- `.github/scripts/agent_runner.py`\n" +
			"- `tests/test_agent_runner.py`\n\n" +
			"## Verification\nRun the pipeline tests.\n";
		expect([...parseExplicitPlanFiles(explicit)].sort()).toEqual([
			".github/scripts/agent_runner.py",
			"tests/test_agent_runner.py",
		]);
	});

	test("a file-scope section ends at the next heading", () => {
		// The Verification section is not a file scope, so nothing in it may reach the allowlist.
		const explicit = "## File Scope\n- `a.ts`\n\n## Verification\nRun `bun test`.\n";
		expect([...parseExplicitPlanFiles(explicit)]).toEqual(["a.ts"]);
	});

	test("a plan with no file-scope heading yields nothing", () => {
		expect([...parseExplicitPlanFiles("## Scope\nChange `a.ts`.\n")]).toEqual([]);
		expect([...parseExplicitPlanFiles("")]).toEqual([]);
	});
});

describe("the scope partition", () => {
	test("a file the plan did not name is out of scope", () => {
		const planFiles = new Set([".github/scripts/commands.py", "tests/test_commands.py"]);
		const changed = [".github/scripts/commands.py", ".github/scripts/project_automation.py"];
		expect(checkScope(changed, planFiles)).toEqual({
			inScope: [".github/scripts/commands.py"],
			outOfScope: [".github/scripts/project_automation.py"],
		});
	});

	test("a new test file is never out of scope", () => {
		// #267's plan named tests/test_commands.py and the implementation added
		// tests/test_footers.py. Tests accompany every change (DF-RULE-001).
		const planFiles = new Set([".github/scripts/commands.py", "tests/test_commands.py"]);
		const changed = [".github/scripts/commands.py", "tests/test_footers.py", "packages/harness/test/router.test.ts"];
		expect(checkScope(changed, planFiles)).toEqual({ inScope: changed, outOfScope: [] });
	});

	test("a plan that names no files reverts nothing", () => {
		// Reverting everything against a behavioral plan would undo the whole change.
		expect(checkScope([".github/scripts/project_automation.py"], new Set())).toEqual({
			inScope: [".github/scripts/project_automation.py"],
			outOfScope: [],
		});
	});

	test("an unrelated production file is still out of scope", () => {
		const split = checkScope(
			[".github/scripts/commands.py", ".github/scripts/project_automation.py"],
			new Set([".github/scripts/commands.py"]),
		);
		expect(split.outOfScope).toEqual([".github/scripts/project_automation.py"]);
	});
});

describe("matching a change against a plan", () => {
	test("a basename in the plan matches a nested change", () => {
		expect(isFileInPlan(".github/scripts/commands.py", new Set(["commands.py"]))).toBe(true);
	});

	test("an exact path matches", () => {
		expect(isFileInPlan("packages/harness/src/cli.ts", new Set(["packages/harness/src/cli.ts"]))).toBe(true);
	});

	test("an unrelated path does not match", () => {
		expect(isFileInPlan("packages/harness/src/cli.ts", new Set(["commands.py"]))).toBe(false);
	});
});

describe("recognising a test", () => {
	test.each([
		"tests/test_footers.py",
		"packages/harness/test/router.test.ts",
		"src/__tests__/thing.js",
		"test_module.py",
		"conftest.py",
		"packages/web/test/web-shell.test.tsx",
	])("%p is a test", (path) => {
		expect(isTestFile(path)).toBe(true);
	});

	test.each([".github/scripts/commands.py", "packages/harness/src/cli.ts", "src/latest.ts"])(
		"%p is not a test",
		(path) => {
			expect(isTestFile(path)).toBe(false);
		},
	);
});

describe("plan comments", () => {
	test("the marker identifies a plan", () => {
		expect(isPlanComment(`${PLAN_MARKER}\n### Implementation Plan\n\n`)).toBe(true);
	});

	test("a plan posted before the marker is still a plan", () => {
		// The marker arrived when the two approval gates were merged onto one issue. An issue whose
		// plan predates it would otherwise be planned a second time on approval.
		expect(isPlanComment("### Implementation Plan\n\n1. do the thing\n")).toBe(true);
		expect(isPlanComment("## Implementation Plan\n\n1. do the thing\n")).toBe(true);
	});

	test("a review is not a plan", () => {
		expect(isPlanComment("### Self-Review — iteration 1\n1. a finding\n")).toBe(false);
	});
});

describe("path normalisation", () => {
	test("a leading dot-slash and backslashes are removed", () => {
		expect(cleanPath("./src\\cli.ts")).toBe("src/cli.ts");
	});

	test("a leading dot in a directory name is kept", () => {
		expect(cleanPath(".github/scripts/commands.py")).toBe(".github/scripts/commands.py");
	});

	test("a command is not a path", () => {
		expect(looksLikeFilePath("bun test")).toBe(false);
		expect(looksLikeFilePath("bun && cd src")).toBe(false);
		expect(looksLikeFilePath("https://example.com/a.ts")).toBe(false);
	});

	test("a bare filename with a known extension is a path", () => {
		expect(looksLikeFilePath("commands.py")).toBe(true);
		expect(looksLikeFilePath("src/cli.ts")).toBe(true);
		expect(looksLikeFilePath(`a-very-long-${"x".repeat(300)}`)).toBe(false);
	});
});
