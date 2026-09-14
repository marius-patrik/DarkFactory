import type { GitHubClient } from "../github/client.ts";
import type { VaultMeta, PushMap } from "./vault.ts";

export interface GitHubSecretInfo {
	name: string;
	created_at: string;
	updated_at: string;
}

export interface DriftEntry {
	name: string;
	ghName: string;
	status: "match" | "vault-only" | "github-only" | "stale";
	vaultUpdated?: string;
	githubUpdated?: string;
}

export interface DriftReport {
	repo: string;
	entries: DriftEntry[];
	healthy: boolean;
}

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
