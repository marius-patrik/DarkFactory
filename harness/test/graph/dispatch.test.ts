import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

describe("dispatch", () => {
	let tmpDir!: string;
	const runsDir = "runs";

	beforeEach(async () => {
		// Never reach the real GitHub API: a token in the environment would make checks events call it.
		delete process.env.GH_TOKEN;
		delete process.env.GITHUB_TOKEN;
		tmpDir = await mkdtemp();
		await mkdir(join(tmpDir, runsDir), { recursive: true });
		await mkdir(join(tmpDir, ".darkfactory"), { recursive: true });
		// Create graph fixture
		await writeFile(
			join(tmpDir, ".darkfactory", "workflow.json"),
			JSON.stringify({
				graph: {
					version: 1,
					checks: [{ name: "lint", required: true }],
					nodes: [
						{ id: "trigger", kind: "agent", trigger: { event: "check_suite" } },
						{ id: "issuetrigger", kind: "agent", trigger: { event: "issue_comment" } },
					],
					edges: [
						{ from: "trigger", to: "trigger", on: { checks: "required_green" } },
						{ from: "issuetrigger", to: "issuetrigger", on: { event: "issue_comment", filter: { ignore_bots: true } } },
					],
				},
			}),
		);
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
		delete process.env.GITHUB_TOKEN;
		delete process.env.GITHUB_REPOSITORY;
	});

	async function runDispatch(args: string[]) {
		const { dispatch } = await import("../../src/graph/dispatch.ts");
		await dispatch(args);
	}

	async function mkdtemp(): Promise<string> {
		const id = Math.random().toString(36).slice(2);
		const tmpBase = process.platform === "win32" ? (process.env.TEMP ?? "C:\\temp") : "/tmp";
		if (!tmpBase) throw new Error("TEMP directory not found");
		return join(tmpBase, `df-test-${id}`);
	}

	it("outputs skip JSON when sender is a bot", async () => {
		const eventPath = join(tmpDir!, "event.json");
		await writeFile(
			eventPath,
			JSON.stringify({
				action: "created",
				comment: {
					body: "test",
					author_association: "NONE",
					user: { login: "github-actions[bot]", type: "Bot" },
				},
				issue: { number: 42 },
				sender: { login: "github-actions[bot]", type: "Bot" },
			}),
		);

		const output: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => {
			output.push(args[0] as string);
		};

		try {
			await runDispatch([
				"--event-name",
				"issue_comment",
				"--event",
				eventPath,
				"--graph",
				join(tmpDir!, ".darkfactory", "workflow.json"),
				"--runs",
				join(tmpDir!, runsDir),
			]);
		} finally {
			console.log = origLog;
		}

		const out = JSON.parse(output[0]!);
		expect(out.type as string).toBe("skip");
		expect(out.reason as string).toBe("bot ingress ignored");

		// No state file written
		const files = await readdir(join(tmpDir!, runsDir));
		expect(files.length).toBe(0);
	});

	it("plans normally and creates state file", async () => {
		const eventPath = join(tmpDir!, "event.json");
		await writeFile(
			eventPath,
			JSON.stringify({
				action: "completed",
				check_suite: {
					conclusion: "success",
					head_sha: "abc123",
					pull_requests: [{ number: 42 }],
				},
				sender: { login: "alice", type: "User" },
			}),
		);

		const output: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => {
			output.push(args[0] as string);
		};

		try {
			await runDispatch([
				"--event-name",
				"check_suite",
				"--event",
				eventPath,
				"--graph",
				join(tmpDir!, ".darkfactory", "workflow.json"),
				"--runs",
				join(tmpDir!, runsDir),
			]);
		} finally {
			console.log = origLog;
		}

		const out = JSON.parse(output[0]!);
		expect(out.subject as string).toBe("42");
		expect(out.event as string).toBe("checks.completed");
		expect(out.action as string).toBe("run");
		expect(out.commands as string[]).toEqual(["bun df run --node trigger"]);

		// State file created
		const files = await readdir(join(tmpDir!, runsDir));
		expect(files.length).toBe(1);
		const state = JSON.parse(await readFile(join(tmpDir!, runsDir, files[0]!), "utf8"));
		expect(state.current_node as string).toBe("trigger");
	});
});

async function readdir(path: string): Promise<string[]> {
	const { readdir } = await import("node:fs/promises");
	return (await readdir(path)) as string[];
}
