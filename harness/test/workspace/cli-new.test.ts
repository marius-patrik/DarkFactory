import { afterEach, beforeEach, expect, test } from "bun:test";
import { runWorkspaceCli } from "../../src/workspace/cli.ts";
import { createTempRepo, type TempRepo } from "./helpers.ts";

let temp: TempRepo | undefined;

beforeEach(() => {
	temp = createTempRepo();
});

afterEach(() => {
	temp?.cleanup();
	temp = undefined;
});

test("runWorkspaceCli log command with custom limit", async () => {
	if (!temp) throw new Error("temporary repository was not created");
	const logs: string[] = [];
	const originalLog = console.log;
	console.log = (message: string) => logs.push(message);
	try {
		await runWorkspaceCli(["--repo", temp.repo, "log", "--limit", "1"]);
		expect(logs.length).toBe(1);
	} finally {
		console.log = originalLog;
	}
});
