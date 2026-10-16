import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeQualityPlan, type QualityAction } from "../../src/ci/quality-runner.ts";

const integration = process.env.DF_PYTHON_RUNTIME_SMOKE === "true" ? describe : describe.skip;

integration("real multi-interpreter Python quality execution", () => {
	it("executes two declared versions in isolated seeded interpreters without a matrix", async () => {
		const directory = await mkdtemp(join(tmpdir(), "df-python-smoke-"));
		try {
			const versions = ["3.10", "3.13"];
			const plan: QualityAction[] = versions.map((version) => ({
				id: `python:.:test@${version}`,
				packageId: "python:.",
				kind: "test",
				command: `python -c 'import sys; assert sys.version_info[:2] == (${version.replace(".", ", ")})'`,
				cwd: ".",
				ecosystem: "python",
				packageManager: "pip",
				version,
				setupCommand: "python -m pip --version",
				setupCwd: ".",
			}));
			const result = await executeQualityPlan(directory, plan, { workers: 2 });
			expect(result).toMatchObject({ planned: 2, executed: 2, passed: 2, failed: 0, blocked: 0 });
			expect(result.results.every((row) => row.result?.exitCode === 0)).toBe(true);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}, 180_000);
});
