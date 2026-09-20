/**
 * Antigravity CLI and Google Cloud companion companion credential importers.
 * @packageDocumentation
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { accountId, type FileCredentialStore } from "../credentials.ts";

const execFileAsync = promisify(execFile);

/** Generic keyring lookup interface. */
export interface KeyringAdapter {
	/** Read password value for given service and optional account. */
	read(service: string, account?: string): Promise<string | undefined>;
}

/** Fetch-compatible transport used by Antigravity project discovery. */
export type ImportFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** OS-native keyring adapter fallback. */
export class OsKeyringAdapter implements KeyringAdapter {
	async read(service: string, account?: string): Promise<string | undefined> {
		try {
			if (process.platform === "darwin") {
				return (await execFileAsync("security", ["find-generic-password", "-s", service, ...(account ? ["-a", account] : []), "-w"], { encoding: "utf8" })).stdout.trim() || undefined;
			}
			if (process.platform === "linux") {
				return (await execFileAsync("secret-tool", ["lookup", "service", service, "account", account ?? ""], { encoding: "utf8" })).stdout.trim() || undefined;
			}
			if (process.platform === "win32") {
				const script = "Import-Module CredentialManager -ErrorAction Stop; $c=Get-StoredCredential -Target $args[0]; if ($null -ne $c) { [Console]::Out.Write($c.Password) }";
				return (await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script, `${service}:${account}`], { encoding: "utf8" })).stdout || undefined;
			}
			return undefined;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			throw new Error("Unable to read the configured CLI credential from the OS keyring");
		}
	}
}

/** Parses and decodes raw Antigravity CLI credentials. */
export function parseAntigravityKeyring(raw: string): { access: string; refresh: string; expires: number; email?: string } {
	const prefix = "go-keyring-base64:";
	const clean = raw.trim();
	const decoded = clean.startsWith(prefix) ? Buffer.from(clean.slice(prefix.length), "base64").toString("utf8") : clean;
	let value: unknown;
	try {
		value = JSON.parse(decoded);
	} catch {
		throw new Error("Imported keyring entry is not valid JSON");
	}
	if (!value || typeof value !== "object") throw new Error("Imported keyring entry has an invalid shape");
	const root = value as Record<string, unknown>;
	const token = root.token;
	if (!token || typeof token !== "object") throw new Error("Imported keyring entry has no token bundle");
	const fields = token as Record<string, unknown>;
	if (typeof fields.access_token !== "string" || !fields.access_token || typeof fields.refresh_token !== "string" || !fields.refresh_token) {
		throw new Error("Imported keyring token bundle is incomplete");
	}
	const expires = typeof fields.expiry === "string" ? Date.parse(fields.expiry) : NaN;
	if (!Number.isFinite(expires)) throw new Error("Imported keyring token expiry is invalid");
	return { access: fields.access_token, refresh: fields.refresh_token, expires };
}

/** Imports Antigravity CLI account and hydrates companion project slot. */
export async function importAntigravityAccount(
	store: FileCredentialStore,
	label: string,
	keyring: KeyringAdapter,
	provider: string,
	service = "antigravity",
	account = "default",
	fetcher: ImportFetch = globalThis.fetch,
): Promise<void> {
	const raw = await keyring.read(service, account);
	if (!raw) throw new Error("No configured CLI login was found in the OS keyring");
	const imported = parseAntigravityKeyring(raw);
	const id = accountId(provider, label);
	const response = await fetcher("https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", {
		method: "POST",
		headers: {
			authorization: `Bearer ${imported.access}`,
			"content-type": "application/json",
			"x-goog-api-client": "gl-node",
		},
		body: JSON.stringify({
			metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "PLUGIN_JETSKI" },
		}),
		redirect: "error",
	});
	if (!response.ok) throw new Error(`Antigravity project discovery failed (HTTP ${response.status})`);
	const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
	const project =
		typeof body?.cloudaicompanionProject === "string"
			? body.cloudaicompanionProject.replace(/^projects\//u, "")
			: "";
	if (!project) throw new Error("Antigravity project discovery returned no cloudaicompanionProject");
	await store.modifyAccount(id, async (current) => ({
		id,
		provider,
		label,
		metadata: {
			...(current?.metadata ?? {}),
			ownership: "df-owned",
			sync: "machine-only",
			importedFrom: "antigravity",
			source: "os-keyring",
		},
		slots: {
			...(current?.slots ?? {}),
			oauth: { type: "oauth", ...imported },
			"x-antigravity-project": { type: "header", value: project },
		},
	}));
}
