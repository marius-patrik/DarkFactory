import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	MemoryAuthTokenStore,
	createBrokerSession,
	refreshBrokerSession,
	revokeBrokerSession,
} from "../../../packages/auth/src/broker.ts";
import { ScopedGitHubAppTransport } from "../../../packages/auth/src/github-transport.ts";
import { SqliteAuthTokenStore } from "../../../packages/auth/src/sqlite.ts";

const originalFetch = globalThis.fetch;
const directories: string[] = [];
const verifier = "v".repeat(43);
const callback = { code: "authorization", codeVerifier: verifier, redirectUri: "https://example.test/oauth" };
const config = {
	clientId: "test-app",
	clientSecret: "in-memory-test-only",
	sessionTtlMs: 1_000,
	redirectUris: [callback.redirectUri],
};
const key = Buffer.alloc(32, 13).toString("base64");

afterEach(async () => {
	globalThis.fetch = originalFetch;
	for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true });
});

function mockRotatingOAuth(delayRefreshMs = 0): string[] {
	const usedRefreshTokens: string[] = [];
	let calls = 0;
	globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
		const params = new URLSearchParams(String(init?.body));
		if (params.get("grant_type") === "refresh_token") {
			usedRefreshTokens.push(params.get("refresh_token") ?? "");
			if (delayRefreshMs) await Bun.sleep(delayRefreshMs);
		}
		calls++;
		return new Response(
			JSON.stringify({
				access_token: `access-${calls}`,
				refresh_token: `refresh-${calls}`,
				token_type: "bearer",
				expires_in: 1,
				refresh_token_expires_in: 7200,
			}),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
	}) as unknown as typeof fetch;
	return usedRefreshTokens;
}

describe("DF-23 absolute browser-session lifetime security regressions", () => {
	test("repeated and concurrent rotation cannot extend the original maximum lifetime", async () => {
		const used = mockRotatingOAuth();
		const store = new MemoryAuthTokenStore();
		const first = await createBrokerSession(config, callback, store, { sessionId: "session", now: 10_000 });
		expect(first.expiresAt).toBe(11_000);
		const second = await refreshBrokerSession(config, first.id, store, 10_200);
		const third = await refreshBrokerSession(config, first.id, store, 10_400);
		const concurrent = await Promise.all([
			refreshBrokerSession(config, first.id, store, 10_700),
			refreshBrokerSession(config, first.id, store, 10_700),
		]);
		for (const session of [second, third, ...concurrent]) {
			expect(session.expiresAt).toBeLessThanOrEqual(first.expiresAt);
			expect(session.id).toBe(first.id);
		}
		expect((await store.get(first.id))?.sessionExpiresAt).toBe(11_000);
		expect(used).toEqual(["refresh-1", "refresh-2", "refresh-3", "refresh-4"]);
		await expect(refreshBrokerSession(config, first.id, store, 11_000)).rejects.toThrow("expired");
		expect(used).toHaveLength(4);
	});

	test("a refresh started before expiry cannot commit after the deadline", async () => {
		const used = mockRotatingOAuth(40);
		const store = new MemoryAuthTokenStore();
		const short = { ...config, sessionTtlMs: 20 };
		await createBrokerSession(short, callback, store, { sessionId: "late", now: 10_000 });
		await expect(refreshBrokerSession(short, "late", store, 10_001)).rejects.toThrow("expired");
		expect(used).toEqual(["refresh-1"]);
		expect((await store.get("late"))?.token.access_token).toBe("access-1");
		expect((await store.get("late"))?.sessionExpiresAt).toBe(10_020);
	});

	test("session identifier reuse cannot reset an active session deadline", async () => {
		mockRotatingOAuth();
		const store = new MemoryAuthTokenStore();
		await createBrokerSession(config, callback, store, { sessionId: "fixed", now: 10_000 });
		await expect(
			createBrokerSession({ ...config, sessionTtlMs: 99_000 }, callback, store, {
				sessionId: "fixed",
				now: 10_500,
			}),
		).rejects.toThrow("already exists");
		expect((await store.get("fixed"))?.sessionExpiresAt).toBe(11_000);
	});

	test("access token expiry permits rotation, but absolute session expiry does not", async () => {
		const used = mockRotatingOAuth();
		const store = new MemoryAuthTokenStore();
		const longer = { ...config, sessionTtlMs: 20_000 };
		await createBrokerSession(longer, callback, store, { sessionId: "access-expired", now: 10_000 });
		const refreshed = await refreshBrokerSession(longer, "access-expired", store, 11_500);
		expect(refreshed.expiresAt).toBe(12_500);
		expect((await store.get("access-expired"))?.sessionExpiresAt).toBe(30_000);
		expect(used).toEqual(["refresh-1"]);
		await expect(refreshBrokerSession(longer, "access-expired", store, 30_000)).rejects.toThrow("expired");
		expect(used).toHaveLength(1);
	});

	test("revocation tombstone blocks refresh even when GitHub revocation fails", async () => {
		mockRotatingOAuth();
		const store = new MemoryAuthTokenStore();
		await createBrokerSession(config, callback, store, { sessionId: "revoked", now: 10_000 });
		globalThis.fetch = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
		await expect(revokeBrokerSession(config, "revoked", store)).rejects.toThrow("revocation failed");
		expect((await store.get("revoked"))?.revokedAt).toEqual(expect.any(Number));
		await expect(refreshBrokerSession(config, "revoked", store, 10_500)).rejects.toThrow("revoked");
		globalThis.fetch = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
		await revokeBrokerSession(config, "revoked", store);
		expect(await store.get("revoked")).toBeUndefined();
		await expect(refreshBrokerSession(config, "revoked", store, 10_500)).rejects.toThrow("Unknown");
	});

	test("SQLite reload in a new process preserves the original deadline after rotation", async () => {
		mockRotatingOAuth();
		const root = await mkdtemp(join(tmpdir(), "df23-session-"));
		directories.push(root);
		const path = join(root, "broker.sqlite.df");
		const first = new SqliteAuthTokenStore({ path, keyBase64: key });
		try {
			await createBrokerSession(config, callback, first, { sessionId: "durable", now: 10_000 });
		} finally {
			first.close();
		}

		const childCode = `
import { SqliteAuthTokenStore } from ${JSON.stringify(new URL("../../../packages/auth/src/sqlite.ts", import.meta.url).href)};
import { refreshBrokerSession } from ${JSON.stringify(new URL("../../../packages/auth/src/broker.ts", import.meta.url).href)};
const store = new SqliteAuthTokenStore({ path: ${JSON.stringify(path)}, keyBase64: ${JSON.stringify(key)} });
globalThis.fetch = async () => new Response(JSON.stringify({
	access_token: "child-access", refresh_token: "child-refresh", token_type: "bearer",
	expires_in: 3600, refresh_token_expires_in: 7200
}), { status: 200 });
try {
	const session = await refreshBrokerSession(
		{ clientId: "test-app", clientSecret: "test-only", sessionTtlMs: 900000 },
		"durable", store, 10500
	);
	console.log(JSON.stringify(session));
} finally {
	store.close();
}
`;
		const child = Bun.spawn([process.execPath, "-e", childCode], { stdout: "pipe", stderr: "pipe" });
		const output = await new Response(child.stdout).text();
		const errors = await new Response(child.stderr).text();
		const exitCode = await child.exited;
		if (exitCode !== 0) throw new Error(`Child authentication regression failed: ${errors}`);
		expect(exitCode).toBe(0);
		expect(JSON.parse(output)).toEqual({ id: "durable", expiresAt: 11_000 });
		const reloaded = new SqliteAuthTokenStore({ path, keyBase64: key });
		try {
			expect((await reloaded.get("durable"))?.sessionExpiresAt).toBe(11_000);
			expect((await reloaded.get("durable"))?.token.refresh_token).toBe("child-refresh");
			await expect(refreshBrokerSession(config, "durable", reloaded, 11_000)).rejects.toThrow("expired");
		} finally {
			reloaded.close();
		}
	});

	test("malformed PKCE and unapproved redirects are rejected before the token endpoint", async () => {
		let contacted = false;
		globalThis.fetch = (async () => {
			contacted = true;
			throw new Error("Unexpected OAuth exchange");
		}) as unknown as typeof fetch;
		const store = new MemoryAuthTokenStore();
		await expect(createBrokerSession(config, { ...callback, codeVerifier: "short" }, store)).rejects.toThrow(
			"PKCE verifier",
		);
		await expect(
			createBrokerSession(config, { ...callback, redirectUri: "https://wrong.example/oauth" }, store),
		).rejects.toThrow("not authorized");
		expect(contacted).toBe(false);
		expect(await store.get("session")).toBeUndefined();
	});

	test("GitHub user authority cannot be borrowed across repository identities", async () => {
		const service = new ScopedGitHubAppTransport({
			appId: "app",
			privateKey: "test-only-not-a-key",
			appJwtForRepository: async () => "test-jwt",
			fetcher: async (url) => {
				if (url.endsWith("/user")) return Response.json({ login: "octocat", id: 1 });
				if (url.endsWith("/repos/org/repo"))
					return Response.json({
						full_name: "org/other",
						permissions: { pull: true, push: true, admin: true },
					});
				throw new Error("Unexpected privileged GitHub call");
			},
		});
		await expect(
			service.authority({ userToken: "user-token", userId: "octocat", repository: "org/repo" }),
		).rejects.toThrow("repository identity mismatch");
	});
});
