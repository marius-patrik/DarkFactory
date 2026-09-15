import type { AuthEvent, AuthPrompt, OAuthCredential } from "@earendil-works/pi-ai";
import { accountId, type CredentialSlot, type FileCredentialStore } from "./credentials.ts";
import { createConfiguredOAuth } from "./providers/oauth.ts";
import type { LoginHydrationConfig, ProviderConfig } from "./providers/schema.ts";

/**
 * Options for configuring the login process.
 *
 * @property prompt - Function to prompt the user for authentication input.
 * @property notify - Callback invoked for authentication events.
 * @property signal - Optional AbortSignal to cancel the login.
 * @property fetch - Optional custom fetch implementation.
 * @property isHeadless - If true, runs in headless mode without UI prompts.
 * @property credential - Optional pre-obtained OAuth credential to use.
 */
export interface LoginOptions {
	prompt(prompt: AuthPrompt): Promise<string>;
	notify(event: AuthEvent): void;
	signal?: AbortSignal;
	fetch?: typeof globalThis.fetch;
	isHeadless?: boolean;
	credential?: OAuthCredential;
}

function pathValue(value: unknown, path: string): unknown {
	let current = value;
	for (const part of path.split(".")) current = current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined;
	return current;
}

function endpoint(baseUrl: string, path: string): string {
	return path.startsWith(":") ? `${baseUrl.replace(/\/$/u, "")}${path}` : new URL(path, `${baseUrl.replace(/\/$/u, "")}/`).toString();
}

async function hydrate(config: ProviderConfig, credential: OAuthCredential, fetcher: typeof globalThis.fetch, spec: LoginHydrationConfig, signal: AbortSignal): Promise<CredentialSlot> {
	const headers = new Headers(spec.headers);
	if (spec.authorization !== "none") headers.set("authorization", `Bearer ${credential.access}`);
	if (spec.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
	const response = await fetcher(endpoint(config.baseUrl, spec.path), { method: spec.method ?? "POST", headers, ...(spec.body === undefined ? {} : { body: JSON.stringify(spec.body) }), signal, redirect: "error" });
	if (!response.ok) throw new Error(`OAuth login hydration failed (HTTP ${response.status})`);
	const body = await response.json().catch(() => null) as unknown;
	const value = pathValue(body, spec.responsePath);
	if (typeof value !== "string" || !value) throw new Error(`OAuth login hydration returned no ${spec.responsePath}`);
	const normalized = spec.stripPrefix && value.startsWith(spec.stripPrefix) ? value.slice(spec.stripPrefix.length) : value;
	return { type: spec.slotType, value: normalized };
}

/**
 * Completes an OAuth login flow for a provider configuration and stores the resulting credentials.
 *
 * @param config - Provider configuration containing authentication details.
 * @param label - Human‑readable label identifying the account.
 * @param store - Credential store where the account information will be persisted.
 * @param options - Options controlling the login behaviour.
 * @throws When the provider does not support OAuth, the login fails, or the hydration process cannot retrieve required data.
 */
export async function loginProviderAccount(config: ProviderConfig, label: string, store: FileCredentialStore, options: LoginOptions): Promise<void> {
	const oauthConfig = config.auth.find((entry) => entry.kind === "oauth");
	if (!oauthConfig) throw new Error(`Provider ${config.id} does not support OAuth login`);
	const signal = options.signal ?? new AbortController().signal;
	const fetcher = options.fetch ?? globalThis.fetch;
	const credential = options.credential ?? await createConfiguredOAuth(oauthConfig, { fetch: fetcher, ...(options.isHeadless === undefined ? {} : { isHeadless: options.isHeadless }) }).login({ signal, prompt: options.prompt, notify: options.notify });
	const hydrated: Record<string, CredentialSlot> = {};
	for (const spec of config.login?.hydration ?? []) hydrated[spec.targetSlot] = await hydrate(config, credential, fetcher, spec, signal);
	const id = accountId(config.id, label);
	await store.modifyAccount(id, async (current) => ({
		id, provider: config.id, label,
		metadata: { ...(current?.metadata ?? {}), ownership: "df-owned", sync: "machine-only", login: "oauth" },
		slots: {
			...(current?.slots ?? {}),
			[oauthConfig.slot]: { type: "oauth", access: credential.access, refresh: credential.refresh, expires: credential.expires, ...(typeof credential.accountId === "string" ? { accountId: credential.accountId } : {}) },
			...hydrated,
		},
	}));
}
