export type SecretScope = "repo" | "env" | "actions";

export interface VaultEntry {
	name: string;
	value: string;
	scope: SecretScope;
	targets?: string[];
	rotationDue?: string;
	created: { by: string; at: string };
	updated: { by: string; at: string };
}

export interface VaultMetaEntry {
	name: string;
	scope: SecretScope;
	targets?: string[];
	rotationDue?: string;
	created: { by: string; at: string };
	updated: { by: string; at: string };
}

export interface Vault {
	version: 1;
	entries: VaultEntry[];
}

export interface VaultMeta {
	version: 1;
	entries: VaultMetaEntry[];
}

export interface EncryptedVaultEnvelope {
	version: 1;
	algorithm: "aes-256-gcm";
	iv: string;
	tag: string;
	ciphertext: string;
}

export interface PushMapEntry {
	repos: string[];
	ghName: string;
}

export interface PushMap {
	[secretName: string]: PushMapEntry;
}

export function vaultToMeta(vault: Vault): VaultMeta {
	return {
		version: 1,
		entries: vault.entries.map((entry) => ({
			name: entry.name,
			scope: entry.scope,
			...(entry.targets ? { targets: [...entry.targets] } : {}),
			...(entry.rotationDue ? { rotationDue: entry.rotationDue } : {}),
			created: { ...entry.created },
			updated: { ...entry.updated },
		})),
	};
}

export function emptyVault(): Vault {
	return { version: 1, entries: [] };
}

export function emptyPushMap(): PushMap {
	return {};
}
