import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { detectRepositoryEvidence } from "@darkfactory/core/repository-evidence";
import {
	renderWorkflowTemplate,
	STANDARD_WORKFLOW_TEMPLATES,
	type TemplateContext,
	verifyWorkflowHash,
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

export interface PluginSkill {
	/** Skill directory name, which every host requires to equal the frontmatter `name`. */
	name: string;
	/** Plugin declaring the skill. */
	plugin: string;
	/** Root the declaration was found under: the repository's, or the shipped assets'. */
	root: string;
	/** Absolute path to the declaring `SKILL.md`. */
	path: string;
}

/**
 * Roots holding plugin declarations, most authoritative first: this repository's `.agents/plugins/`,
 * then the `assets/plugins` folder shipped next to the compiled `df` binary.
 *
 * A shipped plugin appears in both when df runs from a checkout of the repository it ships from, so
 * the first root wins and the shipped copy is treated as the build output it is.
 *
 * @returns Every existing plugin root, in precedence order; empty when df was installed without plugins.
 */
export function pluginRoots(): string[] {
	const candidates = [
		join(import.meta.dir, "../../../../.darkfactory/plugins"),
		join(dirname(process.execPath), "assets/plugins"),
	];
	return candidates.filter((candidate) => existsSync(candidate));
}

/** Every `<plugin>/skills/<skill>/SKILL.md` under every plugin root, including duplicates across roots. */
export async function discoverPluginSkills(): Promise<PluginSkill[]> {
	const found: PluginSkill[] = [];
	for (const root of pluginRoots()) {
		for (const entry of await readdir(root, { withFileTypes: true })) {
			// `.claude-plugin` and friends hold a plugin's manifests, never a skill.
			if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
			const skillsDir = join(root, entry.name, "skills");
			if (!existsSync(skillsDir)) continue;
			for (const skill of await readdir(skillsDir, { withFileTypes: true })) {
				if (!skill.isDirectory()) continue;
				const path = join(skillsDir, skill.name, "SKILL.md");
				if (existsSync(path)) found.push({ name: skill.name, plugin: entry.name, root, path });
			}
		}
	}
	return found.sort((a, b) => a.name.localeCompare(b.name) || a.root.localeCompare(b.root));
}

/**
 * Lists the skills declared by plugins, one entry per name.
 *
 * @returns Skill names, sorted; empty when no plugins are present.
 */
export async function discoverBundledSkills(): Promise<string[]> {
	const seen = new Set<string>();
	const names: string[] = [];
	for (const skill of await discoverPluginSkills()) {
		if (seen.has(skill.name)) continue;
		seen.add(skill.name);
		names.push(skill.name);
	}
	return names;
}

/** The authoritative declaration of each skill, first root winning over the shipped copy. */
async function pluginSkillIndex(): Promise<Map<string, PluginSkill>> {
	const index = new Map<string, PluginSkill>();
	for (const skill of await discoverPluginSkills()) {
		if (!index.has(skill.name)) index.set(skill.name, skill);
	}
	return index;
}

async function resolveTemplateContext(repoDir: string): Promise<TemplateContext> {
	const evidence = await detectRepositoryEvidence(repoDir);
	const upstream = evidence.repoDf.upstream;
	return {
		...(upstream?.repo ? { pipeline_repo: upstream.repo } : {}),
		...(upstream?.ref ? { pipeline_ref: upstream.ref } : {}),
		default_branch: evidence.repoDf.identity?.default_branch ?? "main",
	};
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
				details: `Hash mismatch (user edited): header=${verification.expectedHash?.slice(0, 8)} computed=${verification.computedHash?.slice(0, 8)}`,
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
	const skills = await pluginSkillIndex();
	const results: SkillDriftItem[] = [];

	for (const [name, skill] of skills) {
		const srcContent = await readFile(skill.path, "utf-8");
		const destPath = join(repoDir, ".agents", "skills", name, "SKILL.md");
		let existingContent: string;
		try {
			existingContent = await readFile(destPath, "utf-8");
		} catch {
			results.push({ file: name, status: "missing", details: `not installed; declared by plugin ${skill.plugin}` });
			continue;
		}

		if (existingContent === srcContent) {
			results.push({ file: name, status: "in_sync" });
		} else {
			results.push({
				file: name,
				status: "modified",
				details: `plugin ${skill.plugin} declares it differently from the installed file`,
			});
		}
	}

	return results;
}

export async function installSkills(repoDir = process.cwd(), options: InstallOptions = {}): Promise<InstallReport> {
	const dryRun = options.dryRun === true;
	const force = options.force === true;
	const skills = await pluginSkillIndex();

	const installed: string[] = [];
	const skippedModified: string[] = [];
	const skippedUnmanaged: string[] = [];

	for (const [name, skill] of skills) {
		const srcContent = await readFile(skill.path, "utf-8");
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

export async function installWorkflows(repoDir = process.cwd(), options: InstallOptions = {}): Promise<InstallReport> {
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

	// Bundled skills install with the workflows; the report names them by their installed path.
	const skillsReport = await installSkills(repoDir, { dryRun, force });
	const skillFile = (name: string) => `.agents/skills/${name}/SKILL.md`;

	return {
		installed: [...installed, ...skillsReport.installed.map(skillFile)],
		skippedModified: [...skippedModified, ...skillsReport.skippedModified.map(skillFile)],
		skippedUnmanaged: [...skippedUnmanaged, ...skillsReport.skippedUnmanaged.map(skillFile)],
		dryRun,
	};
}

export async function updateWorkflows(repoDir = process.cwd(), options: UpdateOptions = {}): Promise<UpdateReport> {
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
