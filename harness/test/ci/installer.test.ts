import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWorkflowsDrift, installWorkflows, updateWorkflows } from "../../src/ci/installer.ts";

describe("Workflow installer & updater", () => {
	it("installs templates into .github/workflows with managed headers", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-install-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				join(temp, ".darkfactory", "ci.json"),
				JSON.stringify({ pipeline_repo: "my-org/my-df", pipeline_ref: "sha-999", checks: [] }),
			);

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
			const editedContent = originalContent + "\n# custom user step\n";
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
			// Install with old ref
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				join(temp, ".darkfactory", "ci.json"),
				JSON.stringify({ pipeline_repo: "my-org/my-df", pipeline_ref: "old-ref", checks: [] }),
			);
			await installWorkflows(temp);

			// Check drift - should be in sync with old-ref
			let drift = await checkWorkflowsDrift(temp);
			expect(drift.every((d) => d.status === "in_sync")).toBe(true);

			// Now change config ref
			await writeFile(
				join(temp, ".darkfactory", "ci.json"),
				JSON.stringify({ pipeline_repo: "my-org/my-df", pipeline_ref: "new-ref", checks: [] }),
			);

			// Check drift - should detect outdated
			drift = await checkWorkflowsDrift(temp);
			expect(drift.some((d) => d.status === "outdated")).toBe(true);

			// Run updateWorkflows
			const updateReport = await updateWorkflows(temp);
			expect(updateReport.updated.length).toBeGreaterThanOrEqual(3);

			const updatedCi = await readFile(join(temp, ".github", "workflows", "ci.yml"), "utf-8");
			expect(updatedCi).toContain("new-ref");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
