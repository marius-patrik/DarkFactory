import type { GitHubRepository } from "../github/repository.ts";
import type { PushMap, Vault, VaultEntry } from "./vault.ts";

/**
 * Result of pushing a single secret to GitHub.
 */
export interface PushResult {
	/** The local secret name from the vault. */
	name: string;
	/** The GitHub secret name. */
	ghName: string;
	/** The repository slug where the secret was pushed. */
	repo: string;
	/** The result status: pushed, skipped, or dry-run. */
	status: "pushed" | "skipped" | "dry-run";
}

/**
 * Options for pushing vault secrets to a GitHub repository.
 */
export interface PushOptions {
	/** The vault containing secrets to push. */
	vault: Vault;
	/** The push map defining how secrets map to GitHub. */
	pushMap: PushMap;
	/** The repository slug (owner/repo) to push to. */
	repoSlug: string;
	/** The GitHub repository object for API calls. */
	repository: GitHubRepository;
	/** Optional list of secret names to push (if specified, only these are pushed). */
	only?: string[];
	/** Whether to simulate the push without making actual API calls. */
	dryRun?: boolean;
}

/**
 * Pushes vault secrets to a GitHub repository.
 * @param options - Push options including vault, pushMap, and repository.
 * @returns A list of push results for each secret.
 */
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
