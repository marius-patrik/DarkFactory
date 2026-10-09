import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll } from "bun:test";
import { renderReport, runSweep, sweepScope } from "../../src/install/sweep-main.ts";
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

describe("the declared sweep scope", () => {
	// `repo.app.sweep.repositories` is what makes an account-wide App safe. The App is installed on an
	// account, so `GET /installation/repositories` returns all 66 repositories that account can reach,
	// and a sweep that installed into all of them would open a pull request in repositories nobody asked
	// for. Being *able* to reach a repository is not a request to install into it.
	it("reads the declared repositories", () => {
		expect(sweepScope({ repo: { app: { sweep: { repositories: ["a/b", "c/d"] } } } })).toEqual(["a/b", "c/d"]);
	});

	it("treats an absent, empty or malformed block as no scope rather than an error", () => {
		// A repository whose configuration predates this key must produce a sweep that installs nothing
		// and says why - not a red run. A configuration upgrade becoming an outage for the fleet is worse
		// than a sweep that does nothing until someone declares a scope.
		expect(sweepScope({})).toEqual([]);
		expect(sweepScope({ repo: {} })).toEqual([]);
		expect(sweepScope({ repo: { app: {} } })).toEqual([]);
		expect(sweepScope({ repo: { app: { sweep: {} } } })).toEqual([]);
		expect(sweepScope({ repo: { app: { sweep: { repositories: "a/b" } } } })).toEqual([]);
	});

	it("drops entries that are not owner/name, rather than passing them to GitHub", () => {
		// A malformed entry reaching `with.repository` fails the fan-out at job creation, which is the
		// failure this whole change exists to make impossible.
		expect(sweepScope({ repo: { app: { sweep: { repositories: ["a/b", "bare", 7, null] } } } })).toEqual(["a/b"]);
	});

	it("the report says an empty scope is the cause when nothing was targeted", () => {
		// "Nothing to install" reads as a broken sweep; "nothing in scope" reads as what it is. Both
		// words are needed, and this is the only place that can tell them apart.
		const report = renderReport(1, [], [{ slug: "a/b", reason: "out-of-scope" }]);

		expect(report).toContain("targets: none");
		expect(report).toContain("repo.app.sweep.repositories is empty or lists nothing the App can reach");
	});

	it("stays quiet about scope when something was targeted", () => {
		const report = renderReport(1, ["a/b"], []);

		expect(report).not.toContain("repo.app.sweep.repositories");
	});
});
