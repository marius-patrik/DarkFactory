import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	checkSkillsDrift,
	checkWorkflowsDrift,
	discoverBundledSkills,
	installSkills,
	installWorkflows,
	updateWorkflows,
} from "../../src/ci/installer.ts";

const bundledSkillPath = (name: string) => join(import.meta.dir, "../../assets/skills", name, "SKILL.md");

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

describe("Bundled skills installer & drift", () => {
	it("discovers bundled skills from harness/assets/skills", async () => {
		const skills = await discoverBundledSkills();
		expect(skills.length).toBeGreaterThanOrEqual(1);
		expect(skills).toContain("darkfactory-auth");
	});

	it("installs bundled skills under .agents/skills", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-skill-install-"));
		try {
			const report = await installSkills(temp);
			expect(report.installed).toContain("darkfactory-auth");

			const destPath = join(temp, ".agents", "skills", "darkfactory-auth", "SKILL.md");
			expect(await stat(destPath)).toBeTruthy();
			expect(await readFile(destPath, "utf-8")).toBe(await readFile(bundledSkillPath("darkfactory-auth"), "utf-8"));
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("does not write skills during dry-run", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-skill-dryrun-"));
		try {
			const report = await installSkills(temp, { dryRun: true });
			expect(report.installed.length).toBeGreaterThanOrEqual(1);
			const destPath = join(temp, ".agents", "skills", "darkfactory-auth", "SKILL.md");
			try {
				await readFile(destPath);
				throw new Error("skill file should not exist");
			} catch {
				// expected - dry-run should not write
			}
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("skips modified skills without --force and overwrites with --force", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-skill-modified-"));
		try {
			// Seed a skill file that differs from the bundled source
			await mkdir(join(temp, ".agents", "skills", "darkfactory-auth"), { recursive: true });
			const modifiedContent = "# darkfactory-auth\n\nModified by user.\n";
			await writeFile(join(temp, ".agents", "skills", "darkfactory-auth", "SKILL.md"), modifiedContent);

			const skipReport = await installSkills(temp);
			expect(skipReport.skippedModified).toContain("darkfactory-auth");
			expect(await readFile(join(temp, ".agents", "skills", "darkfactory-auth", "SKILL.md"), "utf-8")).toBe(
				modifiedContent,
			);

			const forceReport = await installSkills(temp, { force: true });
			expect(forceReport.installed).toContain("darkfactory-auth");
			expect(await readFile(join(temp, ".agents", "skills", "darkfactory-auth", "SKILL.md"), "utf-8")).toBe(
				await readFile(bundledSkillPath("darkfactory-auth"), "utf-8"),
			);
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("reports skill drift", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-skill-drift-"));
		try {
			// Nothing installed -> missing
			let drift = await checkSkillsDrift(temp);
			expect(drift.some((d) => d.status === "missing")).toBe(true);

			// Install via workflows (which now also install skills)
			await installWorkflows(temp);

			drift = await checkSkillsDrift(temp);
			expect(drift.every((d) => d.status === "in_sync")).toBe(true);

			// Modify the installed skill
			await writeFile(join(temp, ".agents", "skills", "darkfactory-auth", "SKILL.md"), "# modified\n");

			drift = await checkSkillsDrift(temp);
			expect(drift.some((d) => d.status === "modified")).toBe(true);
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("installSkills installs skills independently of workflows", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-install-skills-"));
		try {
			const report = await installSkills(temp);
			expect(report.installed).toContain("darkfactory-auth");
			const destPath = join(temp, ".agents", "skills", "darkfactory-auth", "SKILL.md");
			expect(await readFile(destPath, "utf-8")).toBe(await readFile(bundledSkillPath("darkfactory-auth"), "utf-8"));
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
