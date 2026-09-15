import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { replaceFile } from "./storage/replace-file.ts";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { AuthOperationOptions, Credential, CredentialInfo, CredentialStore, ProviderHeaders } from "@earendil-works/pi-ai";
import { withFileLock } from "./storage/file-lock.ts";

const VAULT_PREFIX = "vault:";

async function resolveVaultValue(home: string, vaultName: string): Promise<string | undefined> {
	try {
		// Try file fallback first (0600) — used in tests with --insecure-file-key
		let key: string | undefined;
		try {
			key = (await readFile(join(home, "vault.key"), "utf8")).trim();
		} catch {
			// Fall back to keychain helper if file not present
			try {
				const { loadVaultKey } = await import("./secrets/keychain.ts");
				key = await loadVaultKey({ dfHome: home, allowFileKey: true });
			} catch { return undefined; }
		}
		if (!key) return undefined;
		let dataRepoPath: string;
		try {
			const raw = await readFile(join(home, "config.json"), "utf8");
			const cfg = JSON.parse(raw) as { dataRepo?: string };
			dataRepoPath = cfg.dataRepo && typeof cfg.dataRepo === "string" ? cfg.dataRepo : join(home, "data-df");
		} catch {
			dataRepoPath = join(home, "data-df");
		}
		const { loadVault } = await import("./secrets/vault-store.ts");
		const vault = await loadVault(dataRepoPath, key);
		return vault.entries.find((e) => e.name === vaultName)?.value;
	} catch {
		return undefined;
	}
}

async function resolveSlotValue(home: string, raw: string): Promise<string> {
	if (!raw.startsWith(VAULT_PREFIX)) return raw;
	const vaultName = raw.slice(VAULT_PREFIX.length);
	if (!vaultName) return raw;
	const resolved = await resolveVaultValue(home, vaultName);
	if (resolved === undefined) throw new Error(`Vault secret not found: ${vaultName}`);
	return resolved;
}

const FILE_VERSION = 2;
const ACCOUNT_SEPARATOR = ":";

/**
 * An OAuth credential slot containing access token, refresh token, and expiration timestamp.
 * @property {"oauth"} type - Literal string identifying the credential type.
 * @property {string} access - Access token used for authentication.
 * @property {string} refresh - Refresh token used to obtain new access tokens.
 * @property {number} expires - Expiration timestamp (Unix epoch ms) of the access token.
 * @property {string} [accountId] - Optional account identifier associated with the token.
 */
export type OAuthCredentialSlot = { /** type - OAuth credential type */ type: "oauth"; /** access - Access token */ access: string; /** refresh - Refresh token */ refresh: string; /** expires - Expiration timestamp (ms) */ expires: number; /** accountId - Optional account identifier */ accountId?: string };

/**
 * A credential slot representing one of several credential types (oauth, api_key, header, cookie, other).
 * @property {"oauth"} type - OAuth credential type.
 * @property {string} access - Access token (oauth only).
 * @property {string} refresh - Refresh token (oauth only).
 * @property {number} expires - Expiration timestamp (oauth only).
 * @property {string} [accountId] - Optional account identifier (oauth only).
 * @property {"api_key"} type - API key credential type.
 * @property {string} value - API key value (api_key, header, cookie, other).
 * @property {"header"} type - Header credential type.
 * @property {"cookie"} type - Cookie credential type.
 * @property {"other"} type - Other credential type.
 */
export type CredentialSlot =
	| OAuthCredentialSlot
	| {
		/** type - API key credential type */
		type: "api_key";
		/** value - API key string */
		value: string;
	}
	| {
		/** type - Header credential type */
		type: "header";
		/** value - Header string */
		value: string;
	}
	| {
		/** type - Cookie credential type */
		type: "cookie";
		/** value - Cookie string */
		value: string;
	}
	| {
		/** type - Other credential type */
		type: "other";
		/** value - Arbitrary credential string */
		value: string;
	};

/** The set of slot types that can be written (excludes oauth which is managed separately). */
export type WritableSlotType = Exclude<CredentialSlot["type"], "oauth">;

/**
 * A record of account information including provider, label, metadata, and credential slots.
 * @property {string} id - Unique identifier for the account (provider:label).
 * @property {string} provider - Name of the credential provider.
 * @property {string} label - Human‑readable label for the account.
 * @property {Record<string,string>} [metadata] - Optional key‑value metadata attached to the account.
 * @property {Record<string, CredentialSlot>} slots - Mapping of slot names to credential slots.
 */
export interface AccountRecord {
	id: string;
	provider: string;
	label: string;
	metadata?: Record<string, string>;
	slots: Record<string, CredentialSlot>;
}

interface CredentialFile {
	version: typeof FILE_VERSION;
	accounts: Record<string, AccountRecord>;
}

/**
 * A summary of an account containing its key fields and slot metadata.
 * @property {string} id - Unique identifier (provider:label).
 * @property {string} provider - Provider name.
 * @property {string} label - Account label.
 * @property {Record<string,string>} [metadata] - Optional metadata.
 * @property {Array<{name:string; type:CredentialSlot["type"]}>} slots - List of slot names and their types.
 */
export interface AccountSummary {
	id: string;
	provider: string;
	label: string;
	metadata?: Record<string, string>;
	slots: Array<{
		/** name - Slot name */
		name: string;
		/** type - Slot type */
		type: CredentialSlot["type"];
	}>;
}

/** Function type for fallback credential lookup when primary storage has no credentials. */
export type CredentialFallback = (provider: string, label: string) => Promise<Credential | undefined>;

function throwIfAborted(options?: AuthOperationOptions): void {
	options?.signal?.throwIfAborted();
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

/** Check if a value is a valid credential slot with required fields based on its type. */
export function isSlot(value: unknown): value is CredentialSlot {
	if (!value || typeof value !== "object") return false;
	const slot = value as Record<string, unknown>;
	if (slot.type === "oauth") return isNonEmptyString(slot.access) && isNonEmptyString(slot.refresh) && typeof slot.expires === "number" &&
		(slot.accountId === undefined || isNonEmptyString(slot.accountId));
	return (slot.type === "api_key" || slot.type === "header" || slot.type === "cookie" || slot.type === "other") && isNonEmptyString(slot.value);
}

/** Check if a value is a valid record object (string keys and string values) or undefined. */
export function isMetadata(value: unknown): value is Record<string, string> | undefined {
	return value === undefined || (typeof value === "object" && value !== null && Object.values(value).every((entry) => typeof entry === "string"));
}

/** Validate that a value is a valid account record matching the given id. */
export function isAccount(value: unknown, id: string): value is AccountRecord {
	if (!value || typeof value !== "object") return false;
	const account = value as Record<string, unknown>;
	return account.id === id && isNonEmptyString(account.provider) && isNonEmptyString(account.label) &&
		isMetadata(account.metadata) && typeof account.slots === "object" && account.slots !== null &&
		Object.entries(account.slots).every(([name, slot]) => isNonEmptyString(name) && isSlot(slot));
}

/** Validate and construct an AccountRecord, throwing errors for invalid inputs.
	 @param value The value to validate
	 @param expectedId Optional expected account id to validate against
	 @returns A validated AccountRecord
	 @throws Error if the value is invalid
*/
export function validateAccountRecord(value: unknown, expectedId?: string): AccountRecord {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Account record must be an object");
	const record = value as Record<string, unknown>;
	const id = expectedId ?? (typeof record.id === "string" ? record.id : undefined);
	if (!id) throw new Error("Account record missing id");
	const parsed = parseAccountId(id);
	if (!parsed) throw new Error(`Invalid account id: ${id}`);
	const provider = typeof record.provider === "string" && record.provider ? record.provider : parsed.provider;
	if (provider !== parsed.provider) {
		throw new Error(`Account record provider (${provider}) does not match target provider (${parsed.provider})`);
	}
	if (!expectedId && typeof record.label === "string" && record.label && record.label !== parsed.label) {
		throw new Error(`Account record label (${record.label}) does not match id (${id})`);
	}
	if (!isMetadata(record.metadata)) throw new Error("Account metadata must be string key-value pairs");
	if (!record.slots || typeof record.slots !== "object" || Array.isArray(record.slots) || Object.keys(record.slots).length === 0) {
		throw new Error("Account record must contain at least one valid credential slot");
	}
	for (const [name, slot] of Object.entries(record.slots)) {
		if (!isNonEmptyString(name) || !isSlot(slot)) throw new Error(`Invalid credential slot: ${name}`);
	}
	return {
		id,
		provider: parsed.provider,
		label: parsed.label,
		...(record.metadata ? { metadata: record.metadata as Record<string, string> } : {}),
		slots: record.slots as Record<string, CredentialSlot>,
	};
}

function parseFile(value: unknown): CredentialFile {
	if (!value || typeof value !== "object") throw new Error("Invalid credentials file");
	const file = value as { version?: unknown; accounts?: unknown };
	if (file.version !== FILE_VERSION || !file.accounts || typeof file.accounts !== "object") throw new Error("Invalid credentials file");
	for (const [id, account] of Object.entries(file.accounts)) {
		if (!isAccount(account, id)) throw new Error("Invalid account entry");
	}
	return { version: FILE_VERSION, accounts: file.accounts as Record<string, AccountRecord> };
}

/** Generate a unique account id from provider and label. */
export function accountId(provider: string, label: string): string {
	if (!isNonEmptyString(provider) || !isNonEmptyString(label) || provider.includes(ACCOUNT_SEPARATOR) || label.includes(ACCOUNT_SEPARATOR)) {
		throw new Error("Provider and account label must be non-empty and cannot contain ':'");
	}
	return `${provider}${ACCOUNT_SEPARATOR}${label}`;
}

/**
 * Parse an account id into its provider and label components.
 * @param id - The account id string to parse.
 * @returns An object with `provider` and `label` properties, or `undefined` if the id is invalid.
 * @property {string} provider - Provider component extracted from the id.
 * @property {string} label - Label component extracted from the id.
 */
export function parseAccountId(id: string): {
	/** Provider component extracted from the id. */
	provider: string;
	/** Label component extracted from the id. */
	label: string;
} | undefined {
	const index = id.indexOf(ACCOUNT_SEPARATOR);
	if (index <= 0 || index === id.length - 1 || id.indexOf(ACCOUNT_SEPARATOR, index + 1) !== -1) return undefined;
	return { provider: id.slice(0, index), label: id.slice(index + 1) };
}

/** Get the default path for the df home directory from environment or user home. */
export function defaultDfHome(): string {
	return process.env.DF_HOME || join(homedir(), ".df");
}

function primarySlot(account: AccountRecord, type: CredentialSlot["type"]): [string, CredentialSlot] | undefined {
	return Object.entries(account.slots).find(([, slot]) => slot.type === type) as [string, CredentialSlot] | undefined;
}

function toPiCredential(account: AccountRecord): Credential | undefined {
	const oauth = primarySlot(account, "oauth");
	if (oauth?.[1].type === "oauth") return {
		type: "oauth", access: oauth[1].access, refresh: oauth[1].refresh, expires: oauth[1].expires,
		...(oauth[1].accountId ? { accountId: oauth[1].accountId } : {}),
	};
	const apiKey = primarySlot(account, "api_key");
	if (apiKey?.[1].type === "api_key") return { type: "api_key", key: apiKey[1].value };
	return undefined;
}

async function resolveAccountVaultSlots(home: string, account: AccountRecord): Promise<AccountRecord> {
	let changed = false;
	const resolved: AccountRecord = { ...account, slots: { ...account.slots } };
	for (const [name, slot] of Object.entries(resolved.slots)) {
		if (slot.type !== "oauth" && typeof (slot as { value?: string }).value === "string" && (slot as { value: string }).value.startsWith(VAULT_PREFIX)) {
			const raw = (slot as { value: string }).value;
			const vaultName = raw.slice(VAULT_PREFIX.length);
			const resolvedValue = await resolveVaultValue(home, vaultName);
			if (resolvedValue === undefined) throw new Error(`Vault secret not found: ${vaultName}`);
			(resolved.slots[name] as { type: string; value: string }).value = resolvedValue;
			changed = true;
		}
	}
	return changed ? resolved : account;
}

/** Atomic, in-process serialized account store. Secret values are never formatted into errors or logs. */
export class FileCredentialStore {
	/** Path to the credentials.json file. */
	readonly path: string;
	/** Path to the lock file used for synchronization. */
	readonly lockPath: string;
	/** Home directory path. */
	readonly home: string;

	/**
	 * Create a new FileCredentialStore.
	 * @param home Home directory path; defaults to defaultDfHome()
	 * @param fallback Optional fallback function for loading credentials
	 * @param onAccountChanged Optional callback invoked when account is modified
	 */
	constructor(
		home = defaultDfHome(),
		private readonly fallback?: CredentialFallback,
		private readonly onAccountChanged?: (provider: string, label: string) => Promise<void>,
	) {
		this.home = home;
		this.path = join(home, "credentials.json");
		this.lockPath = `${this.path}.lock`;
	}

	/** Load the credentials file from disk. */
	private async load(): Promise<CredentialFile> {
		try {
			const parsed = parseFile(JSON.parse(await readFile(this.path, "utf8")) as unknown);
			const migratedIds: string[] = [];
			for (const account of Object.values(parsed.accounts)) {
				if (account.metadata?.ownership === "borrowed") {
					account.metadata.ownership = "df-owned";
					if (account.metadata.importer && !account.metadata.importedFrom) {
						account.metadata.importedFrom = account.metadata.importer;
					}
					migratedIds.push(account.id);
				}
			}
			if (migratedIds.length > 0) {
				console.error(`Notice: migrated borrowed accounts to df-owned in ${this.path}: ${migratedIds.join(", ")}`);
				await this.save(parsed);
			}
			return parsed;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: FILE_VERSION, accounts: {} };
			if (error instanceof SyntaxError) throw new Error("Invalid credentials file JSON");
			throw error;
		}
	}

	/** Save the credentials file to disk. */
	private async save(file: CredentialFile, options?: AuthOperationOptions): Promise<void> {
		throwIfAborted(options);
		await mkdir(dirname(this.path), { recursive: true });
		const temporary = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp`;
		try {
			await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
			throwIfAborted(options);
			await replaceFile(temporary, this.path);
			await chmod(this.path, 0o600).catch(() => undefined);
		} catch (error) {
			await Bun.file(temporary).delete().catch(() => undefined);
			throw error;
		}
	}

	/**
	 * Read a single account record.
	 * @param id The account id to read
	 * @param options Optional operation options
	 * @returns The account record or undefined if not found
	 */
	async readAccount(id: string, options?: AuthOperationOptions): Promise<AccountRecord | undefined> {
		throwIfAborted(options);
		const account = (await this.load()).accounts[id];
		return account ? clone(account) : undefined;
	}

	/**
	 * Modify an account record atomically.
	 * @param id The account id to modify
	 * @param fn Function to compute the next account value
	 * @param options Optional operation options
	 * @returns The new account record or the previous value if fn returned undefined
	 */
	async modifyAccount(
		id: string,
		fn: (current: AccountRecord | undefined) => Promise<AccountRecord | undefined>,
		options?: AuthOperationOptions,
	): Promise<AccountRecord | undefined> {
		return withFileLock(this.lockPath, async () => {
			throwIfAborted(options);
			const file = await this.load();
			const current = file.accounts[id] ? clone(file.accounts[id]) : undefined;
			const next = await fn(current);
			throwIfAborted(options);
			if (next !== undefined) {
				if (!isAccount(next, id)) throw new Error("Invalid account value");
				file.accounts[id] = clone(next);
				await this.save(file, options);
				await this.onAccountChanged?.(next.provider, next.label);
			}
			return clone(next ?? current);
		});
	}

	/**
	 * Set a credential slot for an account.
	 * @param id The account id
	 * @param slotName The name of the slot to set
	 * @param slot The credential slot value
	 * @returns The updated account record
	 */
	async setSlot(id: string, slotName: string, slot: CredentialSlot): Promise<AccountRecord> {
		if (!isNonEmptyString(slotName) || !isSlot(slot)) throw new Error("Invalid credential slot");
		const parsed = parseAccountId(id);
		if (!parsed) throw new Error("Invalid account id");
		const account = await this.modifyAccount(id, async (current) => ({
			id,
			provider: current?.provider ?? parsed.provider,
			label: current?.label ?? parsed.label,
			...(current?.metadata ? { metadata: current.metadata } : {}),
			slots: { ...(current?.slots ?? {}), [slotName]: clone(slot) },
		}));
		if (!account) throw new Error("Account slot was not written");
		return account;
	}

	/**
	 * Delete an account record.
	 * @param id The account id to delete
	 * @param options Optional operation options
	 * @returns True if the account was deleted
	 */
	async deleteAccount(id: string, options?: AuthOperationOptions): Promise<boolean> {
		let deleted = false;
		await withFileLock(this.lockPath, async () => {
			throwIfAborted(options);
			const file = await this.load();
			const current = file.accounts[id];
			if (!current) return;
			delete file.accounts[id];
			await this.save(file, options);
			await this.onAccountChanged?.(current.provider, current.label);
			deleted = true;
		});
		return deleted;
	}

	/** Get an AccountCredentialStore for a specific account. */
	forAccount(provider: string, label: string): AccountCredentialStore {
		return new AccountCredentialStore(this, accountId(provider, label));
	}

	/**
	 * List all accounts.
	 * @param options Optional operation options
	 * @returns Sorted list of account summaries
	 */
	async listAccounts(options?: AuthOperationOptions): Promise<AccountSummary[]> {
		throwIfAborted(options);
		return Object.values((await this.load()).accounts).map((account) => ({
			id: account.id,
			provider: account.provider,
			label: account.label,
			...(account.metadata ? { metadata: clone(account.metadata) } : {}),
			slots: Object.entries(account.slots).map(([name, slot]) => ({ name, type: slot.type })).sort((a, b) => a.name.localeCompare(b.name)),
		})).sort((a, b) => a.id.localeCompare(b.id));
	}

	/** Extra request material pi's two credential shapes cannot represent. */
	async requestHeaders(provider: string, label: string, slotHeaders: Readonly<Record<string, string>> = {}): Promise<ProviderHeaders> {
		let account = await this.readAccount(accountId(provider, label));
		if (!account) return {};
		account = await resolveAccountVaultSlots(this.home, account);
		const headers: ProviderHeaders = {};
		const cookies: string[] = [];
		for (const [name, slot] of Object.entries(account.slots)) {
			if (slot.type === "header") headers[name] = await resolveSlotValue(this.home, slot.value);
			if (slot.type === "cookie") cookies.push(await resolveSlotValue(this.home, slot.value));
		}
		for (const [headerName, slotName] of Object.entries(slotHeaders)) {
			const slot = account.slots[slotName];
			if (slot?.type !== "oauth" && slot?.value) headers[headerName] = await resolveSlotValue(this.home, slot.value);
		}
		if (cookies.length > 0) headers.Cookie = cookies.join("; ");
		return headers;
	}

	/**
	 * Get the credential slot value for an account, resolving vault secrets.
	 * @param provider The provider name
	 * @param label The account label
	 * @param slotName The slot name
	 * @returns The credential slot value or undefined if not found
	 */
	async getSlot(provider: string, label: string, slotName: string): Promise<CredentialSlot | undefined> {
		const slot = (await this.readAccount(accountId(provider, label)))?.slots[slotName];
		if (!slot || slot.type === "oauth") return slot;
		const resolved = await resolveSlotValue(this.home, slot.value);
		return resolved === slot.value ? slot : { ...slot, value: resolved } as CredentialSlot;
	}

	/**
	 * Read a credential for an account, resolving vault secrets and using fallback if needed.
	 * @param provider The provider name
	 * @param label The account label
	 * @param options Optional operation options
	 * @returns The credential or undefined if not found
	 */
	async readCredential(provider: string, label: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
		throwIfAborted(options);
		let account = await this.readAccount(accountId(provider, label), options);
		if (account) account = await resolveAccountVaultSlots(this.home, account);
		const stored = account ? toPiCredential(account) : undefined;
		if (stored) return stored;
		if (!this.fallback) return undefined;
		const fallback = await this.fallback(provider, label);
		throwIfAborted(options);
		return fallback;
	}
}

/** pi's one-provider CredentialStore view of exactly one df account. */
export class AccountCredentialStore implements CredentialStore {
	/** The account id (provider:label). */
	constructor(
		private readonly store: FileCredentialStore,
		/** The account id (provider:label). */
		readonly id: string
	) {}

	/** Get the provider name from the account id. */
	private provider(): string {
		const parsed = parseAccountId(this.id);
		if (!parsed) throw new Error("Invalid account id");
		return parsed.provider;
	}

	/** Assert that the given provider matches the account's provider. */
	private assertProvider(providerId: string): void {
		if (providerId !== this.provider()) throw new Error(`Account store is bound to provider ${this.provider()}`);
	}

	/**
	 * Read a credential.
	 * @param providerId Provider id to read (must match account's provider)
	 * @param options Optional operation options
	 * @returns The credential or undefined if not found
	 */
	async read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
		this.assertProvider(providerId);
		throwIfAborted(options);
		const parsed = parseAccountId(this.id)!;
		return this.store.readCredential(parsed.provider, parsed.label, options);
	}

	/**
	 * List credentials for this account.
	 * @param options Optional operation options
	 * @returns List of credential info (may be empty if no credentials)
	 */
	async list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]> {
		const credential = await this.read(this.provider(), options);
		return credential ? [{ providerId: this.provider(), type: credential.type }] : [];
	}

	/**
	 * Modify a credential atomically.
	 * @param providerId Provider id to modify (must match account's provider)
	 * @param fn Function to compute the next credential value
	 * @param options Optional operation options
	 * @returns The new credential or undefined if fn returned undefined
	 */
	modify(
		providerId: string,
		fn: (current: Credential | undefined) => Promise<Credential | undefined>,
		options?: AuthOperationOptions,
	): Promise<Credential | undefined> {
		this.assertProvider(providerId);
		return this.store.modifyAccount(this.id, async (current) => {
			const input = current ? toPiCredential(current) : undefined;
			const next = await fn(input);
			if (next === undefined) return undefined;
			const parsed = parseAccountId(this.id)!;
			const account: AccountRecord = current ?? { id: this.id, provider: parsed.provider, label: parsed.label, slots: {} };
			const slotName = next.type === "oauth" ? primarySlot(account, "oauth")?.[0] ?? "oauth" : primarySlot(account, "api_key")?.[0] ?? "api_key";
			account.slots[slotName] = next.type === "oauth"
				? { type: "oauth", access: next.access, refresh: next.refresh, expires: next.expires, ...(typeof next.accountId === "string" ? { accountId: next.accountId } : {}) }
				: { type: "api_key", value: next.key ?? "" };
			return account;
		}, options).then((account) => account ? toPiCredential(account) : undefined);
	}

	/**
	 * Delete a credential for this account.
	 * @param providerId Provider id to delete (must match account's provider)
	 * @param options Optional operation options
	 */
	delete(providerId: string, options?: AuthOperationOptions): Promise<void> {
		this.assertProvider(providerId);
		return this.store.modifyAccount(this.id, async (current) => {
			if (!current) return undefined;
			const oauth = primarySlot(current, "oauth")?.[0];
			const apiKey = primarySlot(current, "api_key")?.[0];
			if (oauth) delete current.slots[oauth];
			else if (apiKey) delete current.slots[apiKey];
			return current;
		}, options).then(() => undefined);
	}
}
