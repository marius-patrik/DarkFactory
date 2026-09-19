import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { type CiConfig, ciFileSchema, type ResolvedCheck } from "./schema.ts";

export const CI_CONFIG_RELATIVE_PATH = ".darkfactory/ci.json";

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
