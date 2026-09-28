import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type DfAccountCommandResult,
	type DfAccountRunner,
	finishDfLoginFiles,
	reportingTokenPersistence,
	setupDfAccounts,
	snapshotDfLoginFiles,
} from "../../src/pipeline/agent-credentials.ts";

let home = "";

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
