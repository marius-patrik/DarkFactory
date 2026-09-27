import { expect, setDefaultTimeout, test } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

// Applies to this file only. The suite's one test spawns a nested bun to compile the manuscript, so
// its wall time is process startup plus whatever else the machine is doing; see the note above it.
setDefaultTimeout(60_000);

const REPOSITORY_ROOT = resolve(import.meta.dir, "..", "..");
const PAPER_ROOT = join(REPOSITORY_ROOT, "paper");
const PDF = join(REPOSITORY_ROOT, "PAPER.pdf");

async function snapshot(path: string) {
	return {
		bytes: await readFile(path),
		mode: (await stat(path)).mode,
	};
}

/**
 * Spawns `bun run publication --check`, which compiles the manuscript and compares the result against
 * the repository-root `PAPER.pdf`. The check itself takes about half a second, but it is a nested bun
 * launch doing a real typst compile, so its wall time is dominated by process startup and whatever else
 * the machine is doing. Bun's 5000ms default is therefore not a bound this test can rely on: it passed
 * locally and failed CI at 5005ms with no change to the code. The timeout is declared explicitly and
 * generously, because the assertion — that the check does not mutate the committed PDF — is worth more
 * than a tight bound on how fast a subprocess starts.
 */
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
	// The claim under test is that the check does not mutate the committed PDF. That holds whether the
	// check succeeds, finds a real mismatch, or cannot run because the tool is absent — and the original
	// assertion could not tell those apart. It accepted only "clean" or "the PDF differs", so a missing
	// typst arrived as `Expected: true, Received: false` with the cause buried in the child's output.
	// That is how this passed on a machine with typst installed and failed on a runner whose node job
	// never installs it, naming nothing.
	//
	// A matrix row is an install-then-act pair, and `node:paper`'s setup is `bun install
	// --frozen-lockfile` and nothing more, so typst is genuinely absent in that job. The compile is
	// proven by the `typst:paper` typecheck row, which the runner does provision typst for.
	const output = `${stdout}${stderr}`;
	const toolAbsent = /command not found|No such file or directory|ENOENT/.test(output);
	const mismatch = output.includes("generated PDF does not match repository-root PAPER.pdf");
	if (exitCode !== 0 && !toolAbsent && !mismatch) {
		throw new Error(
			`publication check failed for an unrecognised reason (exit ${exitCode}):\n${output.trim() || "(no output)"}`,
		);
	}
	if (toolAbsent) {
		console.warn(
			"publication check could not run: typst is absent from this job. Non-mutation is still asserted; " +
				"the compile itself is proven by the typst:paper typecheck row.",
		);
	}
	expect(after.bytes.equals(before.bytes)).toBe(true);
	expect(after.mode).toBe(before.mode);
});
