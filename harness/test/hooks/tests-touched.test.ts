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
		const result = await testsTouched.run(createContext(["harness/src/main.ts"]));
		expect(result.status).toBe("fail");
		expect(result.message).toContain("harness/src/main.ts");
	});

	test("source plus a test passes", async () => {
		const result = await testsTouched.run(createContext(["harness/src/main.ts", "harness/test/main.test.ts"]));
		expect(result.status).toBe("pass");
	});

	test("docs/config-only change passes", async () => {
		const result = await testsTouched.run(createContext(["README.md", ".github/workflows/ci.yml"]));
		expect(result.status).toBe("pass");
	});

	test("Python source with a tests/ change passes", async () => {
		const result = await testsTouched.run(createContext(["harness/scripts/pipeline.py", "tests/test_pipeline.py"]));
		expect(result.status).toBe("pass");
	});

	test("hook is registered", () => {
		const hook = hookById("tests-touched");
		expect(hook).toBeDefined();
		expect(hook!.id).toBe("tests-touched");
	});
});
