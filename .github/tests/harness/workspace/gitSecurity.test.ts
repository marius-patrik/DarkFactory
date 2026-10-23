import { describe, expect, it } from "bun:test";
import { runGit } from "../../../../packages/harness/src/workspace/git.ts";

describe("runGit Security", () => {
	it("should reject repo paths starting with -", () => {
		expect(() => runGit("-rf", ["status"])).toThrow("Repository directory cannot start with a hyphen");
	});
});
