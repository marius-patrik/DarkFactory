import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll } from "bun:test";
import { renderReport, runSweep } from "../../src/install/sweep-main.ts";
import { MANIFEST_PATH } from "../../src/install/manifest.ts";

const roots: string[] = [];
async function pipelineRoot(): Promise<string> {
	// A scratch root rather than the checkout: `runSweep` reads `repo.dfconfig` from wherever it is
	// pointed, and a test that read the real one would pass on today's configuration and tell us
	// nothing about whether the wiring works.
	const dir = await mkdtemp(join(tmpdir(), "df-sweep-"));
	roots.push(dir);
	await writeFile(
		join(dir, MANIFEST_PATH),
		JSON.stringify({ repo: { identity: { owner: "marius-patrik", repo: "DarkFactory" } } }),
	);
	return dir;
}

afterAll(async () => {
	for (const dir of roots) await rm(dir, { recursive: true, force: true });
});

describe("the sweep entry point", () => {
	let root: string;
	beforeAll(async () => {
		root = await pipelineRoot();
	});

	it("reports rather than failing when the App key is absent", async () => {
		// A fork without the App key is the normal state, not an error. Failing here would make every
		// schedule red for a configuration question and train people to ignore a red sweep.
		const result = await runSweep({ PIPELINE_ROOT: root });

		expect(result.targets).toBe(0);
		expect(result.report).toContain("no DARKFACTORY_APP_PRIVATE_KEY");
	});

	it("writes has-targets and a report even when it has nothing to do", async () => {
		// Silence is the failure mode this exists to avoid: a sweep that found the App, installed
		// nothing and said nothing is indistinguishable from a broken one.
		const output = join(root, "out-no-key.txt");
		await runSweep({ PIPELINE_ROOT: root, GITHUB_OUTPUT: output });

		const text = await readFile(output, "utf8");
		expect(text).toContain("has-targets=false");
		expect(text).toContain("no DARKFACTORY_APP_PRIVATE_KEY");
		// The matrix block is still written, as an empty array, so the caller can read it unconditionally.
		expect(text).toContain("matrix<<DARKFACTORY_SWEEP_MATRIX\n[]\nDARKFACTORY_SWEEP_MATRIX");
	});
});

describe("the sweep report", () => {
	it("names the counts before the detail", () => {
		const report = renderReport(3, ["acme/one"], []);
		expect(report.split("\n")[0]).toBe("3 installation(s), 1 target(s)");
	});

	it("says none rather than leaving the line blank", () => {
		expect(renderReport(1, [], [])).toContain("targets: none");
	});

	it("tallies skips by reason with a few examples each", () => {
		// One example per reason, with an ellipsis past three: the full list is in the plan, and a log
		// listing six hundred archived repositories helps nobody.
		const report = renderReport(
			2,
			[],
			[
				{ slug: "a/1", reason: "archived" },
				{ slug: "a/2", reason: "archived" },
				{ slug: "a/3", reason: "archived" },
				{ slug: "a/4", reason: "archived" },
				{ slug: "b/1", reason: "already-installed" },
			],
		);

		expect(report).toContain("skipped archived: a/1, a/2, a/3, …");
		expect(report).toContain("skipped already-installed: b/1");
	});

	it("omits the ellipsis when the examples are the whole set", () => {
		expect(renderReport(1, [], [{ slug: "a/1", reason: "archived" }])).toContain("skipped archived: a/1");
		expect(renderReport(1, [], [{ slug: "a/1", reason: "archived" }])).not.toContain("…");
	});
});
