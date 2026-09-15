import type { GitHubClient } from "../github/client.ts";
import type { VaultMeta, PushMap } from "./vault.ts";

/**
 * Information about a secret stored in GitHub.
 */
export interface GitHubSecretInfo {
	/** The name of the secret stored in GitHub. */
	name: string;
	/** ISO 8601 timestamp when the secret was created. */
	created_at: string;
	/** ISO 8601 timestamp when the secret was last updated. */
	updated_at: string;
}

/**
 * Entry describing the drift status of a single secret.
 */
export interface DriftEntry {
	/** The name of the local secret in the vault. */
	name: string;
	/** The GitHub secret name (may differ from local name). */
	ghName: string;
	/** The drift status: match, vault-only, github-only, or stale. */
	status: "match" | "vault-only" | "github-only" | "stale";
	/** ISO 8601 timestamp of the last vault update. */
	vaultUpdated?: string;
	/** ISO 8601 timestamp of the last GitHub update. */
	githubUpdated?: string;
}

/**
 * Report describing drift between vault and GitHub secrets for a repository.
 */
export interface DriftReport {
	/** The repository slug (owner/repo). */
	repo: string;
	/** List of drift entries for each secret. */
	entries: DriftEntry[];
	/** Whether all secrets are in sync (no drift detected). */
	healthy: boolean;
}

/**
 * Detects drift between local vault secrets and GitHub repository secrets.
 * @param client - The GitHub client to fetch secrets data.
 * @param repoSlug - The repository slug (owner/repo) to check.
 * @param meta - The vault metadata containing secret entries.
 * @param pushMap - The push map defining how secrets map to GitHub.
 * @returns A drift report indicating whether secrets are in sync.
 */
export async function detectDrift(
	client: GitHubClient,
	repoSlug: string,
	meta: VaultMeta,
	pushMap: PushMap,
): Promise<DriftReport> {
	const [owner, repo] = repoSlug.split("/");
	if (!owner || !repo) throw new Error(`Invalid repo slug: ${repoSlug}`);

	// Fetch GitHub secrets list (name + updated_at, never values)
	const response = await client.rest<{ secrets: GitHubSecretInfo[] }>("GET", `/repos/${owner}/${repo}/actions/secrets`);
	const ghSecrets = new Map(response.secrets.map((s) => [s.name, s]));

	const entries: DriftEntry[] = [];
	const mapped = new Set<string>();

	for (const [secretName, mapping] of Object.entries(pushMap)) {
		if (!mapping.repos.includes(repoSlug)) continue;
		mapped.add(mapping.ghName);

		const vaultEntry = meta.entries.find((e) => e.name === secretName);
		const ghSecret = ghSecrets.get(mapping.ghName);

		if (vaultEntry && ghSecret) {
			entries.push({
				name: secretName,
				ghName: mapping.ghName,
				status: "match",
				vaultUpdated: vaultEntry.updated.at,
				githubUpdated: ghSecret.updated_at,
			});
		} else if (vaultEntry && !ghSecret) {
			entries.push({
				name: secretName,
				ghName: mapping.ghName,
				status: "vault-only",
				vaultUpdated: vaultEntry.updated.at,
			});
		} else if (!vaultEntry && ghSecret) {
			entries.push({
				name: secretName,
				ghName: mapping.ghName,
				status: "stale",
				githubUpdated: ghSecret.updated_at,
			});
		}
	}

	// Check for GitHub secrets not in push map
	for (const [ghName, ghSecret] of ghSecrets) {
		if (!mapped.has(ghName)) {
			entries.push({
				name: ghName,
				ghName,
				status: "github-only",
				githubUpdated: ghSecret.updated_at,
			});
		}
	}

	return {
		repo: repoSlug,
		entries,
		healthy: entries.every((e) => e.status === "match"),
	};
}
