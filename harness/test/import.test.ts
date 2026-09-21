import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { importAntigravityAccount } from "@darkfactory/keychain/import/antigravity";
import { importClaudeAccount } from "@darkfactory/keychain/import/claude";
import { importCodexAccount } from "@darkfactory/keychain/import/codex";
import { importGrokAccount } from "@darkfactory/keychain/import/grok";
import { CLAUDE_CREDENTIALS_SERVICE_PREFIX, type ClaudeKeyring } from "@darkfactory/keychain/import/keyring";
import { importKimiAccount } from "@darkfactory/keychain/import/kimi";
import type { HomeReader } from "@darkfactory/keychain/import/reader";
import type { OAuthCredential } from "@earendil-works/pi-ai";
import { FileCredentialStore } from "../src/credentials.ts";

const roots: string[] = [];

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(import.meta.dir, ".df-import-"));
	roots.push(path);
	return path;
}

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

function jwt(payload: Record<string, unknown>): string {
	const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.${encode({ signature: "unused" })}`;
}

/** In-memory `HomeReader` so fixtures never touch the real home. */
function sandbox(): HomeReader & { write(relativePath: string, content: string): void } {
	const files = new Map<string, string>();
	return {
		home: "/sandbox",
		async read(relativePath) {
			return files.get(relativePath);
		},
		write(relativePath, content) {
			files.set(relativePath, `${content}\n`);
		},
	};
}

function emptyKeyring(): ClaudeKeyring {
	return {
		async listServices() {
			return [];
		},
		async read() {
			return undefined;
		},
	};
}

describe("import claude", () => {
	test("imports the file login with refresh token, plan and organisation", async () => {
		const home = await temporaryHome();
		const reader = sandbox();
		reader.write(
			".claude/.credentials.json",
			JSON.stringify({
				claudeAiOauth: {
					accessToken: "claude-access",
					refreshToken: "claude-refresh",
					refreshTokenExpiresAt: 2_000_000_000_000,
					expiresAt: 1_900_000_000_000,
					subscriptionType: "max",
					scopes: ["user:read", "user:write"],
				},
				organizationUuid: "org-123",
			}),
		);
		const store = new FileCredentialStore(home);
		await importClaudeAccount(store, "work", { home, homeReader: reader, keyring: emptyKeyring() }, "anthropic");
		const account = await store.readAccount("anthropic:work");
		expect(account?.slots.oauth).toEqual({
			type: "oauth",
			access: "claude-access",
			refresh: "claude-refresh",
			expires: 1_900_000_000_000,
		});
		expect(account?.metadata).toMatchObject({ source: ".claude/.credentials.json", account: "org-123", plan: "max" });
		expect(account?.auth).toEqual({ scopes: ["user:read", "user:write"], refreshExpiresAt: 2_000_000_000_000 });
	});

	test("falls back to a macOS keychain item when there is no credentials file", async () => {
		const home = await temporaryHome();
		const service = `${CLAUDE_CREDENTIALS_SERVICE_PREFIX}-abc123`;
		const keyring: ClaudeKeyring = {
			async listServices() {
				return [service, "Some Other App", `${CLAUDE_CREDENTIALS_SERVICE_PREFIX}-def456`];
			},
			async read(name) {
				return name === service
					? JSON.stringify({
							claudeAiOauth: { accessToken: "kc-access", refreshToken: "kc-refresh", expiresAt: 1_900_000_000_000 },
						})
					: undefined;
			},
		};
		const store = new FileCredentialStore(home);
		await importClaudeAccount(store, "main", { home, homeReader: sandbox(), keyring }, "anthropic");
		const account = await store.readAccount("anthropic:main");
		expect(account?.slots.oauth).toEqual({
			type: "oauth",
			access: "kc-access",
			refresh: "kc-refresh",
			expires: 1_900_000_000_000,
		});
		expect(account?.metadata?.source).toBe(`${CLAUDE_CREDENTIALS_SERVICE_PREFIX}-abc123`);
	});

	test("rejects a login without a refresh token (cannot self-heal)", async () => {
		const home = await temporaryHome();
		const reader = sandbox();
		reader.write(
			".claude/.credentials.json",
			JSON.stringify({ claudeAiOauth: { accessToken: "claude-access", expiresAt: 1_900_000_000_000 } }),
		);
		const store = new FileCredentialStore(home);
		await expect(
			importClaudeAccount(store, "work", { home, homeReader: reader, keyring: emptyKeyring() }, "anthropic"),
		).rejects.toThrow(/no refresh token/);
		expect(await store.listAccounts()).toHaveLength(0);
	});

	test("rejects malformed JSON and an absent login without writing anything", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		await expect(
			importClaudeAccount(store, "work", { home, homeReader: sandbox(), keyring: emptyKeyring() }, "anthropic"),
		).rejects.toThrow(/No Claude Code login/);
		expect(await store.listAccounts()).toHaveLength(0);
	});
});

describe("import codex", () => {
	const codexFixture = {
		tokens: {
			access_token: jwt({
				exp: 2_000_000_000,
				"https://api.openai.com/auth": { chatgpt_plan_type: "pro", chatgpt_account_id: "acct-123" },
			}),
			id_token: jwt({ email: "dev@example.com", "https://api.openai.com/auth": { chatgpt_plan_type: "pro" } }),
			refresh_token: "codex-refresh",
			account_id: "acct-file",
		},
		auth_mode: "chatgpt",
		last_refresh: "2026-01-01T00:00:00Z",
		OPENAI_API_KEY: "sk-test-key",
	};

	test("imports the OAuth triad as an openai-codex account with the pi account id", async () => {
		const home = await temporaryHome();
		const reader = sandbox();
		reader.write(".codex/auth.json", JSON.stringify(codexFixture));
		const store = new FileCredentialStore(home);
		await importCodexAccount(store, "work", reader, "openai-codex", "openai");
		const account = await store.readAccount("openai-codex:work");
		expect(account?.slots.oauth).toEqual({
			type: "oauth",
			access: codexFixture.tokens.access_token,
			refresh: "codex-refresh",
			expires: 2_000_000_000_000,
			accountId: "acct-123",
		});
		expect(account?.metadata).toMatchObject({
			source: "codex-auth-json",
			plan: "pro",
			account: "dev@example.com",
			auth_mode: "chatgpt",
			ownership: "df-owned",
			importedFrom: "codex",
			sync: "machine-only",
		});
		const credential = await store.forAccount("openai-codex", "work").read("openai-codex");
		expect((credential as OAuthCredential).accountId).toBe("acct-123");
		expect(account?.auth).toEqual({ scopes: [] });
	});

	test("falls back to importing OPENAI_API_KEY as a metered api_key account", async () => {
		const home = await temporaryHome();
		const reader = sandbox();
		reader.write(".codex/auth.json", JSON.stringify({ OPENAI_API_KEY: "sk-xyz" }));
		const store = new FileCredentialStore(home);
		await importCodexAccount(store, "metered", reader, "openai-codex", "openai");
		const account = await store.readAccount("openai:metered");
		expect(account?.slots.api_key).toEqual({ type: "api_key", value: "sk-xyz" });
		expect(account?.metadata?.plan).toBe("metered_api_key");
	});

	test("rejects missing refresh token / missing expiry / absent login", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		const noRefresh = { ...codexFixture, tokens: { ...codexFixture.tokens, refresh_token: undefined } };
		const refresh = sandbox();
		refresh.write(".codex/auth.json", JSON.stringify(noRefresh));
		await expect(importCodexAccount(store, "work", refresh, "openai-codex", "openai")).rejects.toThrow(
			/no refresh token/,
		);

		const noExp = sandbox();
		noExp.write(
			".codex/auth.json",
			JSON.stringify({ tokens: { access_token: jwt({ "https://api.openai.com/auth": {} }), refresh_token: "r" } }),
		);
		await expect(importCodexAccount(store, "work", noExp, "openai-codex", "openai")).rejects.toThrow(/no valid exp/);

		await expect(importCodexAccount(store, "work", sandbox(), "openai-codex", "openai")).rejects.toThrow(
			/No Codex login/,
		);
		expect(await store.listAccounts()).toHaveLength(0);
	});

	test("rejects malformed auth.json", async () => {
		const home = await temporaryHome();
		const reader = sandbox();
		reader.write(".codex/auth.json", "[[broken");
		const store = new FileCredentialStore(home);
		await expect(importCodexAccount(store, "work", reader, "openai-codex", "openai")).rejects.toThrow(
			/Invalid JSON.*codex/,
		);
	});
});

describe("import grok", () => {
	const entry = {
		key: jwt({ exp: 2_000_000_000, scope: "openid email grok-cli:access" }),
		refresh_token: "grok-refresh",
		email: "dev@example.com",
		expires_at: "2026-01-01T00:00:00Z",
	};

	test("imports the first entry of ~/.grok/auth.json keyed <issuer>::<client id>", async () => {
		const home = await temporaryHome();
		const reader = sandbox();
		reader.write(
			".grok/auth.json",
			JSON.stringify({
				"https://issuer.example::client-a": entry,
				"https://issuer.example::client-b": { ...entry, key: "second" },
			}),
		);
		const store = new FileCredentialStore(home);
		await importGrokAccount(store, "main", reader, "grok-sub");
		const account = await store.readAccount("grok-sub:main");
		expect(account?.slots.oauth).toEqual({
			type: "oauth",
			access: entry.key,
			refresh: "grok-refresh",
			expires: Date.parse("2026-01-01T00:00:00Z"),
		});
		expect(account?.metadata).toMatchObject({
			account: "dev@example.com",
			issuer: "https://issuer.example",
			source: "grok-auth-json",
		});
		expect(account?.auth).toEqual({ scopes: ["openid", "email", "grok-cli:access"] });
	});

	test("derives expiry from the JWT exp when expires_at is absent", async () => {
		const home = await temporaryHome();
		const { expires_at, ...withoutExpiresAt } = entry;
		const reader = sandbox();
		reader.write(".grok/auth.json", JSON.stringify({ "issuer::client": withoutExpiresAt }));
		const store = new FileCredentialStore(home);
		await importGrokAccount(store, "main", reader, "grok-sub");
		const account = await store.readAccount("grok-sub:main");
		expect((account?.slots.oauth as { expires: number } | undefined)?.expires).toBe(2_000_000_000_000);
	});

	test("rejects missing refresh, malformed JSON and an absent login", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		const { refresh_token, ...noRefresh } = entry;
		const reader = sandbox();
		reader.write(".grok/auth.json", JSON.stringify({ "issuer::client": noRefresh }));
		await expect(importGrokAccount(store, "main", reader, "grok-sub")).rejects.toThrow(/no refresh token/);
		await expect(importGrokAccount(store, "main", sandbox(), "grok-sub")).rejects.toThrow(/No Grok CLI login/);
		const empty = sandbox();
		empty.write(".grok/auth.json", JSON.stringify({}));
		await expect(importGrokAccount(store, "main", empty, "grok-sub")).rejects.toThrow(/No Grok CLI login/);
		expect(await store.listAccounts()).toHaveLength(0);
	});
});

describe("import kimi and antigravity", () => {
	test("imports Kimi Code's rotating OAuth file and normalizes seconds", async () => {
		const home = await temporaryHome();
		const reader = sandbox();
		reader.write(
			".kimi-code/credentials/kimi-code.json",
			JSON.stringify({
				access_token: "kimi-access",
				refresh_token: "kimi-refresh",
				expires_at: 2_000_000_000,
				scope: "openid",
			}),
		);
		const store = new FileCredentialStore(home);
		await importKimiAccount(store, "main", reader, "kimi-coding", ".kimi-code/credentials/kimi-code.json");
		expect(await store.getSlot("kimi-coding", "main", "oauth")).toEqual({
			type: "oauth",
			access: "kimi-access",
			refresh: "kimi-refresh",
			expires: 2_000_000_000_000,
		});
		const kimiAccount = await store.readAccount("kimi-coding:main");
		expect(kimiAccount?.metadata).toMatchObject({ source: "kimi-code-credentials" });
		expect(kimiAccount?.auth).toEqual({ scopes: ["openid"] });
	});

	test("fills the bare Antigravity project slot from loadCodeAssist", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		const raw = JSON.stringify({
			token: { access_token: "agy-access", refresh_token: "agy-refresh", expiry: "2030-01-01T00:00:00Z" },
		});
		await importAntigravityAccount(
			store,
			"main",
			{ read: async () => raw },
			"google-antigravity",
			"gemini",
			"antigravity",
			async (input, init) => {
				expect(String(input)).toEndWith(":loadCodeAssist");
				expect(new Headers(init?.headers).get("authorization")).toBe("Bearer agy-access");
				return Response.json({ cloudaicompanionProject: "projects/project-bare" });
			},
		);
		expect(await store.getSlot("google-antigravity", "main", "x-antigravity-project")).toEqual({
			type: "header",
			value: "project-bare",
		});
		expect((await store.readAccount("google-antigravity:main"))?.metadata).toMatchObject({
			ownership: "df-owned",
			importedFrom: "antigravity",
			sync: "machine-only",
		});
	});

	test("rejects malformed Kimi and project discovery responses without an account", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		const reader = sandbox();
		reader.write(".kimi-code/credentials/kimi-code.json", JSON.stringify({ access_token: "only-access" }));
		await expect(
			importKimiAccount(store, "main", reader, "kimi-coding", ".kimi-code/credentials/kimi-code.json"),
		).rejects.toThrow(/incomplete/);
		const raw = JSON.stringify({
			token: { access_token: "agy-access", refresh_token: "agy-refresh", expiry: "2030-01-01T00:00:00Z" },
		});
		await expect(
			importAntigravityAccount(
				store,
				"main",
				{ read: async () => raw },
				"google-antigravity",
				"gemini",
				"antigravity",
				async () => Response.json({}),
			),
		).rejects.toThrow(/cloudaicompanionProject/);
		expect(await store.listAccounts()).toHaveLength(0);
	});
});
