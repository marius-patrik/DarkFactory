import { describe, expect, test } from "bun:test";
import { hookById } from "../../src/hooks/registry.ts";
import { testsTouched } from "../../src/hooks/tests-touched.ts";

function createContext(changedFiles: string[]) {
	return {
		repoDir: "/tmp/test-repo",
		changedFiles,
		readFile: async (_path: string) => "",
	};
}

describe("testsTouched hook", () => {
	test("source-only change fails and names the file", async () => {
		const result = await testsTouched.run(createContext(["packages/harness/src/install/main.ts"]));
		expect(result.status).toBe("fail");
		expect(result.message).toContain("packages/harness/src/install/main.ts");
	});

	test("source plus a test passes", async () => {
		const result = await testsTouched.run(
			createContext(["packages/harness/src/install/main.ts", "packages/harness/test/install/main.test.ts"]),
		);
		expect(result.status).toBe("pass");
	});

	test("docs/config-only change passes", async () => {
		const result = await testsTouched.run(createContext(["README.md", ".github/workflows/ci.yml"]));
		expect(result.status).toBe("pass");
	});

	test("root tests/ change counts as a test change", async () => {
		const result = await testsTouched.run(
			createContext(["packages/harness/src/install/main.ts", "tests/test_action_resolution.ts"]),
		);
		expect(result.status).toBe("pass");
	});

	test("a real repository path is recognised as source", async () => {
		// The prefixes used to be "harness/src/" and "harness/test/", which no repository-root-
		// relative path starts with, so the hook could never fire on a real change. Its own tests
		// passed "harness/src/main.ts" and so locked the fictional layout in.
		for (const source of ["packages/harness/src/install/main.ts", "packages/harness/src/hooks/tests-touched.ts"]) {
			expect((await testsTouched.run(createContext([source]))).status, source).toBe("fail");
		}
		expect((await testsTouched.run(createContext(["harness/src/main.ts"]))).status).toBe("pass");
	});

	test("hook is registered", () => {
		const hook = hookById("tests-touched");
		expect(hook).toBeDefined();
		expect(hook!.id).toBe("tests-touched");
	});
});
