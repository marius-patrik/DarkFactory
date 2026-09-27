import { describe, expect, test } from "bun:test";
import { branchName } from "../../src/hooks/branch-name.ts";
import { conventionalCommit } from "../../src/hooks/conventional-commit.ts";
import { hookById } from "../../src/hooks/registry.ts";
import type { HookContext } from "../../src/hooks/types.ts";

const context = (extra: Partial<HookContext>): HookContext => ({
	repoDir: "/repo",
	changedFiles: [],
	readFile: async () => "",
	...extra,
});

describe("conventional-commit hook", () => {
	test.each([
		"feat(harness): add x",
		"fix: y",
		"docs(governance)!: breaking rule change",
		"Merge remote-tracking branch 'origin/darkfactory'",
		'Revert "feat: x"',
	])("accepts %s", async (commitMessage) => {
		expect((await conventionalCommit.run(context({ commitMessage }))).status).toBe("pass");
	});

	test.each(["added stuff", "feat(Harness): x", "feat:no space", "wip: thing"])("rejects %s", async (commitMessage) => {
		const result = await conventionalCommit.run(context({ commitMessage }));
		expect(result.status).toBe("fail");
		expect(result.message).toContain(commitMessage);
	});

	test("a missing message fails", async () => {
		expect(await conventionalCommit.run(context({}))).toEqual({
			id: "conventional-commit",
			status: "fail",
			message: "commit message is missing",
		});
	});
});

describe("branch-name hook", () => {
	test.each(["feat/model-poller", "fix/windows-path-separators", "docs/harness-tsdoc-w2"])(
		"accepts %s",
		async (branch) => {
			expect((await branchName.run(context({ branch }))).status).toBe("pass");
		},
	);

	test.each(["Feat/X", "feature/342-thing", "feat//double", "feat/"])("rejects %s", async (branch) => {
		const result = await branchName.run(context({ branch }));
		expect(result.status).toBe("fail");
		expect(result.message).toContain(branch);
	});

	test("a missing branch passes", async () => {
		expect((await branchName.run(context({}))).status).toBe("pass");
	});
});

test("both hooks are registered next to tests-touched", () => {
	expect(["tests-touched", "conventional-commit", "branch-name"].map((id) => hookById(id)?.id)).toEqual([
		"tests-touched",
		"conventional-commit",
		"branch-name",
	]);
});
