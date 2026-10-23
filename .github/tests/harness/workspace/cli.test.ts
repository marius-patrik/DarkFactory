import { afterEach, beforeEach, expect, test } from "bun:test";
import { runWorkspaceCli } from "../../src/workspace/cli.ts";
import { createTempRepo, type TempRepo } from "./helpers.ts";

let temp: TempRepo | undefined;

function repo(): string {
	if (!temp) throw new Error("temporary repository was not created");
	return temp.repo;
}

beforeEach(() => {
	temp = createTempRepo();
});

afterEach(() => {
	temp?.cleanup();
	temp = undefined;
});

test("runWorkspaceCli status and log work", async () => {
	const logs: string[] = [];
	const originalLog = console.log;
	console.log = (message: string) => logs.push(message);
	try {
		await runWorkspaceCli(["--repo", repo(), "status", "--json"]);
		expect(logs.length).toBeGreaterThan(0);
		const first = logs[0];
		if (!first) throw new Error("status produced no output");
		const parsed = JSON.parse(first) as { branch?: string; isDirty?: boolean };
		expect(parsed.branch).toBe("main");
		expect(parsed.isDirty).toBe(false);

		logs.length = 0;
		await runWorkspaceCli(["--repo", repo(), "log", "--limit", "1"]);
		expect(logs[0]).toContain("init");
	} finally {
		console.log = originalLog;
	}
});
