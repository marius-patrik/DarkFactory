import { generateVaultKey, isValidVaultKey } from "./crypto.ts";
import { storeVaultKey, loadVaultKey } from "./keychain.ts";
import type { KeychainOptions } from "./keychain.ts";
import {
	loadVault,
	saveVault,
	vaultSet,
	vaultGet,
	vaultList,
	vaultRm,
	resolveDataRepoPath,
	loadPushMap,
} from "./vault-store.ts";
import type { VaultStoreOptions } from "./vault-store.ts";
import { syncDataRepo, isGitRepo } from "./sync.ts";
import { pushSecrets } from "./push.ts";
import { detectDrift } from "./drift.ts";
import { emptyVault } from "./vault.ts";
import type { GitHubClient } from "../github/client.ts";
import type { GitHubRepository } from "../github/repository.ts";

export interface SecretsCommandDeps {
	dfHome: string;
	allowFileKey?: boolean;
	stdin?: () => Promise<string>;
	githubClient?: (repoSlug: string) => { client: GitHubClient; repository: GitHubRepository };
}

function option(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 && index + 1 < args.length ? args[index + 1] : undefined;
}

async function requireKey(keychainOpts: KeychainOptions): Promise<string> {
	const key = await loadVaultKey(keychainOpts);
	if (!key) throw new Error("Vault key not found. Run 'df secrets init' or 'df secrets import-key' first.");
	return key;
}

function secretsHelp(): string {
	return [
		"Usage: df secrets <command> [options]",
		"",
		"Commands:",
		"  init                          Create vault, generate key, store in keychain",
		"  import-key <base64>           Import key to keychain (or --from-stdin)",
		"  export-key                    Print vault key (once for manual transfer)",
		"  set NAME [--from-stdin]       Set secret (value from arg, stdin, or prompt)",
		"  get NAME [--reveal]           Get secret (values never printed without --reveal)",
		"  list                          List secrets (no values)",
		"  rm NAME                       Remove secret",
		"  sync                          Pull/rebase, merge by updated.at, commit, push",
		"  push <owner/repo> [--only NAME] [--dry-run]  Seal vault secrets into GitHub repo secrets",
		"  doctor                        Check vault, key, decrypt, and drift vs GitHub",
		"",
		"Options:",
		"  --insecure-file-key           Allow $DF_HOME/vault.key fallback (0600) when OS keychain unavailable",
		"  --reveal                      Print secret value (get only)",
		"  --only NAME                   Push only named secret",
		"  --dry-run                     Show what would be pushed without calling GitHub",
	].join("\n");
}

export async function secretsCommand(args: string[], deps: SecretsCommandDeps): Promise<void> {
	if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
		console.log(secretsHelp());
		return;
	}
	const subcommand = args[0];
	const keychainOpts: KeychainOptions = { dfHome: deps.dfHome, allowFileKey: deps.allowFileKey };
	const dataRepoPath = await resolveDataRepoPath(deps.dfHome);
	const storeOpts: VaultStoreOptions = { dfHome: deps.dfHome, dataRepoPath };

	switch (subcommand) {
		case "init": {
			const existingKey = await loadVaultKey(keychainOpts);
			if (existingKey) {
				console.log("Vault key already exists. Use 'df secrets export-key' to view it.");
				return;
			}
			const key = generateVaultKey();
			await storeVaultKey(key, keychainOpts);
			const vault = emptyVault();
			await saveVault(dataRepoPath, vault, key);
			console.log("Vault initialized. Key stored in OS keychain.");
			console.log("Run 'df secrets export-key' to get the key for other machines.");
			return;
		}

		case "import-key": {
			let key = args[1];
			// Handle --from-stdin or piped stdin
			if (args.includes("--from-stdin") && deps.stdin) {
				key = (await deps.stdin()).trim();
			} else if (!key && deps.stdin) {
				// If no arg but stdin provided (piped), use it if non-empty; otherwise error later
				const stdinVal = (await deps.stdin()).trim();
				if (stdinVal) key = stdinVal;
			}
			if (!key || !isValidVaultKey(key)) throw new Error("Invalid vault key. Must be 32-byte base64.");
			await storeVaultKey(key, keychainOpts);
			console.log("Vault key imported and stored in OS keychain.");
			return;
		}

		case "export-key": {
			const key = await requireKey(keychainOpts);
			console.log(key);
			return;
		}

		case "set": {
			const name = args[1];
			if (!name) throw new Error("Usage: df secrets set NAME [--from-stdin] [VALUE]");
			const key = await requireKey(keychainOpts);
			let value: string | undefined;
			if (args.includes("--from-stdin")) {
				if (!deps.stdin) throw new Error("No stdin available for --from-stdin");
				value = (await deps.stdin()).trim();
			} else if (args[2] && !args[2].startsWith("--")) {
				value = args[2];
			} else if (deps.stdin) {
				// Try stdin if available (for tests piping)
				const maybe = (await deps.stdin()).trim();
				if (maybe) value = maybe;
			}
			if (!value) throw new Error("Secret value cannot be empty. Provide VALUE or use --from-stdin.");
			await vaultSet(storeOpts, key, name, value);
			console.log(`Secret '${name}' saved.`);
			return;
		}

		case "get": {
			const name = args[1];
			if (!name) throw new Error("Usage: df secrets get NAME [--reveal]");
			const key = await requireKey(keychainOpts);
			const entry = await vaultGet(storeOpts, key, name);
			if (!entry) throw new Error(`Secret '${name}' not found`);
			if (args.includes("--reveal")) {
				console.log(entry.value);
			} else {
				console.log("***");
			}
			return;
		}

		case "list": {
			const meta = await vaultList(dataRepoPath);
			if (meta.entries.length === 0) {
				console.log("No secrets in vault.");
				return;
			}
			console.log("name\tscope\tupdated_by\tupdated_at");
			for (const entry of meta.entries) {
				console.log(`${entry.name}\t${entry.scope}\t${entry.updated.by}\t${entry.updated.at}`);
			}
			return;
		}

		case "rm": {
			const name = args[1];
			if (!name) throw new Error("Usage: df secrets rm NAME");
			const key = await requireKey(keychainOpts);
			const removed = await vaultRm(storeOpts, key, name);
			if (!removed) throw new Error(`Secret '${name}' not found`);
			console.log(`Secret '${name}' removed.`);
			return;
		}

		case "sync": {
			if (!(await isGitRepo(dataRepoPath))) {
				throw new Error(`Data repo not found at ${dataRepoPath}. Run 'df secrets init' first.`);
			}
			const key = await loadVaultKey(keychainOpts).catch(() => undefined);
			const result = await syncDataRepo({ dataRepoPath, keyBase64: key ?? undefined });
			if (result.conflicts.length > 0) {
				for (const c of result.conflicts) console.log(`conflict: ${c}`);
			}
			if (result.pulled) console.log(`Pulled: ${result.pullOutput}`);
			else console.log(`Pull: ${result.pullOutput}`);
			if (result.pushed) console.log(`Pushed: ${result.pushOutput}`);
			else console.log(`Push: ${result.pushOutput}`);
			return;
		}

		case "push": {
			const repoSlug = args[1];
			if (!repoSlug || !repoSlug.includes("/"))
				throw new Error("Usage: df secrets push <owner/repo> [--only NAME] [--dry-run]");
			const key = await requireKey(keychainOpts);
			const vault = await loadVault(dataRepoPath, key);
			const pushMap = await loadPushMap(dataRepoPath);
			const only = option(args, "--only");
			const dryRun = args.includes("--dry-run");

			if (!deps.githubClient) throw new Error("GitHub client not configured");
			const { repository } = deps.githubClient(repoSlug);
			const results = await pushSecrets({
				vault,
				pushMap,
				repoSlug,
				repository,
				only: only ? [only] : undefined,
				dryRun,
			});

			for (const r of results) {
				console.log(`${r.name} -> ${r.repo}/${r.ghName}: ${r.status}`);
			}
			if (results.length === 0) console.log("No secrets to push for this repo.");
			return;
		}

		case "doctor": {
			const checks: Array<{ check: string; status: "ok" | "warn" | "fail"; message: string }> = [];

			const key = await loadVaultKey(keychainOpts);
			checks.push(
				key
					? { check: "vault-key", status: "ok", message: "Vault key found in keychain" }
					: { check: "vault-key", status: "fail", message: "Vault key not found" },
			);

			const meta = await vaultList(dataRepoPath);
			// vault file existence is ok if meta load succeeded (even empty); check if envelope exists
			checks.push({ check: "vault-file", status: "ok", message: `Vault has ${meta.entries.length} entries` });

			const isRepo = await isGitRepo(dataRepoPath);
			checks.push(
				isRepo
					? { check: "data-repo", status: "ok", message: "Data repo is a git repository" }
					: { check: "data-repo", status: "warn", message: "Data repo is not a git repository" },
			);

			if (key) {
				try {
					await loadVault(dataRepoPath, key);
					checks.push({ check: "decrypt", status: "ok", message: "Vault decrypts successfully" });
				} catch (error) {
					checks.push({
						check: "decrypt",
						status: "fail",
						message: `Decrypt failed: ${error instanceof Error ? error.message : String(error)}`,
					});
				}
			}

			// Drift check if github client available and push-map has entries
			if (key && deps.githubClient) {
				const pushMap = await loadPushMap(dataRepoPath);
				const repos = [...new Set(Object.values(pushMap).flatMap((m) => m.repos))];
				for (const repo of repos) {
					try {
						const { client } = deps.githubClient(repo);
						const report = await detectDrift(client, repo, meta, pushMap);
						if (report.healthy) {
							checks.push({ check: `drift:${repo}`, status: "ok", message: `No drift for ${repo}` });
						} else {
							const extras = report.entries.filter((e) => e.status !== "match");
							for (const e of extras) {
								checks.push({
									check: `drift:${repo}:${e.ghName}`,
									status: "warn",
									message: `${e.ghName} drift: ${e.status}${e.vaultUpdated ? ` vault:${e.vaultUpdated}` : ""}${e.githubUpdated ? ` github:${e.githubUpdated}` : ""}`,
								});
							}
						}
					} catch (error) {
						checks.push({
							check: `drift:${repo}`,
							status: "warn",
							message: `Drift check failed: ${error instanceof Error ? error.message : String(error)}`,
						});
					}
				}
			}

			for (const c of checks) {
				const icon = c.status === "ok" ? "✓" : c.status === "warn" ? "!" : "✗";
				console.log(`[${icon}] ${c.check}: ${c.message}`);
			}
			if (checks.some((c) => c.status === "fail")) process.exitCode = 1;
			return;
		}

		default:
			throw new Error(`Unknown secrets command: ${subcommand ?? ""}\n${secretsHelp()}`);
	}
}
