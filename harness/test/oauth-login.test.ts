import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { FileCredentialStore } from "../src/credentials.ts";
import { loginProviderAccount } from "../src/login.ts";
import { createConfiguredOAuth } from "../src/providers/oauth.ts";
import type { OAuthAuthConfig, ProviderConfig } from "../src/providers/schema.ts";

const roots: string[] = [];

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(process.cwd(), ".oauth-test-"));
	roots.push(path);
	return path;
}

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

function fixtureProvider(baseUrl: string, flow: "pkce" | "device_code"): ProviderConfig {
	const oauth: OAuthAuthConfig =
		flow === "pkce"
			? {
					kind: "oauth",
					slot: "oauth",
					flow,
					authorizationEndpoint: `${baseUrl}/authorize`,
					tokenEndpoint: `${baseUrl}/token`,
					clientId: { value: "fixture-client" },
					scopes: ["openid", "offline_access"],
				}
			: {
					kind: "oauth",
					slot: "oauth",
					flow,
					deviceCodeEndpoint: `${baseUrl}/device`,
					tokenEndpoint: `${baseUrl}/token`,
					clientId: { value: "fixture-client" },
					scopes: ["openid"],
				};
	return {
		id: "fixture-oauth",
		name: "Fixture OAuth",
		dialect: "openai-completions",
		baseUrl,
		auth: [oauth],
		requiredCredentialSlots: ["oauth"],
		models: { static: [{ id: "model" }] },
		capabilities: { tools: true, reasoning: false, images: false },
	};
}

describe("df-managed OAuth", () => {
	test("success: PKCE uses a random loopback callback and stores a machine-local df-owned account", async () => {
		let callbackUri = "";
		const server = Bun.serve({
			port: 0,
			hostname: "127.0.0.1",
			async fetch(request) {
				const url = new URL(request.url);
				if (url.pathname === "/authorize") {
					callbackUri = url.searchParams.get("redirect_uri") ?? "";
					const target = new URL(callbackUri);
					target.searchParams.set("code", "fixture-code");
					target.searchParams.set("state", url.searchParams.get("state") ?? "");
					return Response.redirect(target);
				}
				if (url.pathname === "/token")
					return Response.json({ access_token: "access-a", refresh_token: "refresh-a", expires_in: 60 });
				return new Response("missing", { status: 404 });
			},
		});
		try {
			const provider = fixtureProvider(`http://127.0.0.1:${server.port}`, "pkce");
			const store = new FileCredentialStore(await temporaryHome());
			await loginProviderAccount(provider, "acct-a", store, {
				isHeadless: false,
				notify(event) {
					if (event.type === "auth_url") void fetch(event.url);
				},
				prompt: async () => {
					throw new Error("loopback should not prompt");
				},
			});
			expect(new URL(callbackUri).port).not.toBe("0");
			expect(await store.getSlot(provider.id, "acct-a", "oauth")).toMatchObject({
				type: "oauth",
				access: "access-a",
				refresh: "refresh-a",
			});
			expect((await store.readAccount(`${provider.id}:acct-a`))?.metadata).toMatchObject({
				ownership: "df-owned",
				sync: "machine-only",
			});
		} finally {
			server.stop(true);
		}
	});

	test("edge-input: headless PKCE accepts a pasted redirect URL without opening a listener", async () => {
		const config: OAuthAuthConfig = {
			kind: "oauth",
			slot: "oauth",
			flow: "pkce",
			authorizationEndpoint: "https://auth.fixture/authorize",
			tokenEndpoint: "https://auth.fixture/token",
			clientId: { value: "client" },
			scopes: [],
		};
		let authUrl = "";
		const oauth = createConfiguredOAuth(config, {
			isHeadless: true,
			fetch: (async () =>
				Response.json({ access_token: "a", refresh_token: "r", expires_in: 60 })) as unknown as typeof fetch,
		});
		const credential = await oauth.login({
			signal: new AbortController().signal,
			notify(event) {
				if (event.type === "auth_url") authUrl = event.url;
			},
			prompt: async () => {
				const url = new URL(authUrl);
				const redirect = new URL(url.searchParams.get("redirect_uri")!);
				redirect.searchParams.set("code", "pasted");
				redirect.searchParams.set("state", url.searchParams.get("state")!);
				return redirect.toString();
			},
		});
		expect(credential).toMatchObject({ access: "a", refresh: "r" });
	});

	test("edge-input: an occupied configured callback port falls back to a pasted redirect URL", async () => {
		const server = Bun.serve({
			port: 0,
			hostname: "127.0.0.1",
			fetch(request) {
				return new URL(request.url).pathname === "/token"
					? Response.json({ access_token: "a", refresh_token: "r", expires_in: 60 })
					: new Response("occupied");
			},
		});
		try {
			const base = `http://127.0.0.1:${server.port}`;
			const config: OAuthAuthConfig = {
				kind: "oauth",
				slot: "oauth",
				flow: "pkce",
				authorizationEndpoint: `${base}/authorize`,
				tokenEndpoint: `${base}/token`,
				redirectUri: `${base}/callback`,
				clientId: { value: "client" },
				scopes: [],
			};
			let authUrl = "";
			const oauth = createConfiguredOAuth(config, { isHeadless: false });
			const credential = await oauth.login({
				signal: new AbortController().signal,
				notify(event) {
					if (event.type === "auth_url") authUrl = event.url;
				},
				prompt: async () => {
					const authorization = new URL(authUrl);
					const redirect = new URL(authorization.searchParams.get("redirect_uri")!);
					redirect.searchParams.set("code", "pasted");
					redirect.searchParams.set("state", authorization.searchParams.get("state")!);
					return redirect.toString();
				},
			});
			expect(credential).toMatchObject({ access: "a", refresh: "r" });
		} finally {
			server.stop(true);
		}
	});

	test("denied-failure: device polling backs off on slow_down and rejects malformed success payloads", async () => {
		const waits: number[] = [];
		let polls = 0;
		const server = Bun.serve({
			port: 0,
			hostname: "127.0.0.1",
			fetch(request) {
				const path = new URL(request.url).pathname;
				if (path === "/device")
					return Response.json({
						device_code: "device",
						user_code: "USER",
						verification_uri: "http://127.0.0.1/verify",
						expires_in: 60,
						interval: 1,
					});
				return ++polls === 1
					? Response.json({ error: "slow_down" }, { status: 400 })
					: Response.json({ access_token: "missing-refresh", expires_in: 60 });
			},
		});
		try {
			const base = `http://127.0.0.1:${server.port}`;
			const config: OAuthAuthConfig = {
				kind: "oauth",
				slot: "oauth",
				flow: "device_code",
				deviceCodeEndpoint: `${base}/device`,
				tokenEndpoint: `${base}/token`,
				clientId: { value: "client" },
				scopes: [],
			};
			const oauth = createConfiguredOAuth(config, {
				now: () => 1_000,
				sleep: async (ms) => {
					waits.push(ms);
				},
			});
			await expect(
				oauth.login({ signal: new AbortController().signal, notify: () => undefined, prompt: async () => "" }),
			).rejects.toThrow(/missing access_token or refresh_token/);
			expect(waits).toEqual([1_000, 6_000]);
		} finally {
			server.stop(true);
		}
	});

	test("Google-style configured hydration stores a bare project without touching another account", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		await store.setSlot("fixture-oauth:acct-a", "oauth", {
			type: "oauth",
			access: "old-a",
			refresh: "old-ra",
			expires: 9_999_999_999_999,
		});
		const provider = fixtureProvider("https://provider.fixture", "pkce");
		provider.enabled = false;
		provider.login = {
			hydration: [
				{
					path: "/loadCodeAssist",
					method: "POST",
					body: { metadata: { pluginType: "PLUGIN_TEST" } },
					responsePath: "cloudaicompanionProject",
					targetSlot: "project",
					slotType: "header",
					stripPrefix: "projects/",
				},
			],
		};
		await loginProviderAccount(provider, "acct-b", store, {
			credential: { type: "oauth", access: "access-b", refresh: "refresh-b", expires: 2_000_000 },
			fetch: (async (input, init) => {
				expect(String(input)).toBe("https://provider.fixture/loadCodeAssist");
				expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-b");
				return Response.json({ cloudaicompanionProject: "projects/project-b" });
			}) as typeof fetch,
			notify: () => undefined,
			prompt: async () => "",
		});
		expect(await store.getSlot(provider.id, "acct-b", "project")).toEqual({ type: "header", value: "project-b" });
		expect(await store.getSlot(provider.id, "acct-a", "oauth")).toMatchObject({ access: "old-a" });
	});
});
