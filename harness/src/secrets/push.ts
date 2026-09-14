import type { GitHubRepository } from "../github/repository.ts";
import type { PushMap, Vault, VaultEntry } from "./vault.ts";

export interface PushResult {
	name: string;
	ghName: string;
	repo: string;
	status: "pushed" | "skipped" | "dry-run";
}

export interface PushOptions {
	vault: Vault;
	pushMap: PushMap;
	repoSlug: string;
	repository: GitHubRepository;
	only?: string[];
	dryRun?: boolean;
}

export async function pushSecrets(options: PushOptions): Promise<PushResult[]> {
	const { vault, pushMap, repoSlug, repository, only, dryRun } = options;
	const results: PushResult[] = [];

	for (const [secretName, mapping] of Object.entries(pushMap)) {
		if (only && only.length > 0 && !only.includes(secretName)) continue;
		if (!mapping.repos.includes(repoSlug)) continue;

		const entry = vault.entries.find((e) => e.name === secretName);
		if (!entry) {
			results.push({ name: secretName, ghName: mapping.ghName, repo: repoSlug, status: "skipped" });
			continue;
		}

		if (dryRun) {
			results.push({ name: secretName, ghName: mapping.ghName, repo: repoSlug, status: "dry-run" });
			continue;
		}

		await repository.setRepositorySecret(mapping.ghName, entry.value);
		results.push({ name: secretName, ghName: mapping.ghName, repo: repoSlug, status: "pushed" });
	}

	return results;
}
