import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "../../protocol/src/config-document.ts";
import { withFileLock } from "./storage/file-lock.ts";
import { replaceFile } from "./storage/replace-file.ts";
import {
	type EncryptedVaultEnvelope,
	emptyPushMap,
	emptyVault,
	type PushMap,
	type SecretScope,
	type Vault,
	type VaultEntry,
	type VaultMeta,
	type VaultTombstone,
	vaultToMeta,
} from "./vault.ts";
import { decryptVault, encryptVault } from "./vault-crypto.ts";

export interface VaultStoreOptions {
	dfHome: string;
	dataRepoPath: string;
}

function vaultEncPath(dataRepoPath: string): string {
	return join(dataRepoPath, "vault.enc.df");
}
function vaultMetaPath(dataRepoPath: string): string {
	return join(dataRepoPath, "vault.meta.df");
}
function pushMapPath(dataRepoPath: string): string {
	return join(dataRepoPath, "push-map.df");
}
function lockPath(dfHome: string): string {
	return join(dfHome, ".secrets-lock.df");
}

async function atomicWrite(path: string, content: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.${process.pid}.${crypto.randomUUID()}.tmp.df`;
	try {
		await writeFile(tmp, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
		await replaceFile(tmp, path);
	} catch (error) {
		await Bun.file(tmp)
			.delete()
			.catch(() => undefined);
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
async function loadEncryptedEnvelope(dataRepoPath: string): Promise<EncryptedVaultEnvelope | undefined> {
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
	await atomicWrite(vaultEncPath(dataRepoPath), `${JSON.stringify(envelope, null, 2)}\n`);
	await atomicWrite(vaultMetaPath(dataRepoPath), `${JSON.stringify(meta, null, 2)}\n`);
}
async function loadVaultMeta(dataRepoPath: string): Promise<VaultMeta | undefined> {
	return readJsonFile<VaultMeta>(vaultMetaPath(dataRepoPath));
}

export async function loadPushMap(dataRepoPath: string): Promise<PushMap> {
	return (await readJsonFile<PushMap>(pushMapPath(dataRepoPath))) ?? emptyPushMap();
}

export async function savePushMap(dataRepoPath: string, pushMap: PushMap): Promise<void> {
	await atomicWrite(pushMapPath(dataRepoPath), `${JSON.stringify(pushMap, null, 2)}\n`);
}

function stamp(): { by: string; at: string } {
	return { by: hostname(), at: new Date().toISOString() };
}
function withVaultLock<T>(dfHome: string, fn: () => Promise<T>): Promise<T> {
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
			created: existing >= 0 ? (vault.entries[existing]?.created ?? now) : now,
			updated: now,
		};
		if (existing >= 0) vault.entries[existing] = entry;
		else vault.entries.push(entry);
		if (vault.tombstones) vault.tombstones = vault.tombstones.filter((t) => t.name !== name);
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

export async function vaultList(dataRepoPath: string): Promise<VaultMeta> {
	return (await loadVaultMeta(dataRepoPath)) ?? { version: 1, entries: [] };
}

export async function vaultRm(opts: VaultStoreOptions, keyBase64: string, name: string): Promise<boolean> {
	return withVaultLock(opts.dfHome, async () => {
		const vault = await loadVault(opts.dataRepoPath, keyBase64);
		const index = vault.entries.findIndex((e) => e.name === name);
		if (index < 0) return false;
		vault.entries.splice(index, 1);
		const removed = stamp();
		vault.tombstones = [...(vault.tombstones ?? []).filter((t) => t.name !== name), { name, removed }];
		await saveVault(opts.dataRepoPath, vault, keyBase64);
		return true;
	});
}

/**
 * Merge remote vault into local vault, retaining deletion tombstones.
 *
 * Last writer wins by timestamp. Exact ties prefer deletion (fail-closed).
 * Replicas must replicate tombstones, not only live entries, to avoid resurrection.
 */
export function mergeVaults(local: Vault, remote: Vault): { merged: Vault; conflicts: string[] } {
	const live = new Map<string, VaultEntry>();
	const deleted = new Map<string, VaultTombstone>();
	const conflicts: string[] = [];
	for (const entry of local.entries) live.set(entry.name, entry);
	for (const tombstone of local.tombstones ?? []) {
		live.delete(tombstone.name);
		deleted.set(tombstone.name, tombstone);
	}
	for (const entry of remote.entries) {
		const oldEntry = live.get(entry.name);
		const oldTombstone = deleted.get(entry.name);
		const oldTimestamp = oldEntry?.updated.at ?? oldTombstone?.removed.at;
		const incomingTime = Date.parse(entry.updated.at);
		const oldTime = oldTimestamp === undefined ? Number.NEGATIVE_INFINITY : Date.parse(oldTimestamp);
		if (incomingTime > oldTime) {
			live.set(entry.name, entry);
			deleted.delete(entry.name);
			if (oldTimestamp !== undefined && oldTimestamp !== entry.updated.at)
				conflicts.push(`${entry.name}: remote update wins over local revision`);
		} else if (oldTimestamp !== undefined && oldTimestamp !== entry.updated.at && incomingTime < oldTime) {
			conflicts.push(`${entry.name}: local revision wins over remote update`);
		}
	}
	for (const tombstone of remote.tombstones ?? []) {
		const oldEntry = live.get(tombstone.name);
		const oldTombstone = deleted.get(tombstone.name);
		const oldTimestamp = oldEntry?.updated.at ?? oldTombstone?.removed.at;
		const incomingTime = Date.parse(tombstone.removed.at);
		const oldTime = oldTimestamp === undefined ? Number.NEGATIVE_INFINITY : Date.parse(oldTimestamp);
		if (incomingTime >= oldTime) {
			live.delete(tombstone.name);
			deleted.set(tombstone.name, tombstone);
			if (oldTimestamp !== undefined && oldTimestamp !== tombstone.removed.at)
				conflicts.push(`${tombstone.name}: remote deletion wins over local revision`);
		} else if (oldTimestamp !== undefined && incomingTime < oldTime) {
			conflicts.push(`${tombstone.name}: local revision wins over remote deletion`);
		}
	}
	return {
		merged: {
			version: 1,
			entries: [...live.values()],
			...(deleted.size > 0 ? { tombstones: [...deleted.values()] } : {}),
		},
		conflicts,
	};
}

/** Resolve the data repo path from the combined configuration's providers block. */
export async function resolveDataRepoPath(dfHome: string, repositoryRoot = process.cwd()): Promise<string> {
	const path = resolveConfigDocumentPath(repositoryRoot);
	if (!path || !existsSync(path)) return join(dfHome, "data-df");
	const document = parseConfigDocument(readFileSync(path, "utf8"), path);
	const providers = configBlock(document, "providers", path);
	if (typeof providers?.dataRepo === "string" && providers.dataRepo) return providers.dataRepo;
	return join(dfHome, "data-df");
}
