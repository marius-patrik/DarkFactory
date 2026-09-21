import type { AuthEvent, AuthPrompt, OAuthCredential } from "@earendil-works/pi-ai";
import { accountId, type CredentialSlot, type FileCredentialStore } from "./credentials.ts";
import { createConfiguredOAuth, type OAuthAuthConfig } from "./oauth.ts";

/** Optional post-login request that hydrates an additional credential slot. */
export interface LoginHydrationConfig {
	path: string;
	method?: "GET" | "POST";
	headers?: Record<string, string>;
	body?: Record<string, unknown>;
	authorization?: "bearer" | "none";
	responsePath: string;
	targetSlot: string;
	slotType: "header" | "other";
	stripPrefix?: string;
}

/** Minimal auth-bearing provider shape needed by machine login custody. */
export interface LoginLoginProviderConfig {
	id: string;
	baseUrl: string;
	auth: Array<{ kind: string }>;
	login?: { hydration?: LoginHydrationConfig[] };
}

/** Inputs and injected dependencies for one provider login. */
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

async function hydrate(config: LoginProviderConfig, credential: OAuthCredential, fetcher: typeof globalThis.fetch, spec: LoginHydrationConfig, signal: AbortSignal): Promise<CredentialSlot> {
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
 * Completes a config-declared OAuth login and commits all account slots atomically.
 *
 * OAuth scopes are persisted as non-secret account auth metadata.
 */
export async function loginProviderAccount(config: LoginProviderConfig, label: string, store: FileCredentialStore, options: LoginOptions): Promise<void> {
	const oauthConfig = config.auth.find((entry): entry is OAuthAuthConfig => entry.kind === "oauth");
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
		auth: { ...(current?.auth ?? {}), scopes: [...oauthConfig.scopes] },
		slots: {
			...(current?.slots ?? {}),
			[oauthConfig.slot]: { type: "oauth", access: credential.access, refresh: credential.refresh, expires: credential.expires, ...(typeof credential.accountId === "string" ? { accountId: credential.accountId } : {}) },
			...hydrated,
		},
	}));
}
