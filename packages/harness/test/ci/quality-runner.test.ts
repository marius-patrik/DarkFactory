import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeQualityPlan, type QualityAction } from "../../src/ci/quality-runner.ts";

const success = { exitCode: 0, timedOut: false, outputTail: "" };
function action(packageId: string, kind: QualityAction["kind"], version?: string): QualityAction {
	return {
		id: `${packageId}:${kind}${version ? `@${version}` : ""}`,
		packageId,
		kind,
		command: kind,
		cwd: packageId,
		ecosystem: "node",
		packageManager: "bun",
		...(version ? { version } : {}),
		setupCommand: "bun install --frozen-lockfile",
		setupCwd: ".",
	};
}

describe("single-runner quality scheduler", () => {
	it("executes more than 256 actions with one dependency install and bounded parallel lanes", async () => {
		const plan: QualityAction[] = [];
		for (let n = 0; n < 100; n++) {
			for (const kind of ["test", "typecheck", "lint"] as const) plan.push(action(`pkg-${n}`, kind));
		}
		const log: string[] = [];
		let running = 0;
		let peak = 0;
		const observed: string[] = [];
		const result = await executeQualityPlan("/tmp/df-quality", plan, {
			workers: 3,
			log: (line) => log.push(line),
			execute: async (command, cwd) => {
				if (command === "bun install --frozen-lockfile") return success;
				running++;
				peak = Math.max(peak, running);
				await new Promise((r) => setTimeout(r, 0));
				observed.push(`${cwd.split("/").at(-1)}:${command}`);
				running--;
				return success;
			},
		});
		expect(result).toMatchObject({ planned: 300, executed: 300, passed: 300, failed: 0, blocked: 0 });
		expect(peak).toBe(3);
		expect(log.filter((line) => line.startsWith("SETUP "))).toHaveLength(1);
		expect(observed.filter((row) => row.startsWith("pkg-3:"))).toEqual(["pkg-3:test", "pkg-3:typecheck", "pkg-3:lint"]);
	});

	it("blocks actions dependent on failed setup and does not report a fake pass", async () => {
		let invoked = 0;
		const result = await executeQualityPlan("/tmp/df-quality", [action("pkg-a", "test"), action("pkg-b", "lint")], {
			execute: async (command) => {
				invoked++;
				return command.startsWith("bun install") ? { exitCode: 2, timedOut: false, outputTail: "offline" } : success;
			},
		});
		expect(invoked).toBe(1);
		expect(result).toMatchObject({ planned: 2, executed: 0, passed: 0, failed: 0, blocked: 2 });
	});

	it("continues independent actions and captures real command failures", async () => {
		const plan = [action("pkg-a", "test"), action("pkg-b", "lint")];
		const result = await executeQualityPlan("/tmp/df-quality", plan, {
			execute: async (command) =>
				command === "test" ? { exitCode: 1, timedOut: false, outputTail: "assertion failed" } : success,
		});
		expect(result).toMatchObject({ planned: 2, executed: 2, passed: 1, failed: 1, blocked: 0 });
		expect(result.results[0]?.result?.outputTail).toBe("assertion failed");
	});

	it("records thrown command errors as failed actions without dropping independent results", async () => {
		const plan = [action("pkg-a", "test"), action("pkg-b", "lint")];
		const result = await executeQualityPlan("/tmp/df-quality", plan, {
			execute: async (command) => {
				if (command === "test") throw new Error("tool executable crashed");
				return success;
			},
		});
		expect(result).toMatchObject({ planned: 2, executed: 2, passed: 1, failed: 1, blocked: 0 });
		expect(result.results[0]?.result?.exitCode).toBe(127);
		expect(result.results[0]?.result?.outputTail).toContain("tool executable crashed");
		expect(result.results[1]?.result?.exitCode).toBe(0);
	});

	it("rejects a symlinked package that resolves outside the consumer checkout", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-quality-root-"));
		const outside = await mkdtemp(join(tmpdir(), "df-quality-external-"));
		try {
			await symlink(outside, join(root, "linked-package"));
			await expect(
				executeQualityPlan(root, [{ ...action("linked-package", "test"), cwd: "linked-package" }]),
			).rejects.toThrow("symlink");
		} finally {
			await rm(root, { recursive: true, force: true });
			await rm(outside, { recursive: true, force: true });
		}
	});

	it("rejects a nonpositive or nonfinite per-command timeout", async () => {
		await expect(executeQualityPlan("/tmp/df-quality", [action("a", "test")], { timeoutMs: 0 })).rejects.toThrow("timeout");
		await expect(executeQualityPlan("/tmp/df-quality", [action("a", "test")], { timeoutMs: Number.POSITIVE_INFINITY })).rejects.toThrow("timeout");
	});

	it("rejects duplicate identity, unsafe paths, empty plans and conflicting installers", async () => {
		await expect(executeQualityPlan("/tmp/df-quality", [])).rejects.toThrow("No executable");
		await expect(executeQualityPlan("/tmp/df-quality", [action("a", "test"), action("a", "test")])).rejects.toThrow(
			"Duplicate",
		);
		await expect(
			executeQualityPlan("/tmp/df-quality", [{ ...action("a", "test"), cwd: "../../outside" }]),
		).rejects.toThrow("escapes");
		await expect(executeQualityPlan("/tmp/df-quality", [action("a", "test")], { workers: 0 })).rejects.toThrow(
			"worker",
		);
		await expect(
			executeQualityPlan("/tmp/df-quality", [
				action("a", "test"),
				{ ...action("b", "test"), setupCommand: "npm install" },
			]),
		).rejects.toThrow("Conflicting");
	});
});
