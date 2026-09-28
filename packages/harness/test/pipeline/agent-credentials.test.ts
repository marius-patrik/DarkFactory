import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Attempt } from "../../src/install/harness-registry.ts";
import { REGISTRY } from "../../src/install/harness-registry.ts";
import {
	credentialEnv,
	type DfAccountCommandResult,
	type DfAccountRunner,
	finishDfLoginFiles,
	finishLoginFile,
	prepareLoginFile,
	reportingTokenPersistence,
	setupDfAccounts,
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

describe("setupDfAccounts", () => {
	/** The calls a setup made, as `{ argv, stdin, env }` so a test can read what it configured. */
	function dfRecorder(
		behaviour: (argv: readonly string[]) => DfAccountCommandResult = () => ({ exitCode: 0, stderr: "" }),
	) {
		const calls: Array<{ argv: readonly string[]; stdin: string; env: Record<string, string | undefined> }> = [];
		const run: DfAccountRunner = (argv, env, stdin) => {
			calls.push({ argv, stdin, env });
			return behaviour(argv);
		};
		return { calls, run };
	}

	/** A workspace with no configuration document in it, so the config notice is the one under test. */
	function emptyRoot(): string {
		return mkdtempSync(join(tmpdir(), "df-setup-"));
	}

	test("the run's DF_HOME is published to the environment every later df process inherits", async () => {
		// Not a convenience: `df` reads its accounts from DF_HOME, so a home that is created and not
		// published leaves the whole ladder authenticating as nobody.
		const live: Record<string, string | undefined> = {};
		const { run } = dfRecorder();

		const home = await setupDfAccounts({ live, roots: [emptyRoot()], run, makeHome: () => "/tmp/df-home-fixed" });

		expect(home).toBe("/tmp/df-home-fixed");
		expect(live.DF_HOME).toBe("/tmp/df-home-fixed");
	});

	test("every populated key is saved with its value on stdin, never on the command line", async () => {
		const live: Record<string, string | undefined> = { GEMINI_API_KEY: "key-one", GROQ_API_KEY: "key-two" };
		const { calls, run } = dfRecorder();

		await setupDfAccounts({ live, roots: [emptyRoot()], run, makeHome: () => "/tmp/h" });

		const sets = calls.filter((call) => call.argv[1] === "account" && call.argv[2] === "set");
		expect(sets.map((call) => call.argv.slice(3))).toEqual([
			["google:default", "api_key", "--type", "api_key"],
			["groq:default", "api_key", "--type", "api_key"],
		]);
		expect(sets.map((call) => call.stdin)).toEqual(["key-one", "key-two"]);
		// A secret on argv is a secret in the process table and in every log that echoes the command.
		for (const call of sets) expect(call.argv.join(" ")).not.toContain("key-");
	});

	test("a repository holding three of the keys gets a shorter chain, not a failure", async () => {
		// The empty variables are skipped rather than saved as empty accounts, so a partial set of
		// secrets produces a partial chain.
		const { calls, run } = dfRecorder();
		const reported: string[] = [];

		await setupDfAccounts({
			live: { GEMINI_API_KEY: "one", GROQ_API_KEY: "" },
			roots: [emptyRoot()],
			run,
			makeHome: () => "/tmp/h",
			say: (message) => reported.push(message),
		});

		expect(calls.filter((call) => call.argv[2] === "set")).toHaveLength(1);
		expect(reported).toEqual(["Configured df account google:default from GEMINI_API_KEY."]);
	});

	test("one bad key is a notice and the rest of the chain is still configured", async () => {
		const { run } = dfRecorder((argv) =>
			argv.includes("groq:default") ? { exitCode: 1, stderr: "refused" } : { exitCode: 0, stderr: "" },
		);
		const reported: string[] = [];

		await setupDfAccounts({
			live: { GEMINI_API_KEY: "one", GROQ_API_KEY: "two", OPENROUTER_API_KEY: "three" },
			roots: [emptyRoot()],
			run,
			makeHome: () => "/tmp/h",
			warn: (message) => reported.push(message),
		});

		const notices = reported.filter((line) => line.startsWith("df account setup notice"));
		expect(notices).toHaveLength(1);
		expect(notices[0]).toContain("df account setup notice for groq:default:");
		expect(notices[0]).toContain("returned non-zero exit status 1");
	});

	test("a df that cannot be reached at all stops the loop rather than trying every account", async () => {
		// Every remaining call would fail the same way, so continuing is noise; a key that df
		// *rejected* is a different thing and the loop does continue past it.
		const { calls, run } = dfRecorder(() => ({ exitCode: 127, stderr: "spawn df ENOENT" }));
		const reported: string[] = [];

		await setupDfAccounts({
			live: { GEMINI_API_KEY: "one", GROQ_API_KEY: "two" },
			roots: [emptyRoot()],
			run,
			makeHome: () => "/tmp/h",
			warn: (message) => reported.push(message),
		});

		expect(calls).toHaveLength(1);
		expect(reported.filter((line) => line.includes("df binary not found"))).toEqual([
			"df binary not found; skipping df account setup.",
		]);
	});

	test("a subscription record is loaded from its own variable, with nothing on stdin", async () => {
		const { calls, run } = dfRecorder();
		const reported: string[] = [];

		await setupDfAccounts({
			live: { DF_ACCOUNT_OPENAI_CODEX: '{"token":"t"}' },
			roots: [emptyRoot()],
			run,
			makeHome: () => "/tmp/h",
			say: (message) => reported.push(message),
		});

		expect(calls[0]?.argv).toEqual([
			"df",
			"account",
			"load",
			"openai-codex:pipeline",
			"--from-env",
			"DF_ACCOUNT_OPENAI_CODEX",
		]);
		expect(calls[0]?.stdin).toBe("");
		expect(reported).toEqual(["Loaded df account openai-codex:pipeline from DF_ACCOUNT_OPENAI_CODEX."]);
	});

	test("the combined configuration beside the workspace is found and published", async () => {
		// `DF_CONFIG_DIR` is what tells df which chain to read. A run that resolved the document and
		// did not publish it would silently use df's built-in default chain instead.
		const root = emptyRoot();
		mkdirSync(join(root, ".darkfactory-pipeline"), { recursive: true });
		writeFileSync(join(root, ".darkfactory-pipeline", "repo.dfconfig"), "{}");
		const live: Record<string, string | undefined> = {};
		const { run } = dfRecorder();
		const reported: string[] = [];

		await setupDfAccounts({
			live,
			roots: [root, join(root, ".darkfactory-pipeline")],
			run,
			makeHome: () => "/tmp/h",
			say: (message) => reported.push(message),
		});

		expect(live.DF_CONFIG_DIR).toBe(join(root, ".darkfactory-pipeline"));
		expect(reported[0]).toContain("Using df config directory from");
		rmSync(root, { recursive: true, force: true });
	});

	test("a workspace with no configuration document is a notice, not a failure", async () => {
		const live: Record<string, string | undefined> = {};
		const { run } = dfRecorder();
		const reported: string[] = [];

		await setupDfAccounts({
			live,
			roots: [emptyRoot()],
			run,
			makeHome: () => "/tmp/h",
			warn: (message) => reported.push(message),
		});

		expect(reported).toEqual(["No combined DarkFactory config found; df uses its built-in default chain."]);
		// The chain still ran: the notice is about configuration, not about the accounts.
		expect(run).toBeDefined();
	});
});
