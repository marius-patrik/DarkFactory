import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp as mkdtempNative, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatch } from "../../src/graph/dispatch.ts";

describe("dispatch shadow verification", () => {
	let tmpDir!: string;
	const runsDir = "runs";

	beforeEach(async () => {
		tmpDir = await mkdtemp();
		await mkdir(join(tmpDir, runsDir), { recursive: true });
		await mkdir(join(tmpDir, ".darkfactory"), { recursive: true });
		await writeFile(
			join(tmpDir, ".darkfactory", "graph.df"),
			JSON.stringify({
				graph: {
					version: 1,
					nodes: [{ id: "trigger", kind: "agent", trigger: { event: "check_suite" } }],
					edges: [{ from: "trigger", to: "trigger", on: { checks: "required_green" } }],
					checks: [{ name: "check-name", required: true }],
				},
			}),
		);
		process.env.DF_SHADOW_VERIFY = "true";
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
		delete process.env.DF_SHADOW_VERIFY;
		delete process.env.DF_PYTHON_ACTION_PATH;
	});

	async function mkdtemp(): Promise<string> {
		return await mkdtempNative(join(tmpdir(), "df-test-"));
	}

	it("identifies no drift (parity) when Python action matches TS action", async () => {
		const eventPath = join(tmpDir, "event.json");
		const summaryPath = join(tmpDir, "summary.md");
		await writeFile(
			eventPath,
			JSON.stringify({
				action: "completed",
				check_suite: {
					conclusion: "success",
					head_sha: "abc123",
					pull_requests: [{ number: 99 }],
				},
				sender: { login: "bob", type: "User" },
			}),
		);

		// TS planner produces: { type: "run", nodes: ["trigger"], node: undefined }
		await writeFile(
			join(tmpDir, ".darkfactory", "python-action.df"),
			JSON.stringify({ type: "run", nodes: ["trigger"], node: undefined }),
		);

		await dispatch([
			"--event-name",
			"check_suite",
			"--event",
			eventPath,
			"--graph",
			join(tmpDir, ".darkfactory", "graph.df"),
			"--runs",
			join(tmpDir, runsDir),
			"--shadow",
			"--summary",
			summaryPath,
		]);

		const summary = await readFile(summaryPath, "utf8");
		expect(summary).toContain("### Verification Diff");
		expect(summary).toContain("No drift detected between TS and Python actions.");
	});

	it("identifies drift when Python action differs from TS action", async () => {
		const eventPath = join(tmpDir, "event.json");
		const summaryPath = join(tmpDir, "summary.md");
		await writeFile(
			eventPath,
			JSON.stringify({
				action: "completed",
				check_suite: {
					conclusion: "success",
					head_sha: "abc123",
					pull_requests: [{ number: 99 }],
				},
				sender: { login: "bob", type: "User" },
			}),
		);

		// Python action produces different output
		await writeFile(
			join(tmpDir, ".darkfactory", "python-action.df"),
			JSON.stringify({ type: "none", nodes: [], node: undefined }),
		);

		await dispatch([
			"--event-name",
			"check_suite",
			"--event",
			eventPath,
			"--graph",
			join(tmpDir, ".darkfactory", "graph.df"),
			"--runs",
			join(tmpDir, runsDir),
			"--shadow",
			"--summary",
			summaryPath,
		]);

		const summary = await readFile(summaryPath, "utf8");
		expect(summary).toContain("### Verification Diff");
		expect(summary).toContain("Drift detected!");
	});

	it("handles missing supporting data gracefully with error handling", async () => {
		const eventPath = join(tmpDir, "event.json");
		const summaryPath = join(tmpDir, "summary.md");
		await writeFile(
			eventPath,
			JSON.stringify({
				action: "completed",
				check_suite: {
					conclusion: "success",
					head_sha: "abc123",
					pull_requests: [{ number: 99 }],
				},
				sender: { login: "bob", type: "User" },
			}),
		);

		// Point to non-existent python action path
		process.env.DF_PYTHON_ACTION_PATH = join(tmpDir, "nonexistent_python_action.json");

		await dispatch([
			"--event-name",
			"check_suite",
			"--event",
			eventPath,
			"--graph",
			join(tmpDir, ".darkfactory", "graph.df"),
			"--runs",
			join(tmpDir, runsDir),
			"--shadow",
			"--summary",
			summaryPath,
		]);

		const summary = await readFile(summaryPath, "utf8");
		expect(summary).toContain("### Verification Diff");
		expect(summary).toContain("Unable to verify.");
	});
});
