import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCiConfig } from "./config.ts";
import {
	renderWorkflowTemplate,
	STANDARD_WORKFLOW_TEMPLATES,
	verifyWorkflowHash,
	type StandardWorkflowName,
	type TemplateContext,
} from "./templates.ts";

export interface InstallOptions {
	dryRun?: boolean;
	force?: boolean;
	templates?: readonly string[];
}

export interface InstallReport {
	installed: string[];
	skippedModified: string[];
	skippedUnmanaged: string[];
	dryRun: boolean;
}

export interface UpdateOptions {
	dryRun?: boolean;
	force?: boolean;
	templates?: readonly string[];
}

export interface UpdateReport {
	updated: string[];
	upToDate: string[];
	skippedModified: string[];
	skippedUnmanaged: string[];
	missing: string[];
	dryRun: boolean;
}

export interface WorkflowDriftItem {
	file: string;
	status: "in_sync" | "outdated" | "modified" | "unmanaged" | "missing";
	details?: string;
}

export interface SkillDriftItem {
	file: string;
	status: "in_sync" | "outdated" | "modified" | "unmanaged" | "missing";
	details?: string;
}

/** Discovers bundled skill directories under harness/assets/skills/. */
export async function discoverBundledSkills(): Promise<string[]> {
	const skillsDir = join(import.meta.dir as string, "../../assets/skills");
	let entries;
	try {
		entries = await readdir(skillsDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const names: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		try {
			await readFile(join(skillsDir, entry.name, "SKILL.md"), "utf-8");
			names.push(entry.name);
		} catch {
			// directory without SKILL.md is ignored
		}
	}
	return names.sort();
}

async function resolveTemplateContext(repoDir: string): Promise<TemplateContext> {
	try {
		const config = await loadCiConfig(repoDir);
		return {
			pipeline_repo: config.pipeline_repo || config.upstream_repo,
			pipeline_ref: config.pipeline_ref || config.upstream_ref,
		};
	} catch {
		return {};
	}
}

export async function checkWorkflowsDrift(
	repoDir = process.cwd(),
	templates = STANDARD_WORKFLOW_TEMPLATES,
): Promise<WorkflowDriftItem[]> {
	const context = await resolveTemplateContext(repoDir);
	const workflowsDir = join(repoDir, ".github", "workflows");
	const results: WorkflowDriftItem[] = [];

	for (const template of templates) {
		const filePath = join(workflowsDir, template);
		let content: string;
		try {
			content = await readFile(filePath, "utf-8");
		} catch {
			results.push({ file: template, status: "missing", details: "File does not exist" });
			continue;
		}

		const verification = verifyWorkflowHash(content);
		if (verification.status === "unmanaged") {
			results.push({ file: template, status: "unmanaged", details: "No managed-by header found" });
			continue;
		}

		if (verification.status === "modified") {
			results.push({
				file: template,
				status: "modified",
				details: `Hash mismatch (user edits): header=${verification.expectedHash?.slice(0, 8)} computed=${verification.computedHash?.slice(0, 8)}`,
			});
			continue;
		}

		const freshlyRendered = renderWorkflowTemplate(template, context);
		if (freshlyRendered.trim() === content.trim()) {
			results.push({ file: template, status: "in_sync" });
		} else {
			results.push({ file: template, status: "outdated", details: "Upstream template or config ref updated" });
		}
	}

	return results;
}

export async function checkSkillsDrift(repoDir = process.cwd()): Promise<SkillDriftItem[]> {
	const skills = await discoverBundledSkills();
	const results: SkillDriftItem[] = [];

	for (const name of skills) {
		const srcPath = join(import.meta.dir as string, "../../assets/skills", name, "SKILL.md");
		const srcContent = await readFile(srcPath, "utf-8");
		const destPath = join(repoDir, ".agents", "skills", name, "SKILL.md");
		let existingContent: string;
		try {
			existingContent = await readFile(destPath, "utf-8");
		} catch {
			results.push({ file: name, status: "missing", details: "File does not exist" });
			continue;
		}

		if (existingContent === srcContent) {
			results.push({ file: name, status: "in_sync" });
		} else {
			results.push({
				file: name,
				status: "modified",
				details: "Bundled skill differs from installed file",
			});
		}
	}

	return results;
}

export async function installSkills(
	repoDir = process.cwd(),
	options: InstallOptions = {},
): Promise<InstallReport> {
	const dryRun = options.dryRun === true;
	const force = options.force === true;
	const skills = await discoverBundledSkills();

	const installed: string[] = [];
	const skippedModified: string[] = [];
	const skippedUnmanaged: string[] = [];

	for (const name of skills) {
		const srcPath = join(import.meta.dir as string, "../../assets/skills", name, "SKILL.md");
		const srcContent = await readFile(srcPath, "utf-8");
		const destPath = join(repoDir, ".agents", "skills", name, "SKILL.md");

		let existingContent: string | null = null;
		try {
			existingContent = await readFile(destPath, "utf-8");
		} catch {
			// file does not exist
		}

		if (existingContent !== null && existingContent === srcContent) {
			continue;
		}

		if (existingContent !== null && !force) {
			// Skills are not marked with a managed-by header; any differing existing
			// file is considered a user modification and skipped without --force.
			skippedModified.push(name);
			continue;
		}

		if (!dryRun) {
			await mkdir(join(repoDir, ".agents", "skills", name), { recursive: true });
			await writeFile(destPath, srcContent, "utf-8");
		}
		installed.push(name);
	}

	return {
		installed,
		skippedModified,
		skippedUnmanaged,
		dryRun,
	};
}

export async function installWorkflows(
	repoDir = process.cwd(),
	options: InstallOptions = {},
): Promise<InstallReport> {
	const dryRun = options.dryRun === true;
	const force = options.force === true;
	const templates = options.templates ?? STANDARD_WORKFLOW_TEMPLATES;
	const context = await resolveTemplateContext(repoDir);
	const workflowsDir = join(repoDir, ".github", "workflows");

	const installed: string[] = [];
	const skippedModified: string[] = [];
	const skippedUnmanaged: string[] = [];

	for (const template of templates) {
		const filePath = join(workflowsDir, template);
		let existingContent: string | null = null;
		try {
			existingContent = await readFile(filePath, "utf-8");
		} catch {
			// file does not exist
		}

		if (existingContent !== null && !force) {
			const verification = verifyWorkflowHash(existingContent);
			if (verification.status === "unmanaged") {
				skippedUnmanaged.push(template);
				continue;
			}
			if (verification.status === "modified") {
				skippedModified.push(template);
				continue;
			}
		}

		const rendered = renderWorkflowTemplate(template, context);
		if (!dryRun) {
			await mkdir(workflowsDir, { recursive: true });
			await writeFile(filePath, rendered, "utf-8");
		}
		installed.push(template);
	}

	const skillsReport = await installSkills(repoDir, { dryRun, force });

	return {
		installed,
		skippedModified,
		skippedUnmanaged,
		dryRun,
	};
}

export async function updateWorkflows(
	repoDir = process.cwd(),
	options: UpdateOptions = {},
): Promise<UpdateReport> {
	const dryRun = options.dryRun === true;
	const force = options.force === true;
	const templates = options.templates ?? STANDARD_WORKFLOW_TEMPLATES;
	const context = await resolveTemplateContext(repoDir);
	const workflowsDir = join(repoDir, ".github", "workflows");

	const updated: string[] = [];
	const upToDate: string[] = [];
	const skippedModified: string[] = [];
	const skippedUnmanaged: string[] = [];
	const missing: string[] = [];

	for (const template of templates) {
		const filePath = join(workflowsDir, template);
		let existingContent: string;
		try {
			existingContent = await readFile(filePath, "utf-8");
		} catch {
			missing.push(template);
			continue;
		}

		const verification = verifyWorkflowHash(existingContent);
		if (verification.status === "unmanaged" && !force) {
			skippedUnmanaged.push(template);
			continue;
		}
		if (verification.status === "modified" && !force) {
			skippedModified.push(template);
			continue;
		}

		const rendered = renderWorkflowTemplate(template, context);
		if (rendered.trim() === existingContent.trim()) {
			upToDate.push(template);
			continue;
		}

		if (!dryRun) {
			await mkdir(workflowsDir, { recursive: true });
			await writeFile(filePath, rendered, "utf-8");
		}
		updated.push(template);
	}

	return {
		updated,
		upToDate,
		skippedModified,
		skippedUnmanaged,
		missing,
		dryRun,
	};
}
