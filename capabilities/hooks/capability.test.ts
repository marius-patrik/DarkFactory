import { describe, expect, test } from "bun:test";
import type { CapabilityHookContext, CapabilityRuntimeContext } from "@darkfactory/capability";
import { branchName, capability, conventionalCommit, testsTouched } from "./capability.ts";

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
