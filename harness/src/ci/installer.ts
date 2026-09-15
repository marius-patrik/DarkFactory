import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCiConfig } from "./config.ts";
import {
	renderWorkflowTemplate,
	STANDARD_WORKFLOW_TEMPLATES,
	verifyWorkflowHash,
	type StandardWorkflowName,
	type TemplateContext,
} from "./templates.ts";

/** Options for installing managed workflow templates. */
export interface InstallOptions {
	/** If true, only report what would be installed without writing files. */
	dryRun?: boolean;
	/** If true, overwrite user-modified or unmanaged workflow files. */
	force?: boolean;
	/** Optional list of template names to install; defaults to all standard templates. */
	templates?: readonly string[];
}

/** Summary of installWorkflows results. */
export interface InstallReport {
	/** Names of templates that were installed. */
	installed: string[];
	/** Names of templates skipped due to user modifications. */
	skippedModified: string[];
	/** Names of templates skipped because they are unmanaged. */
	skippedUnmanaged: string[];
	/** Whether the operation was a dry run. */
	dryRun: boolean;
}

/** Options for updating managed workflow templates. */
export interface UpdateOptions {
	/** If true, only report what would be updated without writing files. */
	dryRun?: boolean;
	/** If true, overwrite user-modified or unmanaged workflow files. */
	force?: boolean;
	/** Optional list of template names to update; defaults to all standard templates. */
	templates?: readonly string[];
}

/** Summary of updateWorkflows results. */
export interface UpdateReport {
	/** Names of templates that were updated. */
	updated: string[];
	/** Names of templates already up-to-date. */
	upToDate: string[];
	/** Names of templates skipped due to user modifications. */
	skippedModified: string[];
	/** Names of templates skipped because they are unmanaged. */
	skippedUnmanaged: string[];
	/** Names of templates missing (no file found). */
	missing: string[];
	/** Whether the operation was a dry run. */
	dryRun: boolean;
}

/** Describes the drift status of a managed workflow template. */
export interface WorkflowDriftItem {
	/** Template file name. */
	file: string;
	/** Drift status (in_sync, outdated, modified, unmanaged, missing). */
	status: "in_sync" | "outdated" | "modified" | "unmanaged" | "missing";
	/** Optional explanation of the drift status. */
	details?: string;
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

/**
 * Check all managed workflow templates for drift compared to the rendered templates.
 *
 * @param repoDir - Repository directory (defaults to current working directory).
 * @param templates - List of template file names to check (defaults to all standard templates).
 * @returns Array of WorkflowDriftItem describing the drift status for each template.
 */
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

/**
 * Install managed workflow templates into the repository.
 *
 * @param repoDir - Repository directory (defaults to current working directory).
 * @param options - Installation options controlling dry‑run, force, and specific templates.
 * @returns A report summarising which templates were installed or skipped.
 */
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

	return {
		installed,
		skippedModified,
		skippedUnmanaged,
		dryRun,
	};
}

/**
 * Update managed workflow templates in the repository.
 *
 * @param repoDir - Repository directory (defaults to current working directory).
 * @param options - Update options controlling dry‑run, force, and specific templates.
 * @returns A report summarising which templates were updated, up‑to‑date, or skipped.
 */
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
