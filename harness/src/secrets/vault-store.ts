import { mkdir, readFile, writeFile } from "node:fs/promises";
import { replaceFile } from "../storage/replace-file.ts";
import { join, dirname } from "node:path";
import { hostname } from "node:os";
import { withFileLock } from "../storage/file-lock.ts";
import { encryptVault, decryptVault } from "./crypto.ts";
import { vaultToMeta, emptyVault, emptyPushMap, type Vault, type VaultEntry, type VaultMeta, type PushMap, type EncryptedVaultEnvelope, type SecretScope } from "./vault.ts";

export interface VaultStoreOptions {
	dfHome: string;
	dataRepoPath: string;
}

function vaultEncPath(dataRepoPath: string): string { return join(dataRepoPath, "vault.enc.json"); }
function vaultMetaPath(dataRepoPath: string): string { return join(dataRepoPath, "vault.meta.json"); }
function pushMapPath(dataRepoPath: string): string { return join(dataRepoPath, "push-map.json"); }
function lockPath(dfHome: string): string { return join(dfHome, ".secrets.lock"); }

async function atomicWrite(path: string, content: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
	try {
		await writeFile(tmp, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
		await replaceFile(tmp, path);
	} catch (error) {
		await Bun.file(tmp).delete().catch(() => undefined);
		throw error;
	}
}

async function readJsonFile<T>(path: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}

export async function loadEncryptedEnvelope(dataRepoPath: string): Promise<EncryptedVaultEnvelope | undefined> {
	return readJsonFile<EncryptedVaultEnvelope>(vaultEncPath(dataRepoPath));
}

export async function loadVault(dataRepoPath: string, keyBase64: string): Promise<Vault> {
	const envelope = await loadEncryptedEnvelope(dataRepoPath);
	if (!envelope) return emptyVault();
	return decryptVault(envelope, keyBase64);
}

export async function saveVault(dataRepoPath: string, vault: Vault, keyBase64: string): Promise<void> {
	const envelope = encryptVault(vault, keyBase64);
	const meta = vaultToMeta(vault);
	await atomicWrite(vaultEncPath(dataRepoPath), JSON.stringify(envelope, null, 2) + "\n");
	await atomicWrite(vaultMetaPath(dataRepoPath), JSON.stringify(meta, null, 2) + "\n");
}

export async function loadVaultMeta(dataRepoPath: string): Promise<VaultMeta | undefined> {
	return readJsonFile<VaultMeta>(vaultMetaPath(dataRepoPath));
}

export async function loadPushMap(dataRepoPath: string): Promise<PushMap> {
	return (await readJsonFile<PushMap>(pushMapPath(dataRepoPath))) ?? emptyPushMap();
}

export async function savePushMap(dataRepoPath: string, pushMap: PushMap): Promise<void> {
	await atomicWrite(pushMapPath(dataRepoPath), JSON.stringify(pushMap, null, 2) + "\n");
}

function stamp(): { by: string; at: string } {
	return { by: hostname(), at: new Date().toISOString() };
}

export function withVaultLock<T>(dfHome: string, fn: () => Promise<T>): Promise<T> {
	return withFileLock(lockPath(dfHome), fn);
}

export async function vaultSet(
	opts: VaultStoreOptions,
	keyBase64: string,
	name: string,
	value: string,
	scope: SecretScope = "actions",
): Promise<VaultEntry> {
	return withVaultLock(opts.dfHome, async () => {
		const vault = await loadVault(opts.dataRepoPath, keyBase64);
		const now = stamp();
		const existing = vault.entries.findIndex((e) => e.name === name);
		const entry: VaultEntry = {
			name,
			value,
			scope,
			created: existing >= 0 ? vault.entries[existing]!.created : now,
			updated: now,
		};
		if (existing >= 0) vault.entries[existing] = entry;
		else vault.entries.push(entry);
		await saveVault(opts.dataRepoPath, vault, keyBase64);
		return entry;
	});
}

export async function vaultGet(
	opts: VaultStoreOptions,
	keyBase64: string,
	name: string,
): Promise<VaultEntry | undefined> {
	const vault = await loadVault(opts.dataRepoPath, keyBase64);
	return vault.entries.find((e) => e.name === name);
}

export async function vaultList(
	dataRepoPath: string,
): Promise<VaultMeta> {
	return (await loadVaultMeta(dataRepoPath)) ?? { version: 1, entries: [] };
}

export async function vaultRm(
	opts: VaultStoreOptions,
	keyBase64: string,
	name: string,
): Promise<boolean> {
	return withVaultLock(opts.dfHome, async () => {
		const vault = await loadVault(opts.dataRepoPath, keyBase64);
		const index = vault.entries.findIndex((e) => e.name === name);
		if (index < 0) return false;
		vault.entries.splice(index, 1);
		await saveVault(opts.dataRepoPath, vault, keyBase64);
		return true;
	});
}

/** Merge remote vault into local vault. Last writer wins per entry by updated.at. */
export function mergeVaults(local: Vault, remote: Vault): { merged: Vault; conflicts: string[] } {
	const byName = new Map<string, VaultEntry>();
	const conflicts: string[] = [];
	for (const entry of local.entries) byName.set(entry.name, entry);
	for (const entry of remote.entries) {
		const existing = byName.get(entry.name);
		if (!existing) {
			byName.set(entry.name, entry);
		} else if (existing.updated.at !== entry.updated.at) {
			// Last writer wins
			const localTime = new Date(existing.updated.at).getTime();
			const remoteTime = new Date(entry.updated.at).getTime();
			if (remoteTime > localTime) {
				byName.set(entry.name, entry);
				conflicts.push(`${entry.name}: remote (${entry.updated.by}@${entry.updated.at}) wins over local (${existing.updated.by}@${existing.updated.at})`);
			} else if (remoteTime < localTime) {
				conflicts.push(`${entry.name}: local (${existing.updated.by}@${existing.updated.at}) wins over remote (${entry.updated.by}@${entry.updated.at})`);
			}
		}
	}
	return {
		merged: { version: 1, entries: [...byName.values()] },
		conflicts,
	};
}

/** Resolve the data repo path from config. */
export async function resolveDataRepoPath(dfHome: string): Promise<string> {
	try {
		const configRaw = await readFile(join(dfHome, "config.json"), "utf8");
		const config = JSON.parse(configRaw) as { dataRepo?: string };
		if (config.dataRepo && typeof config.dataRepo === "string") return config.dataRepo;
	} catch { /* use default */ }
	return join(dfHome, "data-df");
}
