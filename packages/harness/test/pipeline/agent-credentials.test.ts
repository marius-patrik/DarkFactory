import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Attempt } from "../../src/install/harness-registry.ts";
import { REGISTRY } from "../../src/install/harness-registry.ts";
import {
	credentialEnv,
	finishDfLoginFiles,
	finishLoginFile,
	prepareLoginFile,
	reportingTokenPersistence,
	snapshotDfLoginFiles,
} from "../../src/pipeline/agent-credentials.ts";

let home = "";

/** The claude harness, which declares two credential names and three accounts. */
const claude = REGISTRY.claude as NonNullable<typeof REGISTRY.claude>;
/** The codex harness, which authenticates from a login file rather than the environment. */
const codex = REGISTRY.codex as NonNullable<typeof REGISTRY.codex>;

/** The base the ladder derives every attempt's environment from. */
function baseEnv(extra: Record<string, string | undefined> = {}): Record<string, string | undefined> {
	return { HOME: home, ...extra };
}

/** Record every rotated secret the port is asked to write, instead of writing one. */
function recorder(): { persist: (secret: string, value: string) => boolean; written: Array<[string, string]> } {
	const written: Array<[string, string]> = [];
	const persist = (secret: string, value: string): boolean => {
		written.push([secret, value]);
		return true;
	};
	return { persist, written };
}

beforeEach(() => {
	home = mkdtempSync(join(tmpdir(), "df-agent-credentials-"));
});

afterEach(() => {
	rmSync(home, { recursive: true, force: true });
});

describe("credentialEnv", () => {
	test("a harness declaring no auth runs with the environment it was given", async () => {
		// `df` reads its own accounts from DF_HOME, so its environment is the run's environment.
		const df = REGISTRY.df as NonNullable<typeof REGISTRY.df>;
		const env = await credentialEnv(
			{ base: baseEnv({ GEMINI_API_KEY: "key-abcdefgh" }), live: {} },
			{ harness: df, account: 1 },
			() => true,
		);

		expect(env.GEMINI_API_KEY).toBe("key-abcdefgh");
	});

	test("every other account's credential is cleared, not merely unused", async () => {
		const { persist } = recorder();
		const base = baseEnv({
			CLAUDE_CODE_OAUTH_TOKEN: "first-account-token",
			CLAUDE_CODE_OAUTH_TOKEN_2: "second-account-token",
			ANTHROPIC_API_KEY_2: "an-alternative-for-account-two",
		});

		const first = await credentialEnv({ base, live: { ...base } }, { harness: claude, account: 1 }, persist);
		const second = await credentialEnv({ base, live: { ...base } }, { harness: claude, account: 2 }, persist);

		expect(first.CLAUDE_CODE_OAUTH_TOKEN).toBe("first-account-token");
		expect(first.CLAUDE_CODE_OAUTH_TOKEN_2).toBeUndefined();
		expect(first.ANTHROPIC_API_KEY_2).toBeUndefined();

		// Account two's secret arrives under the name the CLI actually reads, and account one's is gone:
		// a leftover key is how a rotation silently authenticates as the account it was leaving.
		expect(second.CLAUDE_CODE_OAUTH_TOKEN).toBe("second-account-token");
		expect(second.CLAUDE_CODE_OAUTH_TOKEN_2).toBeUndefined();
		expect(second.ANTHROPIC_API_KEY_2).toBeUndefined();
	});

	test("the alternative a credential was found under is the name it is exported as", async () => {
		const { persist } = recorder();
		const base = baseEnv({ ANTHROPIC_API_KEY: "a-billing-key" });

		const env = await credentialEnv({ base, live: { ...base } }, { harness: claude, account: 1 }, persist);

		// The claude CLI prefers ANTHROPIC_API_KEY, so exporting a subscription token there as well
		// failed every run with "401 API key is invalid".
		expect(env.ANTHROPIC_API_KEY).toBe("a-billing-key");
		expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
	});

	test("a subscription login suppresses the static credential for the same attempt", async () => {
		const { persist } = recorder();
		const base = baseEnv({ OPENAI_API_KEY: "key-abcdefgh", CODEX_AUTH_JSON: '{"tokens":{}}' });

		const env = await credentialEnv({ base, live: { ...base } }, { harness: codex, account: 1 }, persist);

		// codex reads the login file and never the API-key name; handing it both lets it pick the wrong
		// one and the rotation achieves nothing.
		expect(env.OPENAI_API_KEY).toBeUndefined();
		expect(env.CODEX_AUTH_JSON).toBeUndefined();
	});
});

describe("the subscription login file", () => {
	test("it is written from its secret, and removed once the attempt is over", () => {
		const { persist, written } = recorder();
		const attempt: Attempt = { harness: codex, account: 1 };
		const base = baseEnv({ CODEX_AUTH_JSON: '{"tokens":{"access_token":"abc"}}' });

		const state = prepareLoginFile(base, attempt);
		expect(state?.path).toBe(join(home, ".codex", "auth.json"));
		expect(readFileSync(state?.path as string, "utf8")).toBe('{"tokens":{"access_token":"abc"}}');

		finishLoginFile(state, persist);
		// The secret is not left on disk for the next thing in the container to read.
		expect(existsSync(state?.path as string)).toBe(false);
		expect(written).toEqual([]);
	});

	test("a harness without a login file, or a secret that is unset, materialises nothing", () => {
		const { persist } = recorder();
		expect(prepareLoginFile(baseEnv(), { harness: claude, account: 1 })).toBeUndefined();
		expect(prepareLoginFile(baseEnv(), { harness: codex, account: 1 })).toBeUndefined();
		expect(finishLoginFile(undefined, persist)).toBeUndefined();
	});

	test("a login the CLI rewrote is written back to the secret it came from", () => {
		const { persist, written } = recorder();
		const attempt: Attempt = { harness: codex, account: 1 };
		const state = prepareLoginFile(baseEnv({ CODEX_AUTH_JSON: '{"tokens":{"access_token":"old"}}' }), attempt);
		// The CLI refreshed its subscription and rewrote the file while it ran.
		writeFileSync(state?.path as string, '{"tokens":{"access_token":"new"}}');

		finishLoginFile(state, persist);

		// A rotating provider invalidates the old token as it issues the new one, so a run that exchanges
		// and forgets has spent the credential: this run works and every run afterwards fails.
		expect(written).toEqual([["CODEX_AUTH_JSON", '{"tokens":{"access_token":"new"}}']]);
	});

	test("a login the CLI left alone is not written back", () => {
		const { persist, written } = recorder();
		const state = prepareLoginFile(baseEnv({ CODEX_AUTH_JSON: "unchanged" }), { harness: codex, account: 1 });

		finishLoginFile(state, persist);

		expect(written).toEqual([]);
	});

	test("a login the CLI deleted is not treated as a rotation", () => {
		const { persist, written } = recorder();
		const state = prepareLoginFile(baseEnv({ CODEX_AUTH_JSON: "unchanged" }), { harness: codex, account: 1 });
		rmSync(state?.path as string);

		finishLoginFile(state, persist);

		// It simply left nothing behind; there is no new value to persist.
		expect(written).toEqual([]);
	});
});

describe("df's own account records", () => {
	/** A df credentials store holding one of the accounts the setup step loads. */
	function dfHome(accounts: Record<string, unknown>): string {
		const dir = join(home, "df");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "credentials.json"), JSON.stringify({ accounts }));
		return dir;
	}

	test("a record the store holds is snapshotted, and an unloaded one is read from its secret", () => {
		const dir = dfHome({ "openai-codex:pipeline": { tokens: { access_token: "stored" } } });
		const env = baseEnv({
			DF_HOME: dir,
			DF_ACCOUNT_OPENAI_CODEX: '{"tokens":{"access_token":"from-the-secret"}}',
			DF_ACCOUNT_GROK_SUB: "not json at all",
		});

		const states = snapshotDfLoginFiles(env);

		expect(states).toEqual([
			{
				account: "openai-codex:pipeline",
				secret: "DF_ACCOUNT_OPENAI_CODEX",
				original: { tokens: { access_token: "stored" } },
			},
			{ account: "grok-sub:pipeline", secret: "DF_ACCOUNT_GROK_SUB", original: "not json at all" },
		]);
	});

	test("a record df refreshed during the run is written back to its secret", () => {
		const dir = dfHome({ "openai-codex:pipeline": { tokens: { access_token: "stored" } } });
		const env = baseEnv({ DF_HOME: dir, DF_ACCOUNT_OPENAI_CODEX: '{"tokens":{"access_token":"stored"}}' });
		const states = snapshotDfLoginFiles(env);
		// df refreshed the OAuth token into its own store while the attempt ran, and the process
		// environment it was launched with still holds the old one.
		writeFileSync(
			join(dir, "credentials.json"),
			JSON.stringify({ accounts: { "openai-codex:pipeline": { tokens: { access_token: "refreshed" } } } }),
		);
		const { persist, written } = recorder();
		const reported: string[] = [];

		finishDfLoginFiles(states, env, persist, (message) => reported.push(message));

		expect(written).toEqual([["DF_ACCOUNT_OPENAI_CODEX", '{"tokens":{"access_token":"refreshed"}}']]);
		expect(reported).toEqual(["Rotated df account openai-codex:pipeline written back to DF_ACCOUNT_OPENAI_CODEX."]);
	});

	test("an unchanged record, an unloaded account and a removed account are all left alone", () => {
		const dir = dfHome({ "openai-codex:pipeline": { tokens: { access_token: "same" } } });
		const env = baseEnv({ DF_HOME: dir, DF_ACCOUNT_OPENAI_CODEX: '{"tokens":{"access_token":"same"}}' });
		const states = snapshotDfLoginFiles(env);
		const { persist, written } = recorder();
		const reported: string[] = [];

		finishDfLoginFiles(states, env, persist, (message) => reported.push(message));

		expect(written).toEqual([]);
		expect(reported).toEqual([]);
	});

	test("with no DF_HOME there is nothing to snapshot and nothing to write back", () => {
		const { persist, written } = recorder();
		const states = snapshotDfLoginFiles(baseEnv({ DF_ACCOUNT_OPENAI_CODEX: "{}" }));

		// The store is the authority when it holds a record and the secret is the fallback; with neither
		// there is nothing, and an account is not invented from an unset variable.
		expect(states).toEqual([
			{ account: "openai-codex:pipeline", secret: "DF_ACCOUNT_OPENAI_CODEX", original: {} },
			{ account: "grok-sub:pipeline", secret: "DF_ACCOUNT_GROK_SUB", original: "" },
		]);
		finishDfLoginFiles(states, baseEnv(), persist, () => {});
		expect(written).toEqual([]);
	});
});

describe("reportingTokenPersistence", () => {
	test("a rotation that cannot be written back is said out loud, not dropped", () => {
		const reported: string[] = [];
		const persist = reportingTokenPersistence("", (message) => reported.push(message));

		expect(persist("ANTIGRAVITY_REFRESH_TOKEN", "rotated-value")).toBe(false);
		expect(reported).toEqual([
			"ANTIGRAVITY_REFRESH_TOKEN was rotated but GITHUB_REPOSITORY is unset, so it cannot be " +
				"written back; the next run will fail to authenticate.",
		]);
	});

	test("with a repository but no store wired in, the reason is still named", () => {
		const reported: string[] = [];
		const persist = reportingTokenPersistence("marius-patrik/DarkFactory", (message) => reported.push(message));

		expect(persist("CODEX_AUTH_JSON", "rotated")).toBe(false);
		expect(reported).toEqual([
			"CODEX_AUTH_JSON was rotated but could not be written back (no secret store is wired into " +
				"the agent prompt runner); the next run will fail to authenticate.",
		]);
	});
});
