import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { resolveDfFile } from "../utils/resolver";
import { ciFileSchema, type CiConfig, type ResolvedCheck } from "./schema.ts";

export async function loadCiConfig(repoDir = process.cwd()): Promise<CiConfig> {
	const absolutePath = resolveDfFile(repoDir, "ci");
	let content: string;
	try {
		content = await readFile(absolutePath, "utf-8");
	} catch (err: unknown) {
		throw new Error(`Failed to read ${absolutePath}: ${err instanceof Error ? err.message : String(err)}`);
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
		throw new Error(`Invalid ${absolutePath} schema: ${issues}`);
	}

	return result.data;
}

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

export function getRequiredCheckNames(config: CiConfig, repoSlug?: string): string[] {
	return resolveChecksForRepo(config, repoSlug)
		.filter((check) => check.required)
		.map((check) => check.name);
}
