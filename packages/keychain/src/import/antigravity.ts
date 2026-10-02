import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { accountId, type FileCredentialStore } from "../credentials.ts";

interface KeyringAdapter {
	read(service: string, account?: string): Promise<string | undefined>;
}
type ImportFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const execFileAsync = promisify(execFile);
export class OsKeyringAdapter implements KeyringAdapter {
	async read(service: string, account?: string): Promise<string | undefined> {
		try {
			if (process.platform === "darwin")
				return (
					(
						await execFileAsync(
							"security",
							["find-generic-password", "-s", service, ...(account ? ["-a", account] : []), "-w"],
							{ encoding: "utf8" },
						)
					).stdout.trim() || undefined
				);
			if (process.platform === "linux")
				return (
					(
						await execFileAsync("secret-tool", ["lookup", "service", service, "account", account ?? ""], {
							encoding: "utf8",
						})
					).stdout.trim() || undefined
				);
			if (process.platform === "win32") {
				const script =
					"Import-Module CredentialManager -ErrorAction Stop; $c=Get-StoredCredential -Target $args[0]; if ($null -ne $c) { [Console]::Out.Write($c.Password) }";
				return (
					(
						await execFileAsync(
							"powershell.exe",
							["-NoProfile", "-NonInteractive", "-Command", script, `${service}:${account}`],
							{ encoding: "utf8" },
						)
					).stdout || undefined
				);
			}
			return undefined;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			throw new Error("Unable to read the configured CLI credential from the OS keyring");
		}
	}
}
function parseAntigravityKeyring(raw: string): {
	access: string;
	refresh: string;
	expires: number;
	email?: string;
} {
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
	if (
		typeof fields.access_token !== "string" ||
		!fields.access_token ||
		typeof fields.refresh_token !== "string" ||
		!fields.refresh_token
	)
		throw new Error("Imported keyring token bundle is incomplete");
	const expires = typeof fields.expiry === "string" ? Date.parse(fields.expiry) : NaN;
	if (!Number.isFinite(expires)) throw new Error("Imported keyring token expiry is invalid");
	return { access: fields.access_token, refresh: fields.refresh_token, expires };
}

/**
 * Imports an Antigravity (Gemini-via-Antigravity) login.
 *
 * Provider attribution is explicit, because the storage location is not. The Antigravity CLI keeps
 * its token in the OS keyring under the service name `gemini`, and that name is historical: it
 * identifies Antigravity, not Google AI Studio. Google AI Studio is the separate `google` provider
 * and authenticates with a `GEMINI_API_KEY` api_key slot — it has no keyring login and is never
 * discovered by this importer. A credential found here therefore always belongs to the
 * `provider` argument; it is never written to `google`.
 *
 * Absent, rejected and unrelated upstream failures stay distinguishable: a missing keyring entry
 * means the CLI is not logged in, a 401/403 means the stored token was rejected and the account
 * needs re-authenticating, and anything else is a discovery failure. Only a successful discovery
 * writes the account, so a rejected import never leaves a half-written record.
 *
 * @param store - Destination credential store.
 * @param label - Account label to write.
 * @param keyring - OS keyring reader for the Antigravity login.
 * @param provider - Target provider id the credential belongs to.
 * @param service - Keyring service holding the Antigravity login. Historically `gemini`.
 * @param account - Keyring account name. Historically `antigravity`.
 * @param fetcher - Injectable fetch, used to resolve the Antigravity project slot.
 * @throws Error when no login is present, the stored token is rejected, or discovery fails.
 */
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
	if (!raw)
		throw new Error(
			`No Antigravity login was found in the OS keyring (service ${service}, account ${account}); the ${provider} provider is absent, not rejected`,
		);
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
	if (!response.ok) {
		if (response.status === 401 || response.status === 403)
			throw new Error(
				`The ${provider} Antigravity credential was rejected (HTTP ${response.status}); it is present but needs re-authentication: run \`df login ${provider} --account ${label}\``,
			);
		throw new Error(`Antigravity project discovery failed (HTTP ${response.status})`);
	}
	const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
	const project =
		typeof body?.cloudaicompanionProject === "string" ? body.cloudaicompanionProject.replace(/^projects\//u, "") : "";
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
