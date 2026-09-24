/** Scope in which a secret is intended to be used. */
export type SecretScope = "repo" | "env" | "actions";

/** One secret value and its ownership metadata. */
export interface VaultEntry {
	name: string;
	value: string;
	scope: SecretScope;
	targets?: string[];
	rotationDue?: string;
	created: { by: string; at: string };
	updated: { by: string; at: string };
}

/** Redacted metadata corresponding to a vault entry. */
export interface VaultMetaEntry {
	name: string;
	scope: SecretScope;
	targets?: string[];
	rotationDue?: string;
	created: { by: string; at: string };
	updated: { by: string; at: string };
}

/** Persisted set of machine-managed secret entries. */
export interface Vault {
	version: 1;
	entries: VaultEntry[];
}

/** Redacted vault representation safe for diagnostics. */
export interface VaultMeta {
	version: 1;
	entries: VaultMetaEntry[];
}

/** Versioned encrypted representation of a vault. */
export interface EncryptedVaultEnvelope {
	version: 1;
	algorithm: "aes-256-gcm";
	iv: string;
	tag: string;
	ciphertext: string;
}

/** Mapping from a vault secret to an external secret target. */
export interface PushMapEntry {
	repos: string[];
	ghName: string;
}

/** Collection of configured secret push mappings. */
export interface PushMap {
	[secretName: string]: PushMapEntry;
}

/** Builds the redacted metadata view of a vault. */
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

/** Creates an empty vault value. */
export function emptyVault(): Vault {
	return { version: 1, entries: [] };
}

/** Creates an empty secret push-map value. */
export function emptyPushMap(): PushMap {
	return {};
}
