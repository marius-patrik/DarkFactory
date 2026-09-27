/** @packageDocumentation
 * The agent pipeline's adapter layer over coding-agent CLIs.
 *
 * The pipeline runs `df`, DarkFactory's own Bun harness, as its only agent harness: every agent call
 * goes through `df run`, which owns model choice and in-flight failover across its own chain. The
 * older external CLI entries below are kept registered - they are deleted with the Python pipeline -
 * but none of them is in the default chain, none is installed into the agent image, and `agent.yml`
 * forwards neither `AGENT_HARNESS_CHAIN` nor `AGENT_HARNESS_CONFIG`, so the removed CLIs cannot be
 * re-enabled in DarkFactory's own workflows.
 *
 * A harness is described declaratively - a binary, how to turn a prompt into an argv, and a model
 * fallback chain - so adding one is a data change and swapping one is a configuration change.
 *
 * Invocation shapes are the real, verified flags for each CLI, but CLIs move. Every field is
 * overridable at runtime through `AGENT_HARNESS_CONFIG` (a JSON object keyed by harness name), so a
 * flag rename never requires a code change or a container rebuild.
 *
 * @example
 * ```json
 * {
 *   "claude": { "pools": ["claude-opus-5"], "extra_args": ["--add-dir", "/workspace"] },
 *   "grok": { "binary": "grok-cli" }
 * }
 * ```
 *
 * Order comes from `AGENT_HARNESS_CHAIN` (comma-separated names, first wins). Harnesses whose binary
 * is absent from `PATH` are skipped rather than failed, so one image can carry a subset.
 */

/** Placeholder substituted with the prompt text when building argv. */
export const PROMPT = "{{PROMPT}}";

/** Placeholder substituted with the model id. Templates omitting it run the harness default. */
export const MODEL = "{{MODEL}}";

/** Placeholder substituted with the print-mode timeout, as a Go duration string such as `15m0s`. */
export const TIMEOUT = "{{TIMEOUT}}";

/**
 * Placeholder substituted with the path of a file holding the prompt text.
 *
 * Harnesses taking `--prompt-file` (`df`) receive the prompt by path rather than as an argv element,
 * so long prompts never meet an argument-length limit. The runner writes the file and passes its
 * path here.
 */
export const PROMPT_FILE = "{{PROMPT_FILE}}";

/**
 * Optional semantic task kind, passed only to harnesses whose template declares it.
 *
 * When omitted, df keeps its existing TypeScript inference path.
 */
export const KIND = "{{KIND}}";

/** A CLI subscription login stored in a file under HOME. */
export interface LoginFile {
	/** Environment variable holding a JSON document that populates the file. */
	env: string;
	/** Path of the file, relative to HOME. */
	path: string;
}

/** How a harness obtains a usable credential. */
export interface Auth {
	/**
	 * `static` when the environment already holds a usable credential, or `oauth_refresh` when it
	 * holds a *refresh* token to be exchanged first.
	 */
	kind: "static" | "oauth_refresh";
	/** Environment variable holding the primary credential. */
	env: string;
	/**
	 * How many accounts of this provider the pipeline can carry.
	 *
	 * Accounts are numbered: the first uses the declared names, and the *n*-th appends `_n` to each.
	 * This is a ceiling, not a count - a workflow cannot pass secrets that might exist, so it has to
	 * name a bounded set, and the runner uses whichever are actually populated.
	 */
	accounts: number;
	/**
	 * Further variables that satisfy the same need, tried in order after {@link env}.
	 *
	 * Several providers accept either of two names - Kimi reads `MOONSHOT_API_KEY` or
	 * `KIMI_API_KEY` - and expressing that was the only reason a harness could not be described by a
	 * declaration.
	 */
	alternatives: readonly string[];
	/** Token endpoint, for `oauth_refresh`. */
	tokenUrl: string;
	/** Environment variable holding the OAuth client id, where one is required. */
	clientIdEnv: string;
	/** Environment variable holding the client secret, likewise. */
	clientSecretEnv: string;
	/**
	 * Whether the provider issues a new refresh token on each exchange, so the stored one must be
	 * replaced.
	 *
	 * Declared rather than assumed: the previous implementation read only `access_token` from the
	 * response and passed the original refresh token straight back, which is correct for a provider
	 * that does not rotate and silently strands the credential for one that does.
	 */
	rotates: boolean;
	/** Human-readable explanation, for logs and documentation. */
	note: string;
	/** The CLI subscription login, where the harness authenticates from a file rather than the environment. */
	loginFile?: LoginFile;
}

/**
 * Renames a set of variables for one account.
 *
 * The first account uses the declared names unchanged, so every repository configured before accounts
 * existed keeps working with the secrets it already holds.
 */
function numberedNames(names: readonly string[], account: number): string[] {
	if (account <= 1) return [...names];
	return names.map((name) => `${name}_${account}`);
}

/** Every variable that can authenticate one account, in preference order. */
export function authEnvNames(auth: Auth, account = 1): string[] {
	return numberedNames(
		[auth.env, ...auth.alternatives].filter((name) => name.length > 0),
		account,
	);
}

/** The environment variable holding one account's subscription login, when the harness has one. */
export function authLoginFileNames(auth: Auth, account = 1): string[] {
	return numberedNames(auth.loginFile ? [auth.loginFile.env] : [], account);
}

/** Every variable that can authenticate one account, credentials and login file alike. */
export function authCredentialNames(auth: Auth, account = 1): string[] {
	return [...authEnvNames(auth, account), ...authLoginFileNames(auth, account)];
}

/** The OAuth companions for one account. */
export function authCompanionNames(auth: Auth, account = 1): string[] {
	return numberedNames(
		[auth.clientIdEnv, auth.clientSecretEnv].filter((name) => name.length > 0),
		account,
	);
}

/**
 * Every variable a caller must be able to pass, for every account.
 *
 * The client id and secret are companions rather than alternatives: neither authenticates on its
 * own, so neither belongs in {@link authEnvNames}, but a workflow passing secrets by name has to
 * pass them or the exchange cannot be made.
 */
export function authSecretNames(auth: Auth): string[] {
	const names: string[] = [];
	for (let account = 1; account <= Math.max(1, auth.accounts); account += 1) {
		names.push(...authCredentialNames(auth, account), ...authCompanionNames(auth, account));
	}
	return names;
}

/** One coding-agent CLI the pipeline can drive. */
export interface Harness {
	/** Registry key, also the value used in `AGENT_HARNESS_CHAIN`. */
	name: string;
	/** Executable name looked up on `PATH`. */
	binary: string;
	/** Argv template after the binary, carrying the prompt, model, timeout and kind placeholders. */
	template: readonly string[];
	/**
	 * Models that draw on *separate quota pools*, tried in order.
	 *
	 * This is not a model fallback chain and must not be used as one: dropping from a stronger model
	 * to a weaker one on the same pool buys nothing, because the pool is what ran out. Antigravity is
	 * the case that makes the distinction real - its Gemini and Claude models bill against two
	 * different pools, so moving between them is a quota move exactly like moving to another account.
	 * Claude's own opus and sonnet share one pool, so it declares one model. A node's configured model
	 * replaces this list. Empty means "run the harness default".
	 */
	pools: readonly string[];
	/**
	 * Overrides the credential variables derived from {@link auth}.
	 *
	 * Empty in the registry - the declaration is the source - and kept as a field because
	 * `AGENT_HARNESS_CONFIG` can set it, which is the point of the registry being overridable without
	 * a rebuild.
	 */
	envKeys: readonly string[];
	/** Appended verbatim to every invocation. */
	extraArgs: readonly string[];
	/**
	 * How the credential is obtained.
	 *
	 * Absent is reserved for a harness defined entirely through `AGENT_HARNESS_CONFIG`, which may
	 * authenticate by means the registry has never heard of - and for `df`, which reads its own
	 * accounts from DF_HOME, configured by the runner's setup step before dispatch.
	 */
	auth?: Auth;
	/**
	 * Shell that installs the binary into the agent image.
	 *
	 * Declared so adding a harness is one entry rather than an entry plus a Dockerfile edit that can
	 * disagree with it. Kept for the non-Nix fallback; the Nix flake is the primary installer.
	 */
	install: string;
	/** Human-readable note for logs and documentation. */
	description: string;
}

/** One coding-agent CLI the pipeline can drive. Flags verified against each CLI's own `--help`. */
export const REGISTRY: Readonly<Record<string, Harness>> = Object.freeze({
	df: {
		name: "df",
		binary: "df",
		// The prompt travels by file so long prompts never meet an argument-length limit, and
		// `--json` so the runner can parse the event stream into the final answer text.
		template: ["run", "--json", "--prompt-file", PROMPT_FILE, "--kind", KIND, "--timeout", TIMEOUT],
		// No pools: df owns model choice and in-flight failover across its own chain, so there is
		// nothing for the runner to fall back between. No auth declaration either: df reads its own
		// accounts from DF_HOME, configured by the runner's setup step before dispatch.
		pools: [],
		envKeys: [],
		extraArgs: [],
		install: "",
		description: "DarkFactory's own agent harness (df run)",
	},
	antigravity: {
		name: "antigravity",
		binary: "agy",
		template: ["--print", PROMPT, "--model", MODEL, "--dangerously-skip-permissions", "--print-timeout", TIMEOUT],
		// Two pools, not two tiers: these bill separately, so exhausting one leaves the other.
		pools: ["gemini-3.8-flash-high", "claude-opus-4-6-thinking"],
		envKeys: [],
		extraArgs: [],
		install: "curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin",
		description: "Google Antigravity CLI",
		auth: {
			kind: "oauth_refresh",
			env: "ANTIGRAVITY_REFRESH_TOKEN",
			accounts: 3,
			alternatives: [],
			tokenUrl: "https://oauth2.googleapis.com/token",
			clientIdEnv: "ANTIGRAVITY_CLIENT_ID",
			clientSecretEnv: "ANTIGRAVITY_CLIENT_SECRET",
			// Google does not issue a new refresh token on a refresh_token grant, so the stored one
			// stays valid. Stated rather than relied upon, because the code that assumed it also
			// discarded the field it would have arrived in.
			rotates: false,
			note: "Google OAuth; exchanged for a short-lived access token each run.",
		},
	},
	claude: {
		name: "claude",
		binary: "claude",
		template: ["--print", PROMPT, "--model", MODEL, "--output-format", "text", "--dangerously-skip-permissions"],
		// One pool. Dropping opus to sonnet does not find quota, it just answers worse.
		pools: ["opus"],
		envKeys: [],
		extraArgs: [],
		install: "npm install -g @anthropic-ai/claude-code",
		description: "Anthropic Claude Code",
		auth: {
			kind: "static",
			env: "CLAUDE_CODE_OAUTH_TOKEN",
			accounts: 3,
			// `claude setup-token` mints a long-lived token against a subscription, so there is
			// nothing to exchange and nothing to rotate. An ANTHROPIC_API_KEY works too and bills
			// per token instead.
			alternatives: ["ANTHROPIC_API_KEY"],
			tokenUrl: "",
			clientIdEnv: "",
			clientSecretEnv: "",
			rotates: false,
			note: "Long-lived subscription token, or an API key.",
		},
	},
	gemini: {
		name: "gemini",
		binary: "gemini",
		template: ["-p", PROMPT, "--model", MODEL, "--yolo"],
		// Five pools, not five tiers: the free quota is separate per model and moves between them.
		pools: ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview"],
		envKeys: [],
		extraArgs: [],
		install: "npm install -g @google/gemini-cli",
		description: "Google Gemini CLI",
		auth: {
			kind: "static",
			env: "GEMINI_API_KEY",
			accounts: 3,
			alternatives: ["GOOGLE_API_KEY"],
			tokenUrl: "",
			clientIdEnv: "",
			clientSecretEnv: "",
			rotates: false,
			note: "Gemini API key, under either of the two names the CLI accepts.",
		},
	},
	codex: {
		name: "codex",
		binary: "codex",
		template: ["exec", PROMPT, "--model", MODEL, "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check"],
		pools: [],
		envKeys: [],
		extraArgs: [],
		install: "npm install -g @openai/codex",
		description: "OpenAI Codex CLI",
		auth: {
			kind: "static",
			env: "OPENAI_API_KEY",
			accounts: 3,
			alternatives: [],
			tokenUrl: "",
			clientIdEnv: "",
			clientSecretEnv: "",
			rotates: false,
			note: "OpenAI API key or subscription login file.",
			loginFile: { env: "CODEX_AUTH_JSON", path: ".codex/auth.json" },
		},
	},
	kimi: {
		name: "kimi",
		binary: "kimi",
		template: ["--prompt", PROMPT, "--model", MODEL, "--output-format", "text", "--yolo"],
		pools: [],
		envKeys: [],
		extraArgs: [],
		install: "npm install -g @moonshot-ai/kimi-cli",
		description: "Moonshot Kimi CLI",
		auth: {
			kind: "static",
			env: "MOONSHOT_API_KEY",
			accounts: 3,
			alternatives: ["KIMI_API_KEY"],
			tokenUrl: "",
			clientIdEnv: "",
			clientSecretEnv: "",
			rotates: false,
			note: "Moonshot API key, under either of the two names the CLI accepts.",
			loginFile: { env: "KIMI_AUTH_JSON", path: ".kimi-code/credentials/kimi-code.json" },
		},
	},
	grok: {
		name: "grok",
		binary: "grok",
		template: ["--single", PROMPT, "--model", MODEL, "--always-approve"],
		pools: [],
		envKeys: [],
		extraArgs: [],
		install: "curl -fsSL https://raw.githubusercontent.com/xai-org/grok-cli/main/install.sh | bash",
		description: "xAI Grok Build",
		auth: {
			kind: "static",
			env: "XAI_API_KEY",
			accounts: 3,
			alternatives: ["GROK_API_KEY"],
			tokenUrl: "",
			clientIdEnv: "",
			clientSecretEnv: "",
			rotates: false,
			note: "xAI API key, under either of the two names the CLI accepts.",
			loginFile: { env: "GROK_AUTH_JSON", path: ".grok/auth.json" },
		},
	},
	cursor: {
		name: "cursor",
		binary: "cursor-agent",
		template: ["--print", PROMPT, "--model", MODEL, "--force"],
		pools: [],
		envKeys: [],
		extraArgs: [],
		install: "curl -fsSL https://cursor.com/install | bash",
		description: "Cursor CLI (cursor-agent)",
		auth: {
			kind: "static",
			env: "CURSOR_API_KEY",
			accounts: 3,
			alternatives: [],
			tokenUrl: "",
			clientIdEnv: "",
			clientSecretEnv: "",
			rotates: false,
			note: "Cursor API key.",
		},
	},
	opencode: {
		name: "opencode",
		binary: "opencode",
		template: ["run", PROMPT, "--model", MODEL, "--auto"],
		pools: [],
		envKeys: [],
		extraArgs: [],
		install: "npm install -g opencode-ai",
		description: "opencode (model given as provider/model)",
		auth: {
			kind: "static",
			env: "OPENCODE_API_KEY",
			accounts: 3,
			// opencode routes to whichever provider the model names, so any one of the three is
			// enough and which one depends on the model, not on the harness.
			alternatives: ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"],
			tokenUrl: "",
			clientIdEnv: "",
			clientSecretEnv: "",
			rotates: false,
			note: "Any provider key opencode can route with.",
		},
	},
});

/** Default order when `AGENT_HARNESS_CHAIN` is unset. */
export const ORDER: readonly string[] = Object.freeze([
	"df",
	// The pipeline runs df as its only agent harness. The older external CLI entries stay registered
	// but out of the default chain: they are not installed in the image, and `agent.yml` does not
	// forward the chain overrides, so they cannot be re-enabled in DarkFactory's own workflows.
]);

/** The environment a registry read consults. */
export type HarnessEnv = Readonly<Record<string, string | undefined>>;

/** The environment a registry read and a chain resolution share. */
export interface ResolveOptions {
	/** Environment mapping; defaults to the process environment. */
	env?: HarnessEnv;
	/** Resolves a binary name to a path, or null when it is absent from `PATH`. */
	which?: (binary: string) => string | null;
	/** Where the skip notices go; defaults to the console. */
	log?: (message: string) => void;
}

/** Resolves a binary name to a path, or null when it is absent from `PATH`. */
const defaultWhich = (binary: string): string | null => Bun.which(binary);

/**
 * Parses `AGENT_HARNESS_CONFIG`.
 *
 * Malformed JSON is reported and ignored rather than thrown: a typo in a chain override should cost
 * the fallback chain it was meant to tune, not the run.
 */
function overrides(env: HarnessEnv, log: (message: string) => void): Record<string, Record<string, unknown>> {
	const raw = env.AGENT_HARNESS_CONFIG?.trim();
	if (!raw) return {};
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		log(`AGENT_HARNESS_CONFIG is not valid JSON, ignoring: ${String(error)}`);
		return {};
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
	return parsed as Record<string, Record<string, unknown>>;
}

/** An argv-shaped override, or undefined when the value is not a list of strings. */
function argvOverride(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	return value.every((entry) => typeof entry === "string") ? (value as string[]) : undefined;
}

/**
 * Returns a harness with runtime overrides applied.
 *
 * A name the registry does not know is still usable, provided the override gives it a binary and a
 * template - a harness defined entirely at runtime may authenticate by means the registry has never
 * heard of, and requiring a declaration for it would defeat the point of the override.
 *
 * @param name Registry key.
 * @param options Environment and notice sink.
 * @returns The harness, or undefined when the name is unknown and no override defines it.
 */
export function getHarness(name: string, options: ResolveOptions = {}): Harness | undefined {
	const env = options.env ?? process.env;
	const log = options.log ?? ((message: string) => console.log(message));
	const override = overrides(env, log)[name] ?? {};
	const base = REGISTRY[name];

	const declared: Harness | undefined =
		base ??
		((): Harness | undefined => {
			const binary = override.binary;
			const template = argvOverride(override.template);
			if (typeof binary !== "string" || template === undefined) return undefined;
			return {
				name,
				binary,
				template,
				pools: [],
				envKeys: [],
				extraArgs: [],
				install: "",
				description: typeof override.description === "string" ? override.description : "user-defined harness",
			};
		})();
	if (!declared) return undefined;

	// A malformed override is ignored field by field rather than thrown: the compiled-in declaration
	// is still a working harness, and a container that crashes at dispatch helps nobody.
	const strings = (key: "binary" | "description"): string | undefined =>
		typeof override[key] === "string" ? (override[key] as string) : undefined;
	const argv = (key: "template" | "pools" | "envKeys" | "extra_args"): string[] | undefined =>
		argvOverride(override[key]);

	const binary = strings("binary") ?? declared.binary;
	const description = strings("description") ?? declared.description;
	const template = argv("template") ?? [...declared.template];
	const pools = argv("pools") ?? [...declared.pools];
	const envKeys = argv("envKeys") ?? [...declared.envKeys];
	const extraArgs = argv("extra_args") ?? [...declared.extraArgs];

	return { ...declared, binary, description, template, pools, envKeys, extraArgs };
}

/**
 * The credential variables that can authenticate one account.
 *
 * The answer comes from the `auth` declaration, so a harness names its credentials once. An explicit
 * `envKeys` still wins, because a runtime override exists precisely to contradict what is compiled
 * in - and an override names one account, since a person writing `AGENT_HARNESS_CONFIG` is describing
 * the credential they hold.
 */
export function credentialsFor(harness: Harness, account = 1): string[] {
	if (harness.envKeys.length > 0) return account <= 1 ? [...harness.envKeys] : [];
	return harness.auth ? authCredentialNames(harness.auth, account) : [];
}

/** The first account's credential variables. */
export function credentials(harness: Harness): string[] {
	return credentialsFor(harness, 1);
}

/**
 * The accounts this harness actually holds a credential for.
 *
 * Declared accounts are a ceiling; which of them exist is a question about the environment, answered
 * here rather than assumed, so a repository holding one key behaves exactly as it did before accounts
 * existed. A harness naming no credentials authenticates by other means and must not be skipped, so
 * it reports account 1.
 */
export function accountsFor(harness: Harness, env: HarnessEnv = process.env): number[] {
	const declared = Math.max(1, harness.auth && harness.envKeys.length === 0 ? harness.auth.accounts : 1);
	const present: number[] = [];
	for (let account = 1; account <= declared; account += 1) {
		if (credentialsFor(harness, account).some((name) => Boolean(env[name]))) present.push(account);
	}
	if (present.length > 0) return present;
	return credentialsFor(harness, 1).length > 0 ? [] : [1];
}

/** Whether the harness holds a credential for at least one account. */
export function isAuthenticated(harness: Harness, env: HarnessEnv = process.env): boolean {
	return accountsFor(harness, env).length > 0;
}

/** How to render one invocation. */
export interface Invocation {
	/** Prompt text. */
	prompt: string;
	/** Model id, or undefined to use the harness default. */
	model?: string;
	/** Print-mode timeout as a Go duration string. */
	timeout: string;
	/** Path of the file holding the prompt, for `PROMPT_FILE` templates. */
	promptFile?: string;
	/** Optional semantic task kind, for templates carrying `KIND`. */
	kind?: string;
}

/**
 * Renders the argv for one invocation.
 *
 * A placeholder argument is substituted; any argument still carrying `MODEL` when no model was
 * supplied is dropped along with an immediately preceding flag, so a template can express an optional
 * model without a second template. A template carrying `PROMPT_FILE` receives the prompt by path,
 * falling back to the prompt text itself when no file was written.
 *
 * @param harness The harness to drive.
 * @param invocation Prompt, model, timeout, and the optional file and kind.
 * @returns Full argv including the binary.
 */
export function buildArgv(harness: Harness, invocation: Invocation): string[] {
	const argv: string[] = [harness.binary];
	let pendingFlag: string | undefined;

	for (const templateToken of harness.template) {
		let token = templateToken;
		if (token.includes(PROMPT_FILE)) token = token.replaceAll(PROMPT_FILE, invocation.promptFile || invocation.prompt);
		if (token.includes(MODEL)) {
			if (invocation.model === undefined) {
				pendingFlag = undefined;
				continue;
			}
			token = token.replaceAll(MODEL, invocation.model);
		} else if (token.includes(KIND)) {
			if (invocation.kind === undefined) {
				pendingFlag = undefined;
				continue;
			}
			token = token.replaceAll(KIND, invocation.kind);
		} else if (token.startsWith("-")) {
			if (pendingFlag !== undefined) argv.push(pendingFlag);
			pendingFlag = token;
			continue;
		}
		if (pendingFlag !== undefined) {
			argv.push(pendingFlag);
			pendingFlag = undefined;
		}
		argv.push(token.replaceAll(PROMPT, invocation.prompt).replaceAll(TIMEOUT, invocation.timeout));
	}

	if (pendingFlag !== undefined) argv.push(pendingFlag);
	argv.push(...harness.extraArgs);
	return argv;
}

/**
 * Every secret name the registry can use, in chain order, without repeats.
 *
 * Three places used to spell this list out - the registry, `agent.yml`'s `workflow_call` secrets, and
 * every consumer's hand-written caller - with nothing keeping them equal. A workflow that forgets a
 * name does not fail; it silently shortens the fallback chain, which is the least visible way for
 * this to go wrong. Deriving the list is what makes the guard test possible.
 */
export function credentialEnvNames(): string[] {
	const names: string[] = [];
	for (const name of ORDER) {
		const harness = REGISTRY[name];
		if (!harness?.auth) continue;
		for (const envName of authSecretNames(harness.auth)) {
			if (!names.includes(envName)) names.push(envName);
		}
	}
	return names;
}

/**
 * The harness order from the environment, falling back to {@link ORDER}.
 *
 * @param env Environment mapping; defaults to the process environment.
 * @returns Ordered harness names, including any defined only in `AGENT_HARNESS_CONFIG`.
 */
export function configuredOrder(env: HarnessEnv = process.env): string[] {
	const raw = env.AGENT_HARNESS_CHAIN?.trim();
	if (raw)
		return raw
			.split(",")
			.map((part) => part.trim())
			.filter((part) => part.length > 0);
	const declared = overrides(env, (message) => console.log(message));
	return [...ORDER, ...Object.keys(declared).filter((name) => !ORDER.includes(name))];
}

/** One invocation the runner may make: a harness, a model, and an account to pay for it. */
export interface Attempt {
	/** The harness to run. */
	harness: Harness;
	/** Model id, or undefined to use the harness default. */
	model?: string;
	/** 1-based account whose credential this attempt uses. */
	account: number;
}

/** Renders the attempt for logs, naming the account but never its credential. */
export function attemptLabel(attempt: Attempt): string {
	const model = attempt.model ? `/${attempt.model}` : "";
	const account = attempt.account > 1 ? ` (account ${attempt.account})` : "";
	return `${attempt.harness.name}${model}${account}`;
}

/**
 * Flattens the configured harnesses into an ordered list of attempts.
 *
 * Every rung of this ladder is a *quota* move. The account is innermost, so an exhausted quota is
 * answered by the same harness and model on a different account before anything else is tried; an
 * exhausted account is not an exhausted harness, and falling through to another harness while an
 * unused account sits in the environment is the wrong move.
 *
 * Pools come next, and only where a harness genuinely has more than one - Antigravity's Gemini and
 * Claude models bill separately. This is deliberately not a model fallback: answering an exhausted
 * quota with a weaker model on the same pool does not find capacity, it just answers worse, so models
 * are configured per node rather than degraded here.
 *
 * @param model The model to run, from the node's configuration. Replaces the pools of the first
 * available harness, so a caller can pin a model without knowing which harness will run.
 * @param options Environment, PATH lookup and notice sink; `requireAvailable` defaults to true.
 * @returns Ordered attempts.
 */
export function resolveAttempts(
	model?: string,
	options: ResolveOptions & { requireAvailable?: boolean } = {},
): Attempt[] {
	const env = options.env ?? process.env;
	const which = options.which ?? defaultWhich;
	const log = options.log ?? ((message: string) => console.log(message));
	const requireAvailable = options.requireAvailable !== false;
	const attempts: Attempt[] = [];
	let overrideApplied = false;

	for (const name of configuredOrder(env)) {
		const harness = getHarness(name, { env, log });
		if (!harness) {
			log(`Unknown harness '${name}' in chain; skipping.`);
			continue;
		}
		if (requireAvailable && which(harness.binary) === null) {
			log(`Harness '${name}' unavailable (${harness.binary} not on PATH); skipping.`);
			continue;
		}
		const accounts = accountsFor(harness, env);
		if (accounts.length === 0) {
			// The credential *names* are safe to log and the credentials behind them are not, so the
			// notice names what is missing rather than what was tried.
			const named = credentials(harness)
				.map((name) => `'${name}'`)
				.join(", ");
			log(`Harness '${name}' has no credentials in [${named}]; skipping.`);
			continue;
		}
		const pools: (string | undefined)[] =
			model && !overrideApplied ? [model] : harness.pools.length > 0 ? [...harness.pools] : [undefined];
		if (model && !overrideApplied) overrideApplied = true;
		for (const pool of pools) {
			for (const account of accounts) attempts.push({ harness, model: pool, account });
		}
	}

	return attempts;
}

/**
 * Renders the resolved chain for logs and issue comments.
 *
 * @param options Environment, PATH lookup and notice sink.
 * @returns A human-readable multi-line description, or a notice when nothing is usable.
 */
export function describeChain(options: ResolveOptions = {}): string {
	const attempts = resolveAttempts(undefined, options);
	if (attempts.length === 0) return "No harness is available: no configured CLI is on PATH with credentials.";
	return attempts
		.map(({ harness, model, account }) => {
			const model_ = model ? ` model \`${model}\`` : "";
			const account_ = account > 1 ? ` account ${account}` : "";
			return `- \`${harness.name}\` (${harness.binary})${model_}${account_}`;
		})
		.join("\n");
}
