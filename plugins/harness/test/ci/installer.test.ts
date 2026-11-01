import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWorkflowsDrift, installWorkflows, updateWorkflows } from "../../src/ci/installer.ts";
import { renderWorkflowTemplate } from "../../src/ci/templates.ts";
import { configurationIssue } from "../../src/install/configuration-issue.ts";
import { repoRoot } from "./pipeline-source.ts";

async function writeUpstream(temp: string, repo: string, ref: string): Promise<void> {
	await writeFile(join(temp, "repo.dfconfig"), JSON.stringify({ repo: { upstream: { repo, ref } } }));
}

describe("Workflow installer & updater", () => {
	it("installs templates into .github/workflows with managed headers", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-install-"));
		try {
			await writeUpstream(temp, "my-org/my-df", "sha-999");

			const report = await installWorkflows(temp);
			expect(report.installed.length).toBeGreaterThanOrEqual(3);

			const ciPath = join(temp, ".github", "workflows", "ci.yml");
			const verifyPath = join(temp, ".github", "workflows", "verify-bound-issue.yml");
			const dispatchPath = join(temp, ".github", "workflows", "df-dispatch.yml");

			expect(await readFile(ciPath, "utf-8")).toContain("# managed-by: darkfactory ci.yml@");
			expect(await readFile(ciPath, "utf-8")).toContain("my-org/my-df");
			expect(await readFile(verifyPath, "utf-8")).toContain("# managed-by: darkfactory verify-bound-issue.yml@");
			expect(await readFile(dispatchPath, "utf-8")).toContain("# managed-by: darkfactory df-dispatch.yml@");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("respects --dry-run and does not write files", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-install-"));
		try {
			const report = await installWorkflows(temp, { dryRun: true });
			expect(report.installed.length).toBeGreaterThanOrEqual(3);
			const workflowsDir = join(temp, ".github", "workflows");
			// File should not exist because dry-run
			let dirExists = true;
			try {
				await readFile(join(workflowsDir, "ci.yml"));
			} catch {
				dirExists = false;
			}
			expect(dirExists).toBe(false);
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("never overwrites user-edited files without --force", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-install-"));
		try {
			// Install initial workflows
			await installWorkflows(temp);

			const ciPath = join(temp, ".github", "workflows", "ci.yml");
			const originalContent = await readFile(ciPath, "utf-8");

			// User modifies the file
			const editedContent = `${originalContent}\n# custom user step\n`;
			await writeFile(ciPath, editedContent);

			// Run install again without --force
			const report = await installWorkflows(temp);
			expect(report.skippedModified).toContain("ci.yml");

			// Content should remain user-modified
			expect(await readFile(ciPath, "utf-8")).toBe(editedContent);

			// Now run with force
			const forceReport = await installWorkflows(temp, { force: true });
			expect(forceReport.installed).toContain("ci.yml");
			expect(await readFile(ciPath, "utf-8")).not.toContain("# custom user step");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("never overwrites unmanaged files without --force", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-install-"));
		try {
			const workflowsDir = join(temp, ".github", "workflows");
			await mkdir(workflowsDir, { recursive: true });
			const unmanagedContent = "name: User Workflow\non: push\n";
			await writeFile(join(workflowsDir, "ci.yml"), unmanagedContent);

			const report = await installWorkflows(temp);
			expect(report.skippedUnmanaged).toContain("ci.yml");
			expect(await readFile(join(workflowsDir, "ci.yml"), "utf-8")).toBe(unmanagedContent);
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("updates managed files and reports drift", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-install-"));
		try {
			// Install with old ref from repo.dfconfig upstream.
			await writeUpstream(temp, "my-org/my-df", "old-ref");
			await installWorkflows(temp);

			// Check drift - should be in sync with old-ref
			let drift = await checkWorkflowsDrift(temp);
			expect(drift.every((d) => d.status === "in_sync")).toBe(true);

			// Change only the final repo.dfconfig upstream ref.
			await writeUpstream(temp, "my-org/my-df", "new-ref");

			// Check drift - should detect outdated
			drift = await checkWorkflowsDrift(temp);
			expect(drift.some((d) => d.status === "outdated")).toBe(true);

			// Run updateWorkflows
			const updateReport = await updateWorkflows(temp);
			expect(updateReport.updated.length).toBeGreaterThanOrEqual(2);

			const updatedCi = await readFile(join(temp, ".github", "workflows", "ci.yml"), "utf-8");
			expect(updatedCi).toContain("new-ref");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});

describe("shipped workflow templates", () => {
	const template = readFileSync(
		join(import.meta.dir, "..", "..", "assets", "workflows", "verify-bound-issue.yml.tmpl"),
		"utf-8",
	);

	it("delegates the bound-issue check to the runtime instead of reimplementing it", () => {
		// The template used to carry an inline Python heredoc implementing the same regular
		// expression as `bound-issue.ts`. That made a consuming repository need a Python interpreter
		// to run a check this repository stopped needing in #1148, and left two implementations of
		// one rule that could drift.
		expect(template).not.toContain("python3");
		expect(template).toContain("bound-issue.ts");
	});

	it("resolves the runtime the way the other converted templates do", () => {
		expect(template).toContain("{{pipeline_repo}}");
		expect(template).toContain("{{pipeline_ref}}");
		expect(template).toContain(".darkfactory-runtime");
	});

	it("carries the environment the check reads", () => {
		expect(template).toContain("PR_BODY");
		expect(template).toContain("GITHUB_EVENT_NAME");
	});
});

describe("the shipped CI template agrees with this repository's own", () => {
	// `df ci install` writes `ci.yml.tmpl` into a consuming repository, and this repository runs
	// the same gate through `.github/workflows/ci.yml`. When the two diverge, consumers get a gate
	// that is not the one being fixed here — which is how `$ROOT/capabilities` survived #1297: the
	// template still pointed at the directory the plugins moved out of, and a missing capabilities
	// root resolves to zero rows rather than an error, so a consumer's quality gate reported
	// nothing to check instead of failing.
	it("resolves the capabilities root where the plugins now live", () => {
		const template = readFileSync(join(import.meta.dir, "..", "..", "assets", "workflows", "ci.yml.tmpl"), "utf-8");
		expect(template).toContain('--capabilities-root "$ROOT/.darkfactory/plugins"');
		expect(template).not.toContain("$ROOT/capabilities");
	});

	it("declares the same jobs and steps as the workflow this repository runs", () => {
		const rendered = renderWorkflowTemplate("ci.yml", {
			pipeline_repo: "marius-patrik/DarkFactory",
			pipeline_ref: "main",
		});
		const shape = (document: unknown): string =>
			JSON.stringify(
				Object.fromEntries(
					Object.entries((document as { jobs: Record<string, { steps?: unknown[] }> }).jobs).map(([job, value]) => [
						job,
						(value.steps ?? []).map((step) => {
							const entry = step as { name?: string; uses?: string };
							return entry.name ?? entry.uses ?? "";
						}),
					]),
				),
			);
		const own = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf-8");
		expect(shape(Bun.YAML.parse(rendered))).toBe(shape(Bun.YAML.parse(own)));
	});
});

describe("the configuration issue df ci install files", () => {
	const body = configurationIssue("acme/thing", "marius-patrik/DarkFactory", false);

	it("tells the user to run nothing that was deleted", () => {
		// It used to say `python .github/scripts/repo_settings.py --apply`. #1311 deleted that
		// script and the Python with it; the replacement named a path under `packages/` that a
		// consuming repository does not have, so the instruction was unfollowable either way.
		expect(body).not.toContain("repo_settings.py");
		expect(body).not.toContain("python ");
	});

	// Was: "does not claim a consumer can apply branch protection itself", asserting the body says
	// there is no consumer-facing way — tracked in #1381. That became false when the pipeline gained
	// `protectLaneWhenGreen`, which applies a declared lane once its checks report green. The test was
	// correct when written and is now asserting a falsehood, which is the failure mode this whole file
	// has been guarding against in the other direction.
	//
	// What still holds: a fresh install does not apply protection. `install.yml` still passes
	// `--skip-protection`, because a repository whose CI has never run has no green check to wait for.
	// So the body must not claim protection is applied *now*, and must not tell the reader to run a
	// command from a repository that has no `packages/` to run it from.
	it("does not claim the install applied protection, or that a consumer runs it", () => {
		expect(body).not.toMatch(/repo-settings\.ts --apply/);
		expect(body).not.toMatch(/branch protection (is|has been) (applied|protected)/i);
		// The honest statement: the pipeline decides, from what CI reported, and names the checks it was
		// waiting on.
		expect(body).toMatch(/once that lane's required checks have come back green/i);
	});

	it("no longer tells the reader there is no consumer-facing way", () => {
		// Asserted so the stale sentence cannot return with the next edit. It was true in #1381 and false
		// now, and nothing else would notice.
		expect(body).not.toMatch(/no consumer-facing way/i);
	});
});
