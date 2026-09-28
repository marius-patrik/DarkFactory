import { expect, test } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..", "..");
const PAPER_ROOT = join(REPOSITORY_ROOT, "paper");
const PDF = join(REPOSITORY_ROOT, "PAPER.pdf");

async function snapshot(path: string) {
	return {
		bytes: await readFile(path),
		mode: (await stat(path)).mode,
	};
}

test("publication check does not mutate PAPER.pdf", async () => {
	const before = await snapshot(PDF);
	const child = Bun.spawn(["bun", "run", "publication", "--", "--check"], {
		cwd: PAPER_ROOT,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	const after = await snapshot(PDF);

	// Report what the check said. The assertion used to be a bare `toBe(true)` over a disjunction
	// with a message the script cannot produce, so a failure in CI said only `Expected: true` and
	// nobody could tell whether typst, the fonts, or the entrypoint was at fault.
	expect(exitCode === 0 ? "" : `publication check exited ${exitCode}:\n${stdout}${stderr}`).toBe("");

	// The tracked artifact is the contract: a check run must not rewrite it.
	expect(after.bytes.equals(before.bytes) ? "" : "PAPER.pdf was mutated by the check").toBe("");
	expect(after.mode).toBe(before.mode);
});
