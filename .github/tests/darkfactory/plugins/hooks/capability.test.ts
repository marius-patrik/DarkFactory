import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CapabilityHookContext, CapabilityRuntimeContext } from "../../../packages/capability/src/index.ts";
import { branchName, capability, commitTypes, conventionalCommit, testsTouched } from "./capability.ts";

const runtime: CapabilityRuntimeContext = {
	repositoryRoot: "/repo",
	domains: ["code"],
	credentials: { get: async () => undefined },
};

function context(extra: Partial<CapabilityHookContext> = {}): CapabilityHookContext {
	return {
		repositoryRoot: "/repo",
		changedFiles: [],
		...extra,
	};
}

describe("official hooks capability", () => {
	test("declares the recovered F47 hook IDs and trigger points", () => {
		expect(capability.hooks?.map((hook) => hook.id)).toEqual(["tests-touched", "conventional-commit", "branch-name"]);
		expect(capability.hooks?.map((hook) => hook.events)).toEqual([
			["pre-commit", "pr-open", "ci"],
			["pre-commit", "ci"],
			["pre-push", "pr-open", "ci"],
		]);
		expect(capability.hooks?.every((hook) => typeof hook.execute === "function")).toBe(true);
	});

	test("tests-touched consumes detected classifications instead of hard-coded repository paths", async () => {
		expect(
			await testsTouched(
				context({
					changedFiles: ["arbitrary/component/source.custom"],
					sourceFiles: ["arbitrary/component/source.custom"],
					testFiles: [],
				}),
			),
		).toEqual({
			status: "fail",
			message: "source changed without a test change: arbitrary/component/source.custom",
		});
		expect(
			await testsTouched(
				context({
					changedFiles: ["arbitrary/component/source.custom", "elsewhere/spec.custom"],
					sourceFiles: ["arbitrary/component/source.custom"],
					testFiles: ["elsewhere/spec.custom"],
				}),
			),
		).toEqual({ status: "pass" });
	});

	test("tests-touched fails closed when a changed scope lacks canonical classification", () => {
		expect(testsTouched(context({ changedFiles: ["something.changed"] }))).toEqual({
			status: "fail",
			message: "tests-touched requires detected source/test file classification from the invocation layer",
		});
		expect(testsTouched(context())).toEqual({ status: "pass" });
	});

	test.each([
		"feat(core): add hook invocation",
		"fix: repair behavior",
		"docs(governance)!: update rule contract",
		"Merge remote-tracking branch 'origin/darkfactory'",
		'Revert "feat: x"',
	])("conventional-commit accepts %s", (commitMessage) => {
		expect(conventionalCommit(context({ commitMessage }))).toEqual({ status: "pass" });
	});

	test.each(["added stuff", "feat(Core): x", "feat:no space", "wip: thing"])(
		"conventional-commit rejects %s",
		(commitMessage) => {
			expect(conventionalCommit(context({ commitMessage })).status).toBe("fail");
		},
	);

	test.each([...commitTypes])("conventional-commit accepts the declared type %s", (type) => {
		expect(conventionalCommit(context({ commitMessage: `${type}: description` }))).toEqual({ status: "pass" });
		expect(conventionalCommit(context({ commitMessage: `${type}(area)!: description` }))).toEqual({ status: "pass" });
	});

	// `style`, `perf`, `build` and `revert` were accepted by the previous eleven-type pattern while
	// the `commits-and-repository-taxonomy` skill allows seven. They must now be rejected, or the hook contradicts the rule again.
	test.each(["style", "perf", "build", "revert"])("conventional-commit rejects the undeclared type %s", (type) => {
		expect(conventionalCommit(context({ commitMessage: `${type}: description` })).status).toBe("fail");
	});

	test("the hook's commit-type taxonomy is the taxonomy the `commits-and-repository-taxonomy` skill declares", () => {
		const rule = readFileSync(
			join(import.meta.dir, "..", "df-rules", "skills", "commits-and-repository-taxonomy", "SKILL.md"),
			"utf8",
		);
		const declared = /^Allowed base types are (.+)\.$/mu.exec(rule);
		// Fail closed: if the normative sentence is renamed or removed, this must fail rather than
		// silently compare against nothing.
		expect(declared?.[1]).toBeString();
		const ruleTypes = [...(declared?.[1] ?? "").matchAll(/`([a-z]+)`/gu)]
			.map((match) => match[1])
			.filter((type): type is string => type !== undefined);
		expect(ruleTypes.length).toBeGreaterThan(0);
		expect([...commitTypes].sort()).toEqual([...ruleTypes].sort());
	});

	test.each(["feat/model-poller", "fix/windows-path-separators", "docs/harness-tsdoc-w2"])(
		"branch-name accepts %s",
		(branch) => {
			expect(branchName(context({ branch }))).toEqual({ status: "pass" });
		},
	);

	test.each(["Feat/X", "feature/342-thing", "feat//double", "feat/"])("branch-name rejects %s", (branch) => {
		expect(branchName(context({ branch })).status).toBe("fail");
	});

	test("hook definitions execute through the ABI contract", async () => {
		const hook = capability.hooks?.find((candidate) => candidate.id === "conventional-commit");
		expect(await hook?.execute?.(context({ commitMessage: "feat: valid" }), runtime)).toEqual({ status: "pass" });
	});
});

describe("the declared hooks are reachable by the runner", () => {
	// Every hook in this capability was callable from nowhere: the ABI validated that each one
	// declared an event, and nothing in the repository ever called `execute`. A rule that cannot be
	// invoked is not a rule, and a unit test of the function does not catch that. This asserts the
	// capability's own hooks are reachable through the same path a real invocation would use, and
	// that a hook which fails is reported rather than silently skipped.
	test("every declared hook is selected and executed for each of its events", async () => {
		const { runHooks } = await import("../../../packages/capability/src/index.ts");
		const declared = (capability.hooks ?? []).flatMap((hook) =>
			(hook.events ?? (hook.event ? [hook.event] : [])).map((event) => ({ id: hook.id, event })),
		);
		expect(declared.length).toBeGreaterThan(0);

		for (const { id, event } of declared) {
			const result = await runHooks(
				[capability],
				event,
				// Evidence every hook in this capability can evaluate: a source file, its test, a
				// conforming commit message and a conforming branch name.
				context({
					changedFiles: ["packages/harness/src/ci/detected.ts", "packages/harness/test/ci/detected.test.ts"],
					sourceFiles: ["packages/harness/src/ci/detected.ts"],
					testFiles: ["packages/harness/test/ci/detected.test.ts"],
					commitMessage: "fix(ci): a conforming subject",
					branch: "v1/hookenforce",
				}),
				runtime,
			);
			expect(result.outcomes.map((outcome) => outcome.hook)).toContain(id);
			expect(result.ok).toBe(true);
		}
	});

	test("a hook that rejects the evidence is reported as a failure through the runner", async () => {
		const { runHooks } = await import("../../../packages/capability/src/index.ts");
		const result = await runHooks(
			[capability],
			"pre-commit",
			// The hook's first move is to pass when nothing changed, so the evidence has to name the
			// changed files: sourceFiles and testFiles alone describe a tree, not a change.
			context({
				changedFiles: ["packages/harness/src/ci/detected.ts"],
				sourceFiles: ["packages/harness/src/ci/detected.ts"],
				testFiles: [],
			}),
			runtime,
		);
		expect(result.ok).toBe(false);
		const rejected = result.outcomes.find((outcome) => outcome.hook === "tests-touched");
		expect(rejected?.status).toBe("fail");
		expect(rejected?.message).toContain("source changed without a test change");
	});
});
