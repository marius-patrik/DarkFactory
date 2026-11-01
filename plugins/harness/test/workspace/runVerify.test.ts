import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runVerify } from "../../src/workspace/runVerify.ts";

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function worktree(): string {
	const root = mkdtempSync(join(tmpdir(), "df-run-verify-"));
	roots.push(root);
	return root;
}

// Commands use the Bun binary running this test, so no other tool is needed on any platform.
const bun = `"${process.execPath}"`;
const script = (code: string) => `${bun} -e "${code}"`;

describe("runVerify", () => {
	test("keeps the tail of the output and the exit code", async () => {
		const result = await runVerify({
			worktree: worktree(),
			command: script("process.stdout.write('a'.repeat(10000) + 'END')"),
			timeoutMs: 30_000,
		});
		expect(result).toMatchObject({ exitCode: 0, timedOut: false });
		expect(result.outputTail.length).toBe(4096);
		expect(result.outputTail.endsWith("END")).toBe(true);
		expect(
			(await runVerify({ worktree: worktree(), command: script("process.exit(3)"), timeoutMs: 30_000 })).exitCode,
		).toBe(3);
	});

	test("runs in the worktree, not the process directory", async () => {
		const dir = worktree();
		await runVerify({
			worktree: dir,
			command: script("require('fs').writeFileSync('marker.txt', 'x')"),
			timeoutMs: 30_000,
		});
		expect(existsSync(join(dir, "marker.txt"))).toBe(true);
	});

	test("a command that outlives the timeout is killed with everything it started", async () => {
		const started = Date.now();
		const result = await runVerify({
			worktree: worktree(),
			command: script("setTimeout(() => {}, 20000)"),
			timeoutMs: 500,
		});
		expect(result).toMatchObject({ exitCode: 124, timedOut: true });
		expect(Date.now() - started).toBeLessThan(10_000);
	}, 15_000);

	test("a missing worktree is reported as a command that could not start", async () => {
		const result = await runVerify({ worktree: join(worktree(), "missing"), command: script("0"), timeoutMs: 5_000 });
		expect(result.exitCode).toBe(127);
		expect(() => runVerify({ worktree: "", command: "true", timeoutMs: 1 })).toThrow("explicit worktree directory");
	});
});
