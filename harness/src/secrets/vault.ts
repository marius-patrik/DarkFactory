/**
 * Scope of a secret, determining where it is stored and applied.
 * - `repo` — stored in the repository secrets.
 * - `env` — stored in the environment secrets.
 * - `actions` — stored in the GitHub Actions secrets.
 */
export type SecretScope = "repo" | "env" | "actions";

/**
 * Metadata about creation or update of a vault entry.
 */
export interface VaultAuditMeta {
  /** Identifier of the user or system that performed the action. */
  by: string;
  /** ISO timestamp of when the action occurred. */
  at: string;
}

/**
 * Represents a secret stored in the vault.
 */
export interface VaultEntry {
  /** Name of the secret. */
  name: string;
  /** Plain‑text value of the secret. */
  value: string;
  /** Scope of the secret. */
  scope: SecretScope;
  /** Optional list of target environments or repositories the secret applies to. */
  targets?: string[];
  /** Optional ISO date string indicating when the secret should be rotated. */
  rotationDue?: string;
  /** Metadata about when the secret was created. */
  created: VaultAuditMeta;
  /** Metadata about the last update to the secret. */
  updated: VaultAuditMeta;
}

/**
 * Metadata representation of a vault entry, without the secret value.
 */
export interface VaultMetaEntry {
  /** Name of the secret. */
  name: string;
  /** Scope of the secret. */
  scope: SecretScope;
  /** Optional list of target environments or repositories the secret applies to. */
  targets?: string[];
  /** Optional ISO date string indicating when the secret should be rotated. */
  rotationDue?: string;
  /** Metadata about when the secret was created. */
  created: VaultAuditMeta;
  /** Metadata about the last update to the secret. */
  updated: VaultAuditMeta;
}

/**
 * Container for a collection of vault entries.
 */
export interface Vault {
  /** Vault format version. */
  version: 1;
  /** List of secret entries. */
  entries: VaultEntry[];
}

/**
 * Container for a collection of vault metadata entries.
 */
export interface VaultMeta {
  /** Vault format version. */
  version: 1;
  /** List of metadata entries. */
  entries: VaultMetaEntry[];
}

/**
 * Structure of an encrypted vault payload.
 */
export interface EncryptedVaultEnvelope {
  /** Vault format version. */
  version: 1;
  /** Encryption algorithm used. */
  algorithm: "aes-256-gcm";
  /** Initialization vector for encryption. */
  iv: string;
  /** Authentication tag. */
  tag: string;
  /** Encrypted ciphertext. */
  ciphertext: string;
}

/**
 * Mapping information for pushing a secret to external services.
 */
export interface PushMapEntry {
  /** List of repository identifiers the secret should be pushed to. */
  repos: string[];
  /** GitHub secret name used when pushing. */
  ghName: string;
}

/**
 * Mapping from secret names to push configuration.
 */
export interface PushMap {
  /** Entry keyed by secret name. */
  [secretName: string]: PushMapEntry;
}

/**
 * Convert a full vault to a metadata‑only representation, stripping secret values.
 * @param vault - The vault to convert.
 * @returns A {@link VaultMeta} object containing only metadata.
 */
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

/**
 * Create an empty vault instance.
 * @returns An empty {@link Vault}.
 */
export function emptyVault(): Vault {
  return { version: 1, entries: [] };
}

/**
 * Create an empty push map.
 * @returns An empty {@link PushMap}.
 */
export function emptyPushMap(): PushMap {
  return {};
}
