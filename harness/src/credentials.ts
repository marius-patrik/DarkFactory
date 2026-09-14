import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { AuthOperationOptions, Credential, CredentialInfo, CredentialStore, ProviderHeaders } from "@earendil-works/pi-ai";
import { withFileLock } from "./storage/file-lock.ts";

const FILE_VERSION = 2;
const ACCOUNT_SEPARATOR = ":";

export type OAuthCredentialSlot = { type: "oauth"; access: string; refresh: string; expires: number; accountId?: string };

export type CredentialSlot =
	| OAuthCredentialSlot
	| { type: "api_key"; value: string }
	| { type: "header"; value: string }
	| { type: "cookie"; value: string }
	| { type: "other"; value: string };

export type WritableSlotType = Exclude<CredentialSlot["type"], "oauth">;

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

export interface AccountSummary {
	id: string;
	provider: string;
	label: string;
	metadata?: Record<string, string>;
	slots: Array<{ name: string; type: CredentialSlot["type"] }>;
}

export type CredentialFallback = (provider: string, label: string) => Promise<Credential | undefined>;
export interface BorrowedRefreshPlan { credential: OAuthCredentialSlot; refresh: boolean }
export interface BorrowedCredentialCoordinator { prepare(account: AccountRecord, options?: AuthOperationOptions): Promise<BorrowedRefreshPlan> }

function throwIfAborted(options?: AuthOperationOptions): void {
	options?.signal?.throwIfAborted();
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function isSlot(value: unknown): value is CredentialSlot {
	if (!value || typeof value !== "object") return false;
	const slot = value as Record<string, unknown>;
	if (slot.type === "oauth") return isNonEmptyString(slot.access) && isNonEmptyString(slot.refresh) && typeof slot.expires === "number" &&
		(slot.accountId === undefined || isNonEmptyString(slot.accountId));
	return (slot.type === "api_key" || slot.type === "header" || slot.type === "cookie" || slot.type === "other") && isNonEmptyString(slot.value);
}

function isMetadata(value: unknown): value is Record<string, string> | undefined {
	return value === undefined || (typeof value === "object" && value !== null && Object.values(value).every((entry) => typeof entry === "string"));
}

function isAccount(value: unknown, id: string): value is AccountRecord {
	if (!value || typeof value !== "object") return false;
	const account = value as Record<string, unknown>;
	return account.id === id && isNonEmptyString(account.provider) && isNonEmptyString(account.label) &&
		isMetadata(account.metadata) && typeof account.slots === "object" && account.slots !== null &&
		Object.entries(account.slots).every(([name, slot]) => isNonEmptyString(name) && isSlot(slot));
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

export function accountId(provider: string, label: string): string {
	if (!isNonEmptyString(provider) || !isNonEmptyString(label) || provider.includes(ACCOUNT_SEPARATOR) || label.includes(ACCOUNT_SEPARATOR)) {
		throw new Error("Provider and account label must be non-empty and cannot contain ':'");
	}
	return `${provider}${ACCOUNT_SEPARATOR}${label}`;
}

export function parseAccountId(id: string): { provider: string; label: string } | undefined {
	const index = id.indexOf(ACCOUNT_SEPARATOR);
	if (index <= 0 || index === id.length - 1 || id.indexOf(ACCOUNT_SEPARATOR, index + 1) !== -1) return undefined;
	return { provider: id.slice(0, index), label: id.slice(index + 1) };
}

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

/** Atomic, in-process serialized account store. Secret values are never formatted into errors or logs. */
export class FileCredentialStore {
	readonly path: string;
	readonly lockPath: string;

	constructor(
		home = defaultDfHome(),
		private readonly fallback?: CredentialFallback,
		readonly borrowed?: BorrowedCredentialCoordinator,
		private readonly onAccountChanged?: (provider: string, label: string) => Promise<void>,
	) {
		this.path = join(home, "credentials.json");
		this.lockPath = `${this.path}.lock`;
	}

	private async load(): Promise<CredentialFile> {
		try {
			return parseFile(JSON.parse(await readFile(this.path, "utf8")) as unknown);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: FILE_VERSION, accounts: {} };
			if (error instanceof SyntaxError) throw new Error("Invalid credentials file JSON");
			throw error;
		}
	}

	private async save(file: CredentialFile, options?: AuthOperationOptions): Promise<void> {
		throwIfAborted(options);
		await mkdir(dirname(this.path), { recursive: true });
		const temporary = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp`;
		try {
			await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
			throwIfAborted(options);
			await rename(temporary, this.path);
		} catch (error) {
			await Bun.file(temporary).delete().catch(() => undefined);
			throw error;
		}
	}

	async readAccount(id: string, options?: AuthOperationOptions): Promise<AccountRecord | undefined> {
		throwIfAborted(options);
		const account = (await this.load()).accounts[id];
		return account ? clone(account) : undefined;
	}

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

	forAccount(provider: string, label: string): AccountCredentialStore {
		return new AccountCredentialStore(this, accountId(provider, label));
	}

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
		const account = await this.readAccount(accountId(provider, label));
		if (!account) return {};
		const headers: ProviderHeaders = {};
		const cookies: string[] = [];
		for (const [name, slot] of Object.entries(account.slots)) {
			if (slot.type === "header") headers[name] = slot.value;
			if (slot.type === "cookie") cookies.push(slot.value);
		}
		for (const [headerName, slotName] of Object.entries(slotHeaders)) {
			const slot = account.slots[slotName];
			if (slot?.type !== "oauth" && slot?.value) headers[headerName] = slot.value;
		}
		if (cookies.length > 0) headers.Cookie = cookies.join("; ");
		return headers;
	}

	async getSlot(provider: string, label: string, slotName: string): Promise<CredentialSlot | undefined> {
		return (await this.readAccount(accountId(provider, label)))?.slots[slotName];
	}

	async readCredential(provider: string, label: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
		throwIfAborted(options);
		const account = await this.readAccount(accountId(provider, label), options);
		const stored = account ? toPiCredential(account) : undefined;
		if (stored || !this.fallback) return stored;
		const fallback = await this.fallback(provider, label);
		throwIfAborted(options);
		return fallback;
	}
}

/** pi's one-provider CredentialStore view of exactly one df account. */
export class AccountCredentialStore implements CredentialStore {
	constructor(private readonly store: FileCredentialStore, readonly id: string) {}

	private provider(): string {
		const parsed = parseAccountId(this.id);
		if (!parsed) throw new Error("Invalid account id");
		return parsed.provider;
	}

	private assertProvider(providerId: string): void {
		if (providerId !== this.provider()) throw new Error(`Account store is bound to provider ${this.provider()}`);
	}

	async read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
		this.assertProvider(providerId);
		throwIfAborted(options);
		const parsed = parseAccountId(this.id)!;
		return this.store.readCredential(parsed.provider, parsed.label, options);
	}

	async list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]> {
		const credential = await this.read(this.provider(), options);
		return credential ? [{ providerId: this.provider(), type: credential.type }] : [];
	}

	modify(
		providerId: string,
		fn: (current: Credential | undefined) => Promise<Credential | undefined>,
		options?: AuthOperationOptions,
	): Promise<Credential | undefined> {
		this.assertProvider(providerId);
		return this.store.modifyAccount(this.id, async (current) => {
			let input = current ? toPiCredential(current) : undefined;
			if (current?.metadata?.importer && input?.type === "oauth" && this.store.borrowed) {
				const plan = await this.store.borrowed.prepare(current, options);
				input = plan.credential;
				if (!plan.refresh) {
					const slotName = primarySlot(current, "oauth")?.[0] ?? "oauth";
					current.slots[slotName] = clone(plan.credential);
					return current;
				}
			}
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
