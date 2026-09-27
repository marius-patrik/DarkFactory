import { describe, expect, test } from "bun:test";
import {
	type Auth,
	accountsFor,
	attemptLabel,
	authCompanionNames,
	authCredentialNames,
	authEnvNames,
	authSecretNames,
	buildArgv,
	configuredOrder,
	credentialEnvNames,
	credentials,
	credentialsFor,
	describeChain,
	getHarness,
	type Harness,
	type HarnessEnv,
	KIND,
	MODEL,
	ORDER,
	PROMPT,
	PROMPT_FILE,
	REGISTRY,
	resolveAttempts,
	TIMEOUT,
} from "../../src/install/harness-registry.ts";

/**
 * One registered harness, by name.
 *
 * The registry is a record, so every lookup is optional; naming the harness that is being asserted
 * about is clearer than a cast at each use and fails loudly if a harness is ever removed.
 */
function harness(name: string): Harness {
	const declared = REGISTRY[name];
	if (!declared) throw new Error(`no harness named ${name} in the registry`);
	return declared;
}

/** One harness's credential declaration. */
function auth(name: string): Auth {
	const declared = harness(name).auth;
	if (!declared) throw new Error(`harness ${name} declares no credential`);
	return declared;
}

/** A PATH where every binary resolves, so a test exercises the ladder rather than the machine. */
const present: (binary: string) => string | null = (binary) => `/usr/bin/${binary}`;
const absent: () => null = () => null;
const quiet: () => void = () => {};

const claude = harness("claude");
const codex = harness("codex");

describe("the declared registry", () => {
	test("df is the only harness in the default chain", () => {
		// The pipeline runs df as its only agent harness. The external CLIs stay registered but out
		// of the chain: they are not installed in the image, and `agent.yml` forwards neither
		// override, so they cannot be re-enabled in DarkFactory's own workflows.
		expect(ORDER).toEqual(["df"]);
	});

	test("df declares no credential, because it reads its own accounts from DF_HOME", () => {
		expect(REGISTRY.df?.auth).toBeUndefined();
	});

	test("df's argv is exactly what the runner has always sent", () => {
		expect(buildArgv(harness("df"), { prompt: "do it", timeout: "5m0s", promptFile: "/tmp/p.md" })).toEqual([
			"df",
			"run",
			"--json",
			"--prompt-file",
			"/tmp/p.md",
			"--timeout",
			"5m0s",
		]);
	});

	test("the prompt travels by file, so a long prompt meets no argument-length limit", () => {
		const withFile = buildArgv(harness("df"), { prompt: "long", timeout: "1m0s", promptFile: "/tmp/p.md" });
		const withoutFile = buildArgv(harness("df"), { prompt: "long", timeout: "1m0s" });
		expect(withFile).toContain("/tmp/p.md");
		expect(withoutFile).toContain("long");
	});

	test("every registered harness names a binary and a template", () => {
		for (const [name, harness] of Object.entries(REGISTRY)) {
			expect(harness.binary, name).not.toBe("");
			expect(harness.template.length, name).toBeGreaterThan(0);
			expect(harness.name, name).toBe(name);
		}
	});

	test("a harness declaring an OAuth exchange declares its companions and endpoint", () => {
		const antigravity = harness("antigravity");
		expect(antigravity.auth?.kind).toBe("oauth_refresh");
		expect(antigravity.auth?.tokenUrl).toBe("https://oauth2.googleapis.com/token");
		expect(antigravity.auth?.clientIdEnv).toBe("ANTIGRAVITY_CLIENT_ID");
		expect(antigravity.auth?.clientSecretEnv).toBe("ANTIGRAVITY_CLIENT_SECRET");
	});

	test("a login file is declared on the credential, beside the binary that needs it", () => {
		expect(codex.auth?.loginFile?.path).toBe(".codex/auth.json");
		expect(REGISTRY.kimi?.auth?.loginFile?.path).toBe(".kimi-code/credentials/kimi-code.json");
	});
});

describe("account naming", () => {
	test("the first account uses the declared names unchanged", () => {
		// Every repository configured before accounts existed keeps working with the secrets it
		// already holds.
		expect(authEnvNames(auth("claude"), 1)).toEqual(["CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY"]);
	});

	test("the nth account appends its number to each name", () => {
		expect(authEnvNames(auth("claude"), 2)).toEqual(["CLAUDE_CODE_OAUTH_TOKEN_2", "ANTHROPIC_API_KEY_2"]);
		expect(authCredentialNames(auth("codex"), 3)).toEqual(["OPENAI_API_KEY_3", "CODEX_AUTH_JSON_3"]);
	});

	test("the OAuth companions are numbered alongside", () => {
		expect(authCompanionNames(auth("antigravity"), 2)).toEqual([
			"ANTIGRAVITY_CLIENT_ID_2",
			"ANTIGRAVITY_CLIENT_SECRET_2",
		]);
	});

	test("the secret list is credentials then companions, account by account", () => {
		// The client id and secret authenticate on nothing of their own, so they stay out of the
		// credential list, but a workflow passing secrets by name has to pass them or the exchange
		// cannot be made.
		expect(authSecretNames(auth("antigravity"))).toEqual([
			"ANTIGRAVITY_REFRESH_TOKEN",
			"ANTIGRAVITY_CLIENT_ID",
			"ANTIGRAVITY_CLIENT_SECRET",
			"ANTIGRAVITY_REFRESH_TOKEN_2",
			"ANTIGRAVITY_CLIENT_ID_2",
			"ANTIGRAVITY_CLIENT_SECRET_2",
			"ANTIGRAVITY_REFRESH_TOKEN_3",
			"ANTIGRAVITY_CLIENT_ID_3",
			"ANTIGRAVITY_CLIENT_SECRET_3",
		]);
	});

	test("an alternative name satisfies the same need", () => {
		// Several providers accept either of two names, and expressing that was the only reason a
		// harness could not be described by a declaration.
		expect(credentialsFor(harness("kimi"), 1)).toEqual(["MOONSHOT_API_KEY", "KIMI_API_KEY", "KIMI_AUTH_JSON"]);
	});

	test("a harness naming no credential authenticates by other means", () => {
		expect(credentials(harness("df"))).toEqual([]);
		expect(accountsFor(harness("df"), {})).toEqual([1]);
	});
});

describe("which accounts actually exist", () => {
	test("one populated account is the only one reported", () => {
		// A repository holding one key behaves exactly as it did before accounts existed.
		expect(accountsFor(claude, { CLAUDE_CODE_OAUTH_TOKEN: "t" })).toEqual([1]);
	});

	test("an alternative name alone is enough", () => {
		expect(accountsFor(claude, { ANTHROPIC_API_KEY: "k" })).toEqual([1]);
	});

	test("a populated second account is reported alongside the first", () => {
		const env = { CLAUDE_CODE_OAUTH_TOKEN: "t", ANTHROPIC_API_KEY: "k2", CLAUDE_CODE_OAUTH_TOKEN_2: "t2" };
		expect(accountsFor(claude, env)).toEqual([1, 2]);
	});

	test("another provider's key is not this provider's credential", () => {
		expect(accountsFor(claude, { GEMINI_API_KEY_2: "g2" })).toEqual([]);
	});

	test("a login file is a credential", () => {
		expect(accountsFor(codex, { CODEX_AUTH_JSON: "{}" })).toEqual([1]);
	});

	test("a second account is reported when only the second is populated", () => {
		// The first account's key being absent is not a reason to renumber: the credential names
		// are what identify the account, and the runner pays with whichever ones exist.
		expect(accountsFor(codex, { OPENAI_API_KEY_2: "k2" })).toEqual([2]);
	});

	test("an explicit credential override names one account only", () => {
		// A person writing the override is describing the credential they hold, not a fleet of them.
		const overridden: Harness = { ...claude, envKeys: ["MY_KEY"] };
		expect(accountsFor(overridden, { MY_KEY: "k" })).toEqual([1]);
		expect(accountsFor(overridden, { MY_KEY_2: "k" })).toEqual([]);
		expect(credentialsFor(overridden, 2)).toEqual([]);
	});
});

describe("the secret names the chain can use", () => {
	test("are empty, because df is the only chained harness and declares no credential", () => {
		// This is the list that used to be spelled out in three places with nothing keeping them
		// equal, and a workflow that forgets a name does not fail - it silently shortens the chain.
		expect(credentialEnvNames()).toEqual([]);
	});
});

describe("building argv", () => {
	test("the model is substituted when one is given", () => {
		expect(buildArgv(claude, { prompt: "do it", model: "opus-5", timeout: "5m0s" })).toEqual([
			"claude",
			"--print",
			"do it",
			"--model",
			"opus-5",
			"--output-format",
			"text",
			"--dangerously-skip-permissions",
		]);
	});

	test("the model and its flag are both dropped when none is given", () => {
		// A template can express an optional model without a second template, but only if the flag
		// goes with it - a bare `--model` would swallow the next argument.
		const argv = buildArgv(claude, { prompt: "do it", timeout: "5m0s" });
		expect(argv).toEqual(["claude", "--print", "do it", "--output-format", "text", "--dangerously-skip-permissions"]);
		expect(argv).not.toContain("--model");
	});

	test("the kind and its flag are both dropped when none is given", () => {
		const argv = buildArgv(harness("df"), { prompt: "do it", timeout: "5m0s" });
		expect(argv).not.toContain("--kind");
		expect(argv).toContain("--timeout");
	});

	test("a declared kind is forwarded", () => {
		const argv = buildArgv(harness("df"), {
			prompt: "do it",
			timeout: "5m0s",
			promptFile: "/tmp/p.md",
			kind: "review",
		});
		expect(argv.slice(argv.indexOf("--kind"), argv.indexOf("--kind") + 2)).toEqual(["--kind", "review"]);
	});

	test("the timeout is a Go duration", () => {
		const argv = buildArgv(harness("antigravity"), { prompt: "p", model: "m", timeout: "15m0s" });
		expect(argv.slice(argv.indexOf("--print-timeout"), argv.indexOf("--print-timeout") + 2)).toEqual([
			"--print-timeout",
			"15m0s",
		]);
	});

	test("extra arguments are appended verbatim, last", () => {
		const overridden: Harness = { ...claude, extraArgs: ["--add-dir", "/workspace"] };
		const argv = buildArgv(overridden, { prompt: "p", model: "m", timeout: "1m0s" });
		expect(argv.slice(-2)).toEqual(["--add-dir", "/workspace"]);
	});

	test("a trailing flag with no value is still passed", () => {
		const trailing: Harness = { ...claude, template: ["run", "--flag"], extraArgs: [] };
		expect(buildArgv(trailing, { prompt: "p", timeout: "1m0s" })).toEqual(["claude", "run", "--flag"]);
	});

	test("an empty template renders the binary alone", () => {
		const empty: Harness = { ...claude, template: [], extraArgs: [] };
		expect(buildArgv(empty, { prompt: "p", timeout: "1m0s" })).toEqual(["claude"]);
	});

	test("every placeholder is a template token, never a value", () => {
		// A placeholder that reached argv unresolved would be sent to the CLI as an argument.
		const argv = buildArgv(harness("df"), { prompt: "p", timeout: "1m0s" });
		for (const token of [PROMPT, MODEL, TIMEOUT, PROMPT_FILE, KIND]) expect(argv).not.toContain(token);
	});
});

describe("resolving the chain", () => {
	test("an unavailable binary is skipped rather than failed", () => {
		// One image can carry a subset of the registry.
		const notes: string[] = [];
		const attempts = resolveAttempts(undefined, { which: absent, log: (m) => notes.push(m) });
		expect(attempts).toEqual([]);
		expect(notes).toContain("Harness 'df' unavailable (df not on PATH); skipping.");
	});

	test("a harness with no credential is skipped, naming what is missing", () => {
		const notes: string[] = [];
		const attempts = resolveAttempts(undefined, {
			env: { AGENT_HARNESS_CHAIN: "claude" },
			which: present,
			log: (m) => notes.push(m),
		});
		expect(attempts).toEqual([]);
		expect(notes).toContain(
			"Harness 'claude' has no credentials in ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY']; skipping.",
		);
	});

	test("an unknown name in the chain is reported, not fatal", () => {
		const notes: string[] = [];
		resolveAttempts(undefined, {
			env: { AGENT_HARNESS_CHAIN: "mine" },
			which: present,
			log: (m) => notes.push(m),
		});
		expect(notes).toContain("Unknown harness 'mine' in chain; skipping.");
	});

	test("the account is the innermost rung, so a spent quota is answered by the same model", () => {
		// An exhausted account is not an exhausted harness, and falling through to another harness
		// while an unused account sits in the environment is the wrong move.
		const attempts = resolveAttempts(undefined, {
			env: {
				AGENT_HARNESS_CHAIN: "claude",
				CLAUDE_CODE_OAUTH_TOKEN: "t",
				CLAUDE_CODE_OAUTH_TOKEN_2: "t2",
			},
			which: present,
			log: quiet,
		});
		expect(attempts.map((a) => [a.model ?? null, a.account])).toEqual([
			["opus", 1],
			["opus", 2],
		]);
	});

	test("pools are quota moves, tried in declaration order", () => {
		// Antigravity's Gemini and Claude models bill separately, so exhausting one leaves the other.
		const attempts = resolveAttempts(undefined, {
			env: { AGENT_HARNESS_CHAIN: "antigravity", ANTIGRAVITY_REFRESH_TOKEN: "r" },
			which: present,
			log: quiet,
		});
		expect(attempts.map((a) => a.model)).toEqual(["gemini-3.8-flash-high", "claude-opus-4-6-thinking"]);
	});

	test("a configured model replaces the pools of the first available harness only", () => {
		const attempts = resolveAttempts("google/gemini", {
			env: {
				AGENT_HARNESS_CHAIN: "antigravity,claude",
				ANTIGRAVITY_REFRESH_TOKEN: "r",
				CLAUDE_CODE_OAUTH_TOKEN: "t",
			},
			which: present,
			log: quiet,
		});
		expect(attempts.map((a) => [a.harness.name, a.model])).toEqual([
			["antigravity", "google/gemini"],
			["claude", "opus"],
		]);
	});

	test("a harness with no pools is one attempt on its default model", () => {
		const attempts = resolveAttempts(undefined, {
			env: { AGENT_HARNESS_CHAIN: "kimi", MOONSHOT_API_KEY: "k" },
			which: present,
			log: quiet,
		});
		expect(attempts.map((a) => [a.harness.name, a.model ?? null])).toEqual([["kimi", null]]);
	});

	test("the attempt label names the account but never its credential", () => {
		const [first, second] = resolveAttempts(undefined, {
			env: {
				AGENT_HARNESS_CHAIN: "claude",
				CLAUDE_CODE_OAUTH_TOKEN: "t",
				CLAUDE_CODE_OAUTH_TOKEN_2: "t2",
			},
			which: present,
			log: quiet,
		});
		expect(attemptLabel(first as typeof first & object)).toBe("claude/opus");
		expect(attemptLabel(second as typeof second & object)).toBe("claude/opus (account 2)");
	});
});

describe("the chain order", () => {
	test("the environment overrides it, comma separated and trimmed", () => {
		expect(configuredOrder({ AGENT_HARNESS_CHAIN: " claude , codex " })).toEqual(["claude", "codex"]);
	});

	test("an empty environment falls back to the declared order", () => {
		expect(configuredOrder({})).toEqual(["df"]);
		expect(configuredOrder({ AGENT_HARNESS_CHAIN: "  " })).toEqual(["df"]);
	});

	test("a harness defined only in the configuration joins the default order", () => {
		const env: HarnessEnv = { AGENT_HARNESS_CONFIG: '{"mine":{"binary":"m","template":[]}}' };
		expect(configuredOrder(env)).toEqual(["df", "mine"]);
	});
});

describe("overriding a harness at runtime", () => {
	test("a flag rename is a configuration change, not a code change", () => {
		const env: HarnessEnv = {
			AGENT_HARNESS_CONFIG: '{"claude":{"binary":"claude2","pools":["opus-5"],"extra_args":["--add-dir","/w"]}}',
		};
		const harness = getHarness("claude", { env, log: quiet });
		expect(harness?.binary).toBe("claude2");
		expect(harness?.pools).toEqual(["opus-5"]);
		expect(harness?.extraArgs).toEqual(["--add-dir", "/w"]);
		// A field the override says nothing about keeps its compiled-in value.
		expect(harness?.template).toEqual(claude.template);
	});

	test("a harness unknown to the registry is usable if the override defines it", () => {
		// It may authenticate by means the registry has never heard of, and requiring a declaration
		// for it would defeat the point of the override.
		const env: HarnessEnv = { AGENT_HARNESS_CONFIG: '{"mine":{"binary":"m","template":["-p","{{PROMPT}}"]}}' };
		const declared = getHarness("mine", { env, log: quiet });
		expect(declared?.binary).toBe("m");
		expect(declared?.description).toBe("user-defined harness");
		if (!declared) throw new Error("an override naming a binary and a template defines the harness");
		expect(buildArgv(declared, { prompt: "p", timeout: "1m0s" })).toEqual(["m", "-p", "p"]);
	});

	test("an unknown name with an incomplete override is refused", () => {
		expect(
			getHarness("mine", { env: { AGENT_HARNESS_CONFIG: '{"mine":{"binary":"m"}}' }, log: quiet }),
		).toBeUndefined();
	});

	test.each([
		["malformed JSON", "{oops"],
		["an array", "[1,2]"],
		["a scalar", '"text"'],
	])("malformed configuration is reported and ignored: %s", (_label, raw) => {
		const notes: string[] = [];
		const harness = getHarness("claude", {
			env: { AGENT_HARNESS_CONFIG: raw },
			log: (m) => notes.push(m),
		});
		// A typo in a chain override should cost the tuning it was meant to apply, not the run.
		expect(harness?.binary).toBe("claude");
		expect(harness?.pools).toEqual(["opus"]);
	});

	test("a malformed field is ignored without discarding the rest", () => {
		const env: HarnessEnv = { AGENT_HARNESS_CONFIG: '{"claude":{"pools":"opus-5"}}' };
		expect(getHarness("claude", { env, log: quiet })?.pools).toEqual(["opus"]);
	});

	test("the override does not mutate the registry", () => {
		getHarness("claude", {
			env: { AGENT_HARNESS_CONFIG: '{"claude":{"binary":"claude2","pools":[]}}' },
			log: quiet,
		});
		expect(REGISTRY.claude?.binary).toBe("claude");
		expect(REGISTRY.claude?.pools).toEqual(["opus"]);
	});
});

describe("describing the chain", () => {
	test("names each harness, its binary, its model and its account", () => {
		const described = describeChain({
			env: { AGENT_HARNESS_CHAIN: "claude", CLAUDE_CODE_OAUTH_TOKEN: "t" },
			which: present,
			log: quiet,
		});
		expect(described).toBe("- `claude` (claude) model `opus`");
	});

	test("says plainly when nothing is usable", () => {
		expect(describeChain({ which: absent, log: quiet })).toBe(
			"No harness is available: no configured CLI is on PATH with credentials.",
		);
	});
});
