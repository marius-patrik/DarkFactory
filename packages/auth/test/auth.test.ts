import { afterEach, beforeEach, describe, expect, test, mock } from "bun:test";
import {
	generatePKCE,
	createGitHubAuthorizeUrl,
	handleAuthCallback,
	fetchUserAuthority,
	restoreSession,
	logout,
	MemoryAuthStorage,
} from "../src/browser.ts";
import { exchangeCode, refreshAccessToken, revokeToken } from "../src/broker.ts";

describe("@darkfactory/auth", () => {
	const originalFetch = globalThis.fetch;
	let fetchCalls: { url: string; options?: RequestInit }[] = [];
	let fetchMockResponse: (url: string, options?: RequestInit) => Promise<Response>;

	beforeEach(() => {
		fetchCalls = [];
		// Default mock resolver
		fetchMockResponse = async () => new Response(JSON.stringify({}));
		globalThis.fetch = async (input, init) => {
			const url = typeof input === "string" ? input : (input as Request).url;
			fetchCalls.push({ url, options: init });
			return fetchMockResponse(url, init);
		};
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("generatePKCE generates high-entropy random state, verifier, and valid challenge", async () => {
		const result = await generatePKCE();
		expect(result.state).toHaveLength(32);
		expect(result.codeVerifier).toHaveLength(64);
		expect(result.codeChallenge).toBeDefined();
		expect(result.codeChallenge).not.toContain("+");
		expect(result.codeChallenge).not.toContain("/");
	});

	test("createGitHubAuthorizeUrl generates proper authorization url and populates storage", async () => {
		const storage = new MemoryAuthStorage();
		const authorizeUrl = await createGitHubAuthorizeUrl("test-client-id", {
			scope: "repo read:user",
			redirectUri: "https://example.com/callback",
			storage,
		});

		const url = new URL(authorizeUrl);
		expect(url.origin).toBe("https://github.com");
		expect(url.pathname).toBe("/login/oauth/authorize");
		expect(url.searchParams.get("client_id")).toBe("test-client-id");
		expect(url.searchParams.get("scope")).toBe("repo read:user");
		expect(url.searchParams.get("redirect_uri")).toBe("https://example.com/callback");
		expect(url.searchParams.get("code_challenge")).toBeDefined();
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");

		// Values must be securely persisted in session storage
		expect(storage.getItem("df_oauth_state")).toBe(url.searchParams.get("state")!);
		expect(storage.getItem("df_oauth_code_verifier")).toBeDefined();
	});

	test("handleAuthCallback throws on state/CSRF mismatch", async () => {
		const storage = new MemoryAuthStorage();
		storage.setItem("df_oauth_state", "correct-state");
		storage.setItem("df_oauth_code_verifier", "some-verifier");

		expect(
			handleAuthCallback("code-val", "wrong-state", "https://broker.local/exchange", { storage }),
		).rejects.toThrow(/CSRF/);
	});

	test("handleAuthCallback exchanges valid code/state with the broker and stores retrieved tokens", async () => {
		const storage = new MemoryAuthStorage();
		storage.setItem("df_oauth_state", "state-token");
		storage.setItem("df_oauth_code_verifier", "code-verifier-token");

		fetchMockResponse = async (url, options) => {
			if (url === "https://broker.local/exchange") {
				const body = JSON.parse(options?.body as string);
				expect(body.code).toBe("some-code");
				expect(body.code_verifier).toBe("code-verifier-token");

				return new Response(
					JSON.stringify({
						access_token: "retrieved-access-token",
						refresh_token: "retrieved-refresh-token",
						expires_in: 28800,
					}),
					{ status: 200 },
				);
			}
			return new Response("Not found", { status: 404 });
		};

		const tokens = await handleAuthCallback(
			"some-code",
			"state-token",
			"https://broker.local/exchange",
			{ storage },
		);

		expect(tokens.access_token).toBe("retrieved-access-token");
		expect(tokens.refresh_token).toBe("retrieved-refresh-token");

		// Tokens should now be restored/saved
		expect(storage.getItem("df_auth_access_token")).toBe("retrieved-access-token");
		expect(storage.getItem("df_auth_refresh_token")).toBe("retrieved-refresh-token");

		// Used auth materials must be cleared
		expect(storage.getItem("df_oauth_state")).toBeNull();
		expect(storage.getItem("df_oauth_code_verifier")).toBeNull();
	});

	test("exchangeCode broker call handles GitHub oauth access token exchange", async () => {
		fetchMockResponse = async (url, options) => {
			expect(url).toBe("https://github.com/login/oauth/access_token");
			const body = JSON.parse(options?.body as string);
			expect(body.client_id).toBe("client-id-abc");
			expect(body.client_secret).toBe("super-secret");
			expect(body.code).toBe("code-123");
			expect(body.code_verifier).toBe("verifier-456");

			return new Response(
				JSON.stringify({
					access_token: "user-token-xyz",
					scope: "repo",
				}),
				{ status: 200 },
			);
		};

		const res = await exchangeCode({
			code: "code-123",
			codeVerifier: "verifier-456",
			clientId: "client-id-abc",
			clientSecret: "super-secret",
		});

		expect(res.access_token).toBe("user-token-xyz");
	});

	test("refreshAccessToken broker call refreshes expired user session", async () => {
		fetchMockResponse = async (url, options) => {
			expect(url).toBe("https://github.com/login/oauth/access_token");
			const body = JSON.parse(options?.body as string);
			expect(body.refresh_token).toBe("refresh-abc");
			expect(body.grant_type).toBe("refresh_token");

			return new Response(
				JSON.stringify({
					access_token: "new-access-token-111",
					refresh_token: "new-refresh-token-222",
				}),
				{ status: 200 },
			);
		};

		const res = await refreshAccessToken({
			refreshToken: "refresh-abc",
			clientId: "id-123",
			clientSecret: "sec-456",
		});

		expect(res.access_token).toBe("new-access-token-111");
		expect(res.refresh_token).toBe("new-refresh-token-222");
	});

	test("revokeToken broker call revokes given token", async () => {
		let deleteReceived = false;
		fetchMockResponse = async (url, options) => {
			if (options?.method === "DELETE") {
				expect(url).toBe("https://api.github.com/applications/client-id-xyz/grant");
				const basicAuth = options.headers ? (options.headers as Record<string, string>).Authorization : "";
				expect(basicAuth).toBe(`Basic ${btoa("client-id-xyz:sec-abc")}`);
				deleteReceived = true;
				return new Response(null, { status: 204 });
			}
			return new Response(null, { status: 400 });
		};

		await revokeToken({
			token: "access-token-to-revoke",
			clientId: "client-id-xyz",
			clientSecret: "sec-abc",
		});

		expect(deleteReceived).toBe(true);
	});

	test("fetchUserAuthority derives user identity and repository visibility/permissions", async () => {
		fetchMockResponse = async (url) => {
			if (url === "https://api.github.com/user") {
				return new Response(
					JSON.stringify({
						login: "jane-coder",
						id: 999123,
						avatar_url: "https://avatar",
						name: "Jane Coder",
					}),
				);
			}
			if (url === "https://api.github.com/repos/owner-xyz/repo-abc") {
				return new Response(
					JSON.stringify({
						permissions: {
							admin: false,
							push: true,
							pull: true,
						},
					}),
				);
			}
			return new Response("Not found", { status: 404 });
		};

		const auth = await fetchUserAuthority("user-access-token-xyz", "owner-xyz", "repo-abc");
		expect(auth.user.login).toBe("jane-coder");
		expect(auth.permissions.push).toBe(true);
		expect(auth.canWrite).toBe(true);
		expect(auth.isInstalled).toBe(true);
	});

	test("restoreSession returns active token if available in storage", async () => {
		const storage = new MemoryAuthStorage();
		storage.setItem("df_auth_access_token", "active-user-token");

		const token = await restoreSession("https://broker.local/refresh", storage);
		expect(token).toBe("active-user-token");
		expect(fetchCalls).toHaveLength(0);
	});

	test("restoreSession triggers broker refresh if refresh_token is available", async () => {
		const storage = new MemoryAuthStorage();
		storage.setItem("df_auth_refresh_token", "saved-refresh-token");

		fetchMockResponse = async (url, options) => {
			expect(url).toBe("https://broker.local/refresh");
			const body = JSON.parse(options?.body as string);
			expect(body.refresh_token).toBe("saved-refresh-token");

			return new Response(
				JSON.stringify({
					access_token: "newly-refreshed-access-token",
					refresh_token: "newly-refreshed-refresh-token",
				}),
				{ status: 200 },
			);
		};

		const token = await restoreSession("https://broker.local/refresh", storage);
		expect(token).toBe("newly-refreshed-access-token");
		expect(storage.getItem("df_auth_access_token")).toBe("newly-refreshed-access-token");
		expect(storage.getItem("df_auth_refresh_token")).toBe("newly-refreshed-refresh-token");
	});

	test("logout clears all session and PKCE storage", () => {
		const storage = new MemoryAuthStorage();
		storage.setItem("df_oauth_state", "state");
		storage.setItem("df_oauth_code_verifier", "verifier");
		storage.setItem("df_auth_access_token", "token");
		storage.setItem("df_auth_refresh_token", "refresh");

		logout(storage);

		expect(storage.getItem("df_oauth_state")).toBeNull();
		expect(storage.getItem("df_oauth_code_verifier")).toBeNull();
		expect(storage.getItem("df_auth_access_token")).toBeNull();
		expect(storage.getItem("df_auth_refresh_token")).toBeNull();
	});
});
