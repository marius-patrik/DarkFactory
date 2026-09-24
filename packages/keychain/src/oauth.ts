import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { OAuthAuth, OAuthCredential, ProviderAuthInteraction } from "@earendil-works/pi-ai";

/** Configuration value supplied literally or via an environment variable. */
export interface ValueReference {
	value?: string;
	env?: string;
}

/** Declarative machine OAuth configuration owned by the keychain. */
export interface OAuthAuthConfig {
	kind: "oauth";
	slot: string;
	flow: "device_code" | "pkce";
	authorizationEndpoint?: string;
	deviceCodeEndpoint?: string;
	tokenEndpoint: string;
	clientId: ValueReference;
	clientSecret?: ValueReference;
	scopes: string[];
	isSubscription?: boolean;
	loginLabel?: string;
	authHeaders?: Record<string, string>;
	accountIdHeader?: string;
	placement?: "bearer" | "api_key";
	tokenEncoding?: "form" | "json";
	redirectUri?: string;
	authorizationParams?: Record<string, string>;
	accountIdJwtClaim?: string[];
}

/** Injectable OAuth runtime dependencies for deterministic tests and machine execution. */
export interface OAuthDependencies {
	fetch: typeof globalThis.fetch;
	now: () => number;
	env: Readonly<Record<string, string | undefined>>;
	isHeadless: boolean;
	sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}
const sleep = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
	const timer = setTimeout(resolve, milliseconds);
	signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
});
const DEFAULTS: OAuthDependencies = { fetch: globalThis.fetch, now: Date.now, env: process.env, isHeadless: !(process.stdin.isTTY && process.stdout.isTTY), sleep };
function reference(ref: ValueReference | undefined, env: Readonly<Record<string, string | undefined>>, label: string): string | undefined {
	const value = ref?.value ?? (ref?.env ? env[ref.env] : undefined);
	if (ref && !value) throw new Error(`OAuth ${label} reference is not configured`);
	return value;
}
async function payload(response: Response, label: string): Promise<Record<string, unknown>> {
	let value: unknown; try { value = await response.json(); } catch { throw new Error(`${label} returned invalid JSON`); }
	if (!response.ok || !value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} failed (HTTP ${response.status})`);
	return value as Record<string, unknown>;
}
function jwtClaim(tokenValue: string, path: readonly string[] | undefined): string | undefined {
	if (!path) return undefined;
	try {
		let value: unknown = JSON.parse(Buffer.from(tokenValue.split(".")[1] ?? "", "base64url").toString("utf8"));
		for (const part of path) value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
		return typeof value === "string" && value ? value : undefined;
	} catch { return undefined; }
}
function credential(value: Record<string, unknown>, now: number, config: OAuthAuthConfig, oldRefresh?: string): OAuthCredential {
	const access = typeof value.access_token === "string" ? value.access_token : undefined;
	const refresh = typeof value.refresh_token === "string" ? value.refresh_token : oldRefresh;
	if (!access || !refresh) throw new Error("OAuth token response is missing access_token or refresh_token");
	const seconds = typeof value.expires_in === "number" && value.expires_in > 0 ? value.expires_in : 3600;
	const accountId = jwtClaim(access, config.accountIdJwtClaim);
	if (config.accountIdJwtClaim && !accountId) throw new Error("OAuth access token is missing the configured account id claim");
	return { type: "oauth", access, refresh, expires: now + seconds * 1000, ...(accountId ? { accountId } : {}) };
}
async function token(config: OAuthAuthConfig, deps: OAuthDependencies, params: Record<string, string>, signal: AbortSignal, oldRefresh?: string): Promise<OAuthCredential> {
	const clientId = reference(config.clientId, deps.env, "client id")!;
	const clientSecret = reference(config.clientSecret, deps.env, "client secret");
	const fields = { ...params, client_id: clientId, ...(clientSecret ? { client_secret: clientSecret } : {}) };
	const json = config.tokenEncoding === "json";
	const response = await deps.fetch(config.tokenEndpoint, { method: "POST", headers: { "content-type": json ? "application/json" : "application/x-www-form-urlencoded" }, body: json ? JSON.stringify(fields) : new URLSearchParams(fields), signal, redirect: "error" });
	return credential(await payload(response, "OAuth token endpoint"), deps.now(), config, oldRefresh);
}

interface LoopbackCallback { redirectUri: string; result: Promise<string>; close(): Promise<void> }

async function loopback(config: OAuthAuthConfig, state: string, signal: AbortSignal): Promise<LoopbackCallback | undefined> {
	let requested: URL;
	try { requested = new URL(config.redirectUri ?? "http://127.0.0.1:0/auth/callback"); } catch { return undefined; }
	if (!new Set(["localhost", "127.0.0.1", "::1", "[::1]"]).has(requested.hostname)) return undefined;
	let resolveCode!: (code: string) => void;
	let rejectCode!: (error: unknown) => void;
	const result = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
	let server: Server;
	server = createServer((request, response) => {
		const url = new URL(request.url ?? "/", requested);
		if (url.pathname !== requested.pathname) { response.writeHead(404).end("Not found"); return; }
		const code = url.searchParams.get("code") ?? "";
		const returnedState = url.searchParams.get("state") ?? "";
		if (!code || returnedState !== state) {
			response.writeHead(400, { "content-type": "text/plain" }).end("OAuth callback rejected. Return to df.");
			rejectCode(new Error(returnedState !== state ? "OAuth state mismatch" : "OAuth authorization code was empty"));
			return;
		}
		response.writeHead(200, { "content-type": "text/plain" }).end("Login complete. You can close this window.");
		resolveCode(code);
	});
	try {
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(Number(requested.port || 80), requested.hostname, () => { server.off("error", reject); resolve(); });
		});
	} catch { server.close(); return undefined; }
	const address = server.address() as AddressInfo;
	requested.port = String(address.port);
	signal.addEventListener("abort", () => rejectCode(signal.reason), { once: true });
	return { redirectUri: requested.toString(), result, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

async function pkceLogin(config: OAuthAuthConfig, deps: OAuthDependencies, interaction: ProviderAuthInteraction): Promise<OAuthCredential> {
	if (!config.authorizationEndpoint) throw new Error("PKCE OAuth requires authorizationEndpoint");
	const verifier = randomBytes(32).toString("base64url");
	const state = randomBytes(16).toString("base64url");
	const callback = deps.isHeadless ? undefined : await loopback(config, state, interaction.signal);
	const redirectUri = callback?.redirectUri ?? config.redirectUri ?? "http://localhost:1455/auth/callback";
	const url = new URL(config.authorizationEndpoint);
	for (const [key, value] of Object.entries({ client_id: reference(config.clientId, deps.env, "client id")!, redirect_uri: redirectUri, response_type: "code", scope: config.scopes.join(" "), code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state, ...config.authorizationParams })) url.searchParams.set(key, value);
	interaction.notify({ type: "auth_url", url: url.toString(), instructions: callback ? "Complete sign-in; df is waiting on the local callback." : "Complete sign-in and paste the returned redirect URL." });
	try {
		let code: string;
		if (callback) code = await callback.result;
		else {
			const input = (await interaction.prompt({ type: "manual_code", message: "Authorization code or redirect URL" })).trim();
			let returnedState: string | undefined;
			try { const parsed = new URL(input); code = parsed.searchParams.get("code") ?? ""; returnedState = parsed.searchParams.get("state") ?? undefined; } catch { if (input.includes("#")) { const parts = input.split("#", 2); code = parts[0] ?? ""; returnedState = parts[1]; } else code = input; }
			if (!code) throw new Error("OAuth authorization code was empty");
			if (returnedState && returnedState !== state) throw new Error("OAuth state mismatch");
		}
		return await token(config, deps, { grant_type: "authorization_code", code, state, redirect_uri: redirectUri, code_verifier: verifier }, interaction.signal);
	} finally { await callback?.close(); }
}
async function deviceLogin(config: OAuthAuthConfig, deps: OAuthDependencies, interaction: ProviderAuthInteraction): Promise<OAuthCredential> {
	if (!config.deviceCodeEndpoint) throw new Error("Device OAuth requires deviceCodeEndpoint");
	const clientId = reference(config.clientId, deps.env, "client id")!;
	const response = await deps.fetch(config.deviceCodeEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, scope: config.scopes.join(" ") }), signal: interaction.signal, redirect: "error" });
	const value = await payload(response, "OAuth device-code endpoint");
	const deviceCode = typeof value.device_code === "string" ? value.device_code : undefined;
	const userCode = typeof value.user_code === "string" ? value.user_code : undefined;
	const verificationUri = typeof value.verification_uri === "string" ? value.verification_uri : typeof value.verification_uri_complete === "string" ? value.verification_uri_complete : undefined;
	if (!deviceCode || !userCode || !verificationUri) throw new Error("OAuth device-code response is incomplete");
	let interval = typeof value.interval === "number" && value.interval > 0 ? value.interval : 5;
	const expires = deps.now() + (typeof value.expires_in === "number" ? value.expires_in : 900) * 1000;
	interaction.notify({ type: "device_code", userCode, verificationUri, intervalSeconds: interval });
	while (deps.now() < expires) {
		await deps.sleep(interval * 1000, interaction.signal);
		const poll = await deps.fetch(config.tokenEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: deviceCode, client_id: clientId }), signal: interaction.signal, redirect: "error" });
		const body = await poll.json().catch(() => null) as Record<string, unknown> | null;
		if (poll.ok && body) return credential(body, deps.now(), config);
		if (body?.error === "slow_down") { interval += 5; continue; }
		if (body?.error === "authorization_pending") continue;
		throw new Error(`OAuth device token failed (HTTP ${poll.status})`);
	}
	throw new Error("OAuth device code expired");
}
/**
 * Creates a pi OAuth implementation from the keychain-owned declarative config.
 *
 * @param config - Provider OAuth flow and token configuration.
 * @param dependencies - Optional deterministic/runtime dependency overrides.
 * @returns OAuth implementation with login, refresh, and request-auth behavior.
 */
export function createConfiguredOAuth(config: OAuthAuthConfig, dependencies: Partial<OAuthDependencies> = {}): OAuthAuth {
	const deps = { ...DEFAULTS, ...dependencies };
	return {
		name: config.loginLabel ?? "OAuth", loginLabel: config.loginLabel, isSubscription: config.isSubscription,
		login: (interaction) => config.flow === "device_code" ? deviceLogin(config, deps, interaction) : pkceLogin(config, deps, interaction),
		refresh: (current, signal) => token(config, deps, { grant_type: "refresh_token", refresh_token: current.refresh }, signal, current.refresh),
		async toAuth(current) {
			const extraHeaders = { ...config.authHeaders, ...(config.accountIdHeader && typeof current.accountId === "string" ? { [config.accountIdHeader]: current.accountId } : {}) };
			return config.placement === "api_key" ? { apiKey: current.access, headers: extraHeaders } : { headers: { Authorization: `Bearer ${current.access}`, ...extraHeaders } };
		},
	};
}
