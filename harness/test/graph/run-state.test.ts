/// <reference types="bun" />
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRunState, saveRunState } from "../../src/graph/run-state";
import type { WorkflowGraph } from "../../src/graph/types";

describe("run-state load/save", () => {
	const subject = "123";
	let tmpDir: string;

	beforeAll(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "runs-"));
	});

	afterAll(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	const graph: WorkflowGraph = {
		version: 1,
		checks: [],
		nodes: [
			{
				id: "node1",
				kind: "agent",
				trigger: { event: "issues.opened" },
			},
			{
				id: "node2",
				kind: "agent",
			},
		],
		edges: [],
	};

	test("creates fresh state for unknown subject", async () => {
		const state = await loadRunState(tmpDir, subject, graph);
		expect(state.run_id).toMatch(new RegExp(`^${subject}-\\d+$`));
		expect(state.current_node).toBe("node1");
		expect(state.outputs).toEqual({});
		expect(state.hints).toEqual([]);
	});

	test("circular reference rejects and leaves no temp file", async () => {
		const state = await loadRunState(tmpDir, subject, graph);
		// Build a circular reference that JSON.stringify will throw on.
		state.outputs["self"] = state.outputs;
		await expect(saveRunState(tmpDir, subject, state)).rejects.toThrow();
		// No *.tmp* file should remain after the failed save.
		const files = await readdir(tmpDir);
		const tmpFiles = files.filter((f) => f.includes("tmp"));
		expect(tmpFiles.length).toBe(0);
	});

	test("round‑trip persistence and atomic write", async () => {
		const state = await loadRunState(tmpDir, subject, graph);
		state.outputs["foo"] = "bar";
		await saveRunState(tmpDir, subject, state);
		const loaded = await loadRunState(tmpDir, subject, graph);
		expect(loaded.outputs).toEqual({ foo: "bar" });
		// Ensure only the final .df file exists, no *.tmp* files.
		const files = await readdir(tmpDir);
		expect(files).toContain(`${subject}.df`);
		const tmpFiles = files.filter((f) => f.includes("tmp"));
		expect(tmpFiles.length).toBe(0);
	});
});
