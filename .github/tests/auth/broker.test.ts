import { afterEach, describe, expect, test } from "bun:test";
import {
	createBrokerSession,
	MemoryAuthTokenStore,
	refreshBrokerSession,
	revokeBrokerSession,
} from "../../../packages/auth/src/broker.ts";

/**
 * A `fetch` stand-in that returns a fixed status.
 *
 * `typeof fetch` in this TypeScript library declares `preconnect`, so a stub that only produces a
 * Response cannot be cast to it without lying about its shape. The broker only ever calls `fetch` and
 * reads the status, so the double is typed as the callable it is and installed through the global.
 */
function fetchReturning(status: number): typeof fetch {
	return (async () => new Response(null, { status })) as unknown as typeof fetch;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("@darkfactory/auth confidential broker", () => {
	test("exchange and refresh keep tokens broker-side", async () => {
		const requests: { url: string; init?: RequestInit }[] = [];
		let call = 0;
		globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(input), init });
			call += 1;
			return new Response(
				JSON.stringify(
					call === 1
						? {
								access_token: "access-1",
								refresh_token: "refresh-1",
								token_type: "bearer",
								expires_in: 3600,
								refresh_token_expires_in: 7200,
							}
						: {
								access_token: "access-2",
								refresh_token: "refresh-2",
								token_type: "bearer",
								expires_in: 3600,
								refresh_token_expires_in: 7200,
							},
				),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			);
		}) as typeof fetch;

		const store = new MemoryAuthTokenStore();
		const config = { clientId: "client", clientSecret: "secret" };
		const session = await createBrokerSession(
			config,
			{ code: "code", codeVerifier: "v".repeat(43), redirectUri: "https://example.test/callback" },
			store,
			{ sessionId: "session", userId: "octocat", now: 1_000 },
		);
		expect(session).toEqual({ id: "session", expiresAt: 3_601_000, userId: "octocat" });
		expect(JSON.stringify(session)).not.toContain("access-1");
		expect((await store.get("session"))?.token.access_token).toBe("access-1");

		const refreshed = await refreshBrokerSession(config, "session", store, 2_000);
		expect(refreshed.id).toBe("session");
		expect((await store.get("session"))?.token.access_token).toBe("access-2");
		expect(String(requests[1]?.init?.body)).toContain("grant_type=refresh_token");
	});

	test("refresh fails closed for unknown and non-refreshable sessions", async () => {
		const store = new MemoryAuthTokenStore();
		const config = { clientId: "client", clientSecret: "secret" };
		await expect(refreshBrokerSession(config, "missing", store)).rejects.toThrow("Unknown authentication session");
		await store.set("session", { token: { access_token: "access", token_type: "bearer" } });
		await expect(refreshBrokerSession(config, "session", store)).rejects.toThrow("not refreshable");
	});

	test("revocation deletes broker state only after GitHub accepts the revocation", async () => {
		const store = new MemoryAuthTokenStore();
		await store.set("session", { token: { access_token: "access", token_type: "bearer" } });
		/**
		 * A `fetch` stand-in that returns a fixed status.
		 *
		 * `typeof fetch` in this TypeScript library declares `preconnect`, so a stub that only produces a
		 * Response cannot be cast to it without lying about its shape. The broker only ever calls `fetch` and
		 * reads the status, so the double is typed as the callable it is and installed through the global.
		 */
		function fetchReturning(status: number): typeof fetch {
			const stub = (async () => new Response(null, { status })) as unknown as typeof fetch;
			return stub;
		}

		const config = { clientId: "client", clientSecret: "secret" };
		globalThis.fetch = fetchReturning(204);
		await revokeBrokerSession(config, "session", store);
		expect(await store.get("session")).toBeUndefined();
	});

	test("failed revocation preserves broker state for retry", async () => {
		const store = new MemoryAuthTokenStore();
		await store.set("session", { token: { access_token: "access", token_type: "bearer" } });
		const config = { clientId: "client", clientSecret: "secret" };
		globalThis.fetch = fetchReturning(500);
		await expect(revokeBrokerSession(config, "session", store)).rejects.toThrow("revocation failed");
		expect(await store.get("session")).toBeDefined();
	});
});


describe("@darkfactory/auth negative broker security", () => {
	test("refuses malformed PKCE and unapproved redirect before contacting GitHub", async () => {
		let contacted = false;
		globalThis.fetch = (async () => {
			contacted = true;
			throw new Error("unexpected outbound exchange");
		}) as typeof fetch;
		const store = new MemoryAuthTokenStore();
		const config = { clientId: "client", clientSecret: "secret", redirectUris: ["https://valid.test/callback"] };
		await expect(
			createBrokerSession(config, { code: "code", codeVerifier: "short", redirectUri: "https://valid.test/callback" }, store),
		).rejects.toThrow("PKCE verifier");
		await expect(
			createBrokerSession(config, { code: "code", codeVerifier: "v".repeat(43), redirectUri: "https://other.test/callback" }, store),
		).rejects.toThrow("not authorized");
		expect(contacted).toBe(false);
	});
	test("expired broker session cannot refresh and is not extended", async () => {
		const store = new MemoryAuthTokenStore();
		await store.set("expired", {
			token: { access_token: "access", refresh_token: "refresh", token_type: "bearer" },
			sessionExpiresAt: 9_999,
		});
		await expect(refreshBrokerSession({ clientId: "client", clientSecret: "secret" }, "expired", store, 10_000))
			.rejects.toThrow("session has expired");
	});
	test("secret-bearing session responses are rejected by the browser-safe parser", async () => {
		const { parseBrowserSession } = await import("../../../packages/auth/src/types.ts");
		expect(() => parseBrowserSession({ id: "opaque", expiresAt: 100, access_token: "LEAK" })).toThrow(
			"Invalid browser auth session",
		);
	});
});
