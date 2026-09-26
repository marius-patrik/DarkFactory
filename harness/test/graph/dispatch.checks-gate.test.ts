// Test for dispatch handling of checks gate
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { CheckStateSource } from "../../src/graph/checks-gate.ts";
import { dispatch } from "../../src/graph/dispatch.ts";

const tmpDir = path.join(__dirname, "tmp");

beforeAll(async () => {
	await fs.mkdir(tmpDir, { recursive: true });
});

afterAll(async () => {
	// cleanup runs directory
	await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("dispatch checks-gate", () => {
	it("checks.completed with passing gate emits JSON and advances node", async () => {
		// Set up minimal environment for dispatch
		process.env.GH_TOKEN = "test_token";
		process.env.GITHUB_REPOSITORY = "test/repo";

		// minimal graph: start node triggers on checks.completed with a required check,
		// edge to next node via checks gate
		const manifest = {
			version: 1,
			graph: {
				version: 1,
				checks: [{ name: "required-check", context: "ci/required", required: true }],
				nodes: [
					{
						id: "start",
						kind: "gate",
						trigger: { event: "checks.completed" },
						command: "^\\s*(?:/df\\s+|/)(?:approve|reject|revise)\\s*$",
						author_associations: ["OWNER"],
					},
					{ id: "next", kind: "agent", identity: "test" },
				],
				edges: [{ from: "start", to: "next", on: { checks: "required_green" } }],
			},
		};
		const graphPath = path.join(tmpDir, "graph.json");
		await fs.writeFile(graphPath, JSON.stringify(manifest, null, 2));

		// minimal check_suite completed payload
		const payload = {
			action: "completed",
			check_suite: {
				conclusion: "success",
				head_sha: "abc123",
				pull_requests: [{ number: 1 }],
			},
		};
		const payloadPath = path.join(tmpDir, "payload.json");
		await fs.writeFile(payloadPath, JSON.stringify(payload));

		// stubbed CheckStateSource that returns success for the required check
		const stubCheckStateSource: CheckStateSource = {
			checkStates: async (): Promise<Map<string, "success" | "pending" | "failure">> => {
				const m = new Map<string, "success" | "pending" | "failure">();
				m.set("required-check", "success");
				return m;
			},
		};

		const consoleSpy = { calls: [] as string[] };
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			consoleSpy.calls.push(args.map((a) => String(a)).join(" "));
		};

		try {
			await dispatch(["--event-name", "check_suite", "--event", payloadPath, "--graph", graphPath, "--runs", tmpDir], {
				checkStateSource: stubCheckStateSource,
			});

			// capture printed JSON
			const printed = consoleSpy.calls.join("\n");
			const obj = JSON.parse(printed);
			expect(obj.type).toBe("checks");
			expect(obj.result).toBe("pass");

			// verify RunState file exists and current_node matches plan
			const runStatePath = path.join(tmpDir, "1-abc123.df");
			const runState = JSON.parse(await fs.readFile(runStatePath, "utf8"));
			expect(runState.current_node).toBe("next");

			// ensure no temporary files remain beside the final subject.df
			const entries = await fs.readdir(tmpDir);
			const tmpFiles = entries.filter((e) => e.endsWith(".tmp") || e.includes(".tmp-"));
			expect(tmpFiles).toHaveLength(0);
		} finally {
			console.log = originalLog;
			delete process.env.GH_TOKEN;
			delete process.env.GITHUB_REPOSITORY;
		}
	});
});
