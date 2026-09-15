import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { accountId, type FileCredentialStore } from "../credentials.ts";
/**
 * Interface for reading credentials from a secure storage.
 *
 * Implementations provide a {@code read} method that returns the stored secret
 * for the given {@code service} and optional {@code account}.
 */
export interface KeyringAdapter {
	/**
	 * Reads a credential from the store.
	 *
	 * @param service - The service name.
	 * @param account - Optional account name.
	 * @returns The stored secret or undefined if not found.
	 */
	read(service: string, account?: string): Promise<string | undefined>;
}
/**
 * Type alias for a fetch‑like function used to make HTTP requests.
 * Allows callers to inject a custom fetch implementation for testing or
 * alternative environments.
 */
export type ImportFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const execFileAsync = promisify(execFile);
/**
 * {@link KeyringAdapter} implementation that reads credentials from the
 * operating‑system keyring. Supports macOS (`security`), Linux (`secret-tool`)
 * and Windows PowerShell CredentialManager.
 */
export class OsKeyringAdapter implements KeyringAdapter {
	/**
 * Reads a credential from the OS keyring.
 *
 * @param service - The keyring service name.
 * @param account - Optional account identifier.
 * @returns The stored secret, or undefined if not found.
 */
	async read(service: string, account?: string): Promise<string | undefined> {
		try {
			if (process.platform === "darwin") return (await execFileAsync("security", ["find-generic-password", "-s", service, ...(account ? ["-a", account] : []), "-w"], { encoding: "utf8" })).stdout.trim() || undefined;
			if (process.platform === "linux") return (await execFileAsync("secret-tool", ["lookup", "service", service, "account", account ?? ""], { encoding: "utf8" })).stdout.trim() || undefined;
			if (process.platform === "win32") {
				const script = "Import-Module CredentialManager -ErrorAction Stop; $c=Get-StoredCredential -Target $args[0]; if ($null -ne $c) { [Console]::Out.Write($c.Password) }";
				return (await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script, `${service}:${account}`], { encoding: "utf8" })).stdout || undefined;
			}
			return undefined;
		} catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw new Error("Unable to read the configured CLI credential from the OS keyring"); }
	}
}

/**
 * The shape of a parsed Antigravity keyring entry.
 *
 * @param access - The access token.
 * @param refresh - The refresh token.
 * @param expires - Token expiry epoch in milliseconds.
 * @param email - Optional email address.
 */
export interface AntigravityKeyringEntry {
	/** The access token. */
	access: string;
	/** The refresh token. */
	refresh: string;
	/** Token expiry epoch in milliseconds. */
	expires: number;
	/** Optional email address. */
	email?: string;
}

/**
 * Parse a raw keyring entry exported from Antigravity.
 *
 * The entry is expected to be a base64‑encoded JSON string prefixed with
 * {@code "go-keyring-base64:"}. The function extracts the access and refresh
 * tokens as well as the token expiry time.
 *
 * @param raw - The raw string read from the OS keyring.
 * @returns An object containing the access token, refresh token, expiry epoch
 *          (in milliseconds) and optional email.
 * @throws When the entry cannot be decoded, is not valid JSON, or lacks the
 *         required token fields.
 */
export function parseAntigravityKeyring(raw: string): AntigravityKeyringEntry {
	const prefix = "go-keyring-base64:";
	const clean = raw.trim();
	const decoded = clean.startsWith(prefix) ? Buffer.from(clean.slice(prefix.length), "base64").toString("utf8") : clean;
	let value: unknown; try { value = JSON.parse(decoded); } catch { throw new Error("Imported keyring entry is not valid JSON"); }
	if (!value || typeof value !== "object") throw new Error("Imported keyring entry has an invalid shape");
	const root = value as Record<string, unknown>; const token = root.token;
	if (!token || typeof token !== "object") throw new Error("Imported keyring entry has no token bundle");
	const fields = token as Record<string, unknown>;
	if (typeof fields.access_token !== "string" || !fields.access_token || typeof fields.refresh_token !== "string" || !fields.refresh_token) throw new Error("Imported keyring token bundle is incomplete");
	const expires = typeof fields.expiry === "string" ? Date.parse(fields.expiry) : NaN;
	if (!Number.isFinite(expires)) throw new Error("Imported keyring token expiry is invalid");
	return { access: fields.access_token, refresh: fields.refresh_token, expires };
}

/**
 * Import an Antigravity account configuration from the OS keyring into the
 * DF credential store.
 *
 * @param store - The {@link FileCredentialStore} to modify.
 * @param label - Human readable label for the imported account.
 * @param keyring - {@link KeyringAdapter} used to retrieve the stored token.
 * @param provider - Identifier of the provider (e.g. {@code "antigravity"}).
 * @param service - OS keyring service name, defaults to {@code "antigravity"}.
 * @param account - Account identifier within the service, defaults to
 *                  {@code "default"}.
 * @param fetcher - Optional fetch implementation for making the HTTP request.
 * @throws When the keyring entry cannot be read or the remote project
 *         discovery request fails.
 */
export async function importAntigravityAccount(store: FileCredentialStore, label: string, keyring: KeyringAdapter, provider: string, service = "antigravity", account = "default", fetcher: ImportFetch = globalThis.fetch): Promise<void> {
	const raw = await keyring.read(service, account);
	if (!raw) throw new Error("No configured CLI login was found in the OS keyring");
	const imported = parseAntigravityKeyring(raw); const id = accountId(provider, label);
	const response = await fetcher("https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", {
		method: "POST", headers: { authorization: `Bearer ${imported.access}`, "content-type": "application/json", "x-goog-api-client": "gl-node" },
		body: JSON.stringify({ metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "PLUGIN_JETSKI" } }), redirect: "error",
	});
	if (!response.ok) throw new Error(`Antigravity project discovery failed (HTTP ${response.status})`);
	const body = await response.json().catch(() => null) as Record<string, unknown> | null;
	const project = typeof body?.cloudaicompanionProject === "string" ? body.cloudaicompanionProject.replace(/^projects\//u, "") : "";
	if (!project) throw new Error("Antigravity project discovery returned no cloudaicompanionProject");
	await store.modifyAccount(id, async (current) => ({ id, provider, label, metadata: { ...(current?.metadata ?? {}), ownership: "df-owned", sync: "machine-only", importedFrom: "antigravity", source: "os-keyring" }, slots: { ...(current?.slots ?? {}), oauth: { type: "oauth", ...imported }, "x-antigravity-project": { type: "header", value: project } } }));
}
