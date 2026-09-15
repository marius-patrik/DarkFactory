import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ciFileSchema, type CiConfig, type ResolvedCheck } from "./schema.ts";

/** Relative path to the CI config file within a repository. */
export const CI_CONFIG_RELATIVE_PATH = join(".darkfactory", "ci.json");

/**
 * Load and validate the CI configuration from `.darkfactory/ci.json`.
 *
 * @param repoDir - Directory containing the CI configuration file (defaults to current working directory).
 * @returns The parsed and validated CI configuration object.
 * @throws If the configuration file is missing, contains invalid JSON, or fails schema validation.
 */
export async function loadCiConfig(repoDir = process.cwd()): Promise<CiConfig> {
	const absolutePath = resolve(repoDir, CI_CONFIG_RELATIVE_PATH);
	let content: string;
	try {
		content = await readFile(absolutePath, "utf-8");
	} catch (err: unknown) {
		const code = (err as { code?: string })?.code;
		if (code === "ENOENT") {
			throw new Error(`.darkfactory/ci.json not found in ${repoDir}`);
		}
		throw err;
	}

	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(content);
	} catch (err) {
		throw new Error(`Invalid JSON in ${absolutePath}: ${err instanceof Error ? err.message : String(err)}`);
	}

	const result = ciFileSchema.safeParse(parsedJson);
	if (!result.success) {
		const issues = result.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
		throw new Error(`Invalid .darkfactory/ci.json schema: ${issues}`);
	}

	return result.data;
}

/**
 * Resolve required checks for a repository, applying per‑repository overrides.
 *
 * @param config - CI configuration object.
 * @param repoSlug - Optional repository slug to apply per‑repo overrides.
 * @returns Array of resolved checks with concrete required flag, workflow, and job.
 */
export function resolveChecksForRepo(config: CiConfig, repoSlug?: string): ResolvedCheck[] {
	return config.checks.map((check) => {
		let required = check.required;
		if (repoSlug && check.per_repo && repoSlug in check.per_repo) {
			const override = check.per_repo[repoSlug]?.required;
			if (typeof override === "boolean") {
				required = override;
			}
		}
		return {
			name: check.name,
			required,
			workflow: check.workflow,
			job: check.job,
		};
	});
}

/**
 * Get the names of required checks for a repository from the CI configuration.
 *
 * @param config - CI configuration object.
 * @param repoSlug - Optional repository slug to apply per‑repo overrides.
 * @returns List of required check names.
 */
export function getRequiredCheckNames(config: CiConfig, repoSlug?: string): string[] {
	return resolveChecksForRepo(config, repoSlug)
		.filter((check) => check.required)
		.map((check) => check.name);
}
