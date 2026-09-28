/**
 * The environment one agent attempt runs in, and what it writes back afterwards.
 *
 * Ported from `credential_env`, `prepare_login_file`/`finish_login_file` and
 * `snapshot_df_login_files`/`finish_df_login_files` in `.github/scripts/agent_runner.py` - everything
 * `run_agent_prompt` does to a process's environment before it spawns one, and everything it puts
 * back when the process is done.
 *
 * Two rules here are load-bearing and neither is obvious from the registry that describes them.
 *
 * A CLI reads its credential from the name it knows, so account two's secret has to arrive under
 * account *one's* name - and the names this attempt does not use have to be cleared, because leaving
 * `ANTHROPIC_API_KEY` in place while running account two lets the CLI authenticate with the first
 * account's key and the rotation achieves nothing, silently.
 *
 * A login file and a df account record are both written *out* of a secret and can be rewritten by
 * the CLI or by df itself. When they change, the new value has to be written back to the secret it
 * came from: a rotating provider invalidates the old token as it issues the new one, so a run that
 * exchanges and forgets has spent the credential - this run works and every run afterwards fails.
 */

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, normalize } from "node:path";
import { resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
import {
	type Attempt,
	type Auth,
	authCompanionNames,
	authEnvNames,
	authLoginFileNames,
	authSecretNames,
	type Harness,
} from "../install/harness-registry.ts";
import { DF_ACCOUNT_LOAD_MAP, DF_ACCOUNT_SET_MAP } from "./df-events.ts";
import type { PipelineEnv } from "./handler-context.ts";

/** A subscription login materialised on disk for one attempt, and the secret that populated it. */
export interface LoginFileState {
	/** Absolute path of the file written under `HOME`. */
	path: string;
	/** Environment variable the file's contents came from. */
	secretName: string;
	/** The contents as supplied, so a rewrite by the CLI can be detected. */
	original: string;
}

/** One df account record, and the secret it was loaded from. */
export interface DfAccountState {
	/** The df account id, e.g. `openai-codex:pipeline`. */
	account: string;
	/** Environment variable the record was loaded from. */
	secret: string;
	/** The record before the run, as the credentials store held it or the secret parsed it. */
	original: unknown;
}

/**
 * Writes a rotated credential back to the repository secret it came from.
 *
 * The Python shelled out to `gh secret set` with the value on stdin and a human's project token,
 * because writing a secret is repository administration the App token cannot do. That is credential
 * custody, which DF-RULE-016 gives to `@darkfactory/keychain` rather than to the pipeline, so it
 * arrives here as a port. A caller that does not supply one gets {@link reportingTokenPersistence},
 * which says so out loud rather than discarding the value silently: the next run fails to
 * authenticate, and this run is the only place that can say it.
 */
export type PersistRotatedToken = (secretName: string, value: string) => boolean;

/** The notice the Python printed when a rotated token had nowhere to be written. */
const ROTATION_UNPERSISTED = (secret: string): string =>
	`${secret} was rotated but GITHUB_REPOSITORY is unset, so it cannot be written back; ` +
	"the next run will fail to authenticate.";

/** The notice the Python printed when writing a rotated token back failed. */
const ROTATION_FAILED = (secret: string, detail: string): string =>
	`${secret} was rotated but could not be written back (${detail.slice(0, 80)}); ` +
	"the next run will fail to authenticate.";

/** The token response an OAuth refresh endpoint returns. */
interface TokenResponse {
	access_token?: string;
	refresh_token?: string;
}

/**
 * Exchange a stored refresh token for an access token at any OAuth token endpoint.
 *
 * Ported from `exchange_refresh_token`. A non-2xx answer and a transport failure are both reported
 * as thrown errors naming the endpoint's own status or message, because the ladder prints the
 * failure and moves to the next account: the wording is what a human reads in the job log.
 *
 * @param request - The token endpoint and the stored credential it is exchanged with.
 * @returns The parsed token response.
 * @throws When the endpoint rejects the exchange or cannot be reached.
 */
async function exchangeRefreshToken(request: {
	tokenUrl: string;
	refreshToken: string;
	clientId: string;
	clientSecret: string;
}): Promise<TokenResponse> {
	const fields = new URLSearchParams({
		refresh_token: request.refreshToken,
		grant_type: "refresh_token",
	});
	if (request.clientId) fields.set("client_id", request.clientId);
	if (request.clientSecret) fields.set("client_secret", request.clientSecret);

	let response: Response;
	try {
		response = await fetch(request.tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: fields.toString(),
		});
	} catch (error) {
		throw new Error(`unexpected error during token refresh: ${errorMessage(error)}`);
	}
	const body = await response.text();
	if (!response.ok) throw new Error(`token refresh failed (${response.status}): ${body}`);
	try {
		return JSON.parse(body) as TokenResponse;
	} catch (error) {
		throw new Error(`unexpected error during token refresh: ${errorMessage(error)}`);
	}
}

/** The message of a thrown value. */
function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * The names a prepared credential is exported under, which is not the name it was found under.
 *
 * The first account's names, because that is what the CLI reads - but only the single name the
 * credential was actually found under, because the alternatives are different *kinds* of credential.
 * The claude CLI prefers `ANTHROPIC_API_KEY`, so a subscription token exported there as well failed
 * every run with "401 API key is invalid".
 */
function exportNames(auth: Auth, account: number, base: PipelineEnv): string[] {
	if (auth.kind !== "static") return authEnvNames(auth, 1);
	const source = authEnvNames(auth, account);
	const target = authEnvNames(auth, 1);
	for (let index = 0; index < source.length; index += 1) {
		const from = source[index] as string;
		if (base[from]) return [target[index] as string];
	}
	return target.slice(0, 1);
}

/**
 * Obtain a usable credential for a harness from what it declares.
 *
 * Ported from `prepare_credentials`, which reads the *process* environment rather than the base an
 * attempt's `env` is copied from. The distinction is not cosmetic and is why {@link AttemptEnvironment}
 * carries two mappings.
 *
 * @param harness - The harness to authenticate, carrying an optional `auth` declaration.
 * @param account - 1-based account whose credential to prepare.
 * @param env - The process environment the declared variables are read from.
 * @param persist - Where a rotated refresh token is written back to.
 * @returns A usable credential, or `undefined` when the harness declares none.
 * @throws When an exchange was declared and could not be completed.
 */
async function prepareCredentials(
	harness: Harness,
	account: number,
	env: Record<string, string | undefined>,
	persist: PersistRotatedToken,
): Promise<string | undefined> {
	const auth = harness.auth;
	const names = auth ? authEnvNames(auth, account) : [];
	if (!auth || names.length === 0) return undefined;

	if (auth.kind === "static") {
		for (const name of names) {
			const value = env[name];
			if (value) return value;
		}
		return undefined;
	}

	const primary = names[0] as string;
	const stored = env[primary] ?? "";
	if (!stored) return undefined;
	if (auth.kind !== "oauth_refresh") throw new Error(`${harness.name}: unknown auth kind '${auth.kind}'`);

	const companions = authCompanionNames(auth, account);
	const response = await exchangeRefreshToken({
		tokenUrl: auth.tokenUrl,
		refreshToken: stored,
		clientId: companions[0] ? (env[companions[0]] ?? "") : "",
		clientSecret: companions[1] ? (env[companions[1]] ?? "") : "",
	});

	// A provider that rotates issues a new refresh token on every exchange. Reading only the access
	// token is correct while the provider does not rotate and silently strands the credential the
	// moment one does - so the declaration decides, and the new value is written back under *this
	// account's* name: rotating account two's token into account one's secret would strand both.
	const rotated = response.refresh_token;
	if (auth.rotates && rotated && rotated !== stored) {
		env[primary] = rotated;
		persist(primary, rotated);
	}
	return response.access_token;
}

/**
 * The environment the ladder runs in, as the Python's two mappings.
 *
 * The Python kept `os.environ` live and made one `os.environ.copy()` per `run_agent_prompt` call, and
 * a rotated refresh token was written to the live one. That is not a detail: the attempt currently
 * running is handed the freshly exchanged *access* token, so a rotated refresh token only matters to
 * the *next* attempt in the chain and to redaction. A single shared mapping would hand the refresh
 * token to the current attempt under the name the CLI reads, which is the opposite of the intent.
 */
export interface AttemptEnvironment {
	/** Copied once when the ladder starts; each attempt's `env` is a copy of this plus `TERM`. */
	readonly base: PipelineEnv;
	/** The process environment, which a rotation is written into for later attempts to see. */
	readonly live: Record<string, string | undefined>;
}

/**
 * Build the environment one attempt runs in, holding that account's credential and no other.
 *
 * @param environment - The fixed base and the live process environment.
 * @param attempt - The attempt about to be made.
 * @param persist - Where a rotated refresh token is written back to.
 * @returns A copy of the base carrying exactly this account's credential.
 * @throws When an exchange was declared and could not be completed.
 */
export async function credentialEnv(
	environment: AttemptEnvironment,
	attempt: Attempt,
	persist: PersistRotatedToken,
): Promise<Record<string, string | undefined>> {
	const base = environment.base;
	const env: Record<string, string | undefined> = { ...base };
	const auth = attempt.harness.auth;
	// A harness that declares no auth - `df`, which reads its own accounts from DF_HOME - runs with
	// the environment it was given, untouched.
	if (!auth) return env;

	// Every name this harness could authenticate with, across every account, is cleared first, so
	// what remains is what this attempt chose.
	for (const name of authSecretNames(auth)) delete env[name];

	const loginNames = authLoginFileNames(auth, attempt.account);
	const loginName = loginNames[0] ?? "";
	let credential = await prepareCredentials(attempt.harness, attempt.account, environment.live, persist);
	// Subscription CLIs read the login file, never the static API-key names.
	if (loginName && base[loginName]) credential = undefined;
	if (credential) {
		for (const name of exportNames(auth, attempt.account, base)) env[name] = credential;
	}
	const source = authCompanionNames(auth, attempt.account);
	const target = authCompanionNames(auth, 1);
	for (let index = 0; index < source.length; index += 1) {
		if (base[source[index] as string]) env[target[index] as string] = base[source[index] as string];
	}
	return env;
}

/**
 * Materialise the selected subscription login, as a CLI reads it from a file rather than the
 * environment.
 *
 * @param base - The environment holding the secret.
 * @param attempt - The attempt about to be made.
 * @returns The state to hand {@link finishLoginFile} afterwards, or `undefined` when the harness has
 *   no login file or the secret is empty.
 */
export function prepareLoginFile(base: PipelineEnv, attempt: Attempt): LoginFileState | undefined {
	const auth = attempt.harness.auth;
	const login = auth?.loginFile;
	if (!auth || !login) return undefined;
	const secretName = authLoginFileNames(auth, attempt.account)[0];
	if (!secretName) return undefined;
	const content = base[secretName] ?? "";
	if (!content) return undefined;
	const home = base.HOME || process.env.HOME || homedir();
	const path = join(home, normalize(login.path));
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content, { mode: 0o600 });
	chmodSync(path, 0o600);
	return { path, secretName, original: content };
}

/**
 * Persist a login file the CLI rewrote, then remove it.
 *
 * A file the CLI deleted is not a rotation - it simply left nothing behind - so the missing file is
 * swallowed and only the removal is attempted.
 *
 * @param state - What {@link prepareLoginFile} returned.
 * @param persist - Where a rotated token is written back to.
 */
export function finishLoginFile(state: LoginFileState | undefined, persist: PersistRotatedToken): void {
	if (!state) return;
	let current: string | undefined;
	try {
		current = readFileSync(state.path, "utf8");
	} catch {
		current = undefined;
	}
	if (current !== undefined && current !== state.original) {
		// A CLI that rewrote its login has rotated whatever subscription backs it.
		persist(state.secretName, current);
	}
	try {
		rmSync(state.path, { force: true });
	} catch {
		// The file is inside HOME and the next attempt writes its own; a leftover is not fatal.
	}
}

/** Read the df-owned account records df may have rewritten, keyed by account id. */
function dfAccountStore(env: PipelineEnv): Record<string, unknown> {
	const dfHome = env.DF_HOME ?? "";
	if (!dfHome) return {};
	const storePath = join(dfHome, "credentials.json");
	if (!existsSync(storePath)) return {};
	try {
		const parsed: unknown = JSON.parse(readFileSync(storePath, "utf8"));
		const accounts = (parsed as { accounts?: unknown } | null)?.accounts;
		return accounts !== null && typeof accounts === "object" && !Array.isArray(accounts)
			? (accounts as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

/**
 * Snapshot the df-owned account records that can rotate during a run.
 *
 * Ported from `snapshot_df_login_files`. The store is the authority where it holds the record, and
 * the environment secret is the fallback, because df writes a refreshed OAuth token back into its own
 * credentials store rather than into the process environment that supplied it.
 *
 * @param env - The environment the run was given.
 * @returns One entry per loaded account, in setup order.
 */
export function snapshotDfLoginFiles(env: PipelineEnv): DfAccountState[] {
	const store = dfAccountStore(env);
	return DF_ACCOUNT_LOAD_MAP.map(([variable, account]) => {
		const held = store[account];
		if (held !== undefined && held !== null) return { account, secret: variable, original: held };
		const raw = env[variable] ?? "";
		let original: unknown = raw;
		if (raw) {
			try {
				original = JSON.parse(raw);
			} catch {
				// A secret that is not JSON is stored verbatim and compared verbatim.
				original = raw;
			}
		}
		return { account, secret: variable, original };
	});
}

/** Compare two stored account records, parsing a JSON string on either side before comparing. */
function sameAccountRecord(left: unknown, right: unknown): boolean {
	const parse = (value: unknown): unknown => {
		if (typeof value !== "string") return value;
		try {
			return JSON.parse(value) as unknown;
		} catch {
			return value;
		}
	};
	return JSON.stringify(parse(left)) === JSON.stringify(parse(right));
}

/**
 * Write df account records that rotated during the run back to the secret they came from.
 *
 * Ported from `finish_df_login_files`. An account that was never loaded, or that df removed, has
 * nothing to compare against and is skipped rather than resurrected.
 *
 * @param states - What {@link snapshotDfLoginFiles} returned before the invocation.
 * @param env - The environment the run was given.
 * @param persist - Where a rotated account record is written back to.
 * @param report - Where the per-account write-back notice goes.
 */
export function finishDfLoginFiles(
	states: DfAccountState[],
	env: PipelineEnv,
	persist: PersistRotatedToken,
	report: (message: string) => void,
): void {
	if (!env.DF_HOME) return;
	const store = dfAccountStore(env);
	for (const { account, secret, original } of states) {
		if (!secret || original === undefined || original === null) continue;
		const current = store[account];
		if (current === undefined || current === null) continue;
		if (sameAccountRecord(current, original)) continue;
		persist(secret, typeof current === "string" ? current : JSON.stringify(current));
		report(`Rotated df account ${account} written back to ${secret}.`);
	}
}

/**
 * A {@link PersistRotatedToken} that reports the Python's own notices and writes nowhere.
 *
 * The fallback for a runner that has not wired a secret store in - which is every harness in the
 * shipped chain, because `df` owns its own accounts. It is deliberately loud: a rotation that is not
 * persisted strands the credential, and the run that loses it is the last one that works.
 *
 * @param repo - The repository slug, empty when `GITHUB_REPOSITORY` is unset.
 * @param report - Where the notice goes.
 * @returns The persist function.
 */
export function reportingTokenPersistence(repo: string, report: (message: string) => void): PersistRotatedToken {
	return (secret) => {
		report(
			repo
				? ROTATION_FAILED(secret, "no secret store is wired into the agent prompt runner")
				: ROTATION_UNPERSISTED(secret),
		);
		return false;
	};
}

/** Write a prompt to a private temporary file for a harness that takes `--prompt-file`. */
export function writePromptFile(text: string): string {
	const path = join(tmpdir(), `df-prompt-${crypto.randomUUID()}.md`);
	writeFileSync(path, text, { mode: 0o600 });
	return path;
}

/** Remove a prompt file, which holds the whole run's instruction and must not outlive the attempt. */
export function removePromptFile(path: string): void {
	try {
		rmSync(path, { force: true });
	} catch {
		// A leftover in the temporary directory is not worth failing an attempt over.
	}
}

/**
 * Configuring `df`'s accounts from the environment, which is all the `token-refresh` command does.
 *
 * Ported from `setup_df_accounts` in `.github/scripts/agent_runner.py`. It points `DF_HOME` at a
 * fresh private directory, copies the combined configuration beside it, saves every populated API
 * key with `df account set` - value on standard input, never on argv, never printed - and loads
 * each populated subscription record with `df account load`. It runs once, before anything
 * dispatches, because every agent call in the pipeline goes through `df`.
 *
 * Two failure rules are behaviour and are preserved exactly. A repository holding three of the
 * mapped secrets gets a shorter chain rather than a failure, so one bad key or one unreadable login
 * is a notice and the loop continues. A `df` that cannot be reached *at all* stops the loop
 * immediately, because every remaining call would fail the same way.
 *
 * The Python memoised the directory in a module global so that `main` and `dispatch_event` shared
 * one. The port has a single caller - the entrypoint, which sets this up before it dispatches - and
 * the directory is published through the environment, so there is nothing left to memoise.
 */

/** The outcome of one `df account` invocation, as `subprocess.run` presented it. */
export interface DfAccountCommandResult {
	/** The process's exit status. */
	readonly exitCode: number;
	/** The process's standard error, which the notices quote. */
	readonly stderr: string;
}

/**
 * Runs one `df account` invocation to completion, with its value on standard input.
 *
 * Synchronous, because the Python's setup was synchronous and ran before the process had any
 * asynchronous work to interleave with. A binary that could not be started is reported as
 * {@link DfAccountCommandResult.exitCode} 127 with the `ENOENT` in `stderr`, which is the one
 * condition the caller answers differently from a plain failure.
 *
 * @param argv - The command and its arguments, with no shell between them.
 * @param env - The environment the command runs in.
 * @param stdin - What the command reads; empty for a `load`, the secret for a `set`.
 * @returns The exit status and the standard error.
 */
export type DfAccountRunner = (
	argv: readonly string[],
	env: Record<string, string | undefined>,
	stdin: string,
) => DfAccountCommandResult;

/** The exit status reported when the binary itself could not be started, as `ENOENT` is not an exit. */
const DF_BINARY_ABSENT = 127;

/** The {@link DfAccountRunner} over a real process, with no shell and no argument-length limit. */
export const spawnDfAccount: DfAccountRunner = (argv, env, stdin) => {
	const result = spawnSync(argv[0] as string, argv.slice(1), {
		env,
		input: stdin,
		encoding: "utf8",
		windowsHide: true,
	});
	if (result.error) {
		// A missing binary arrives as `error` rather than a status. Every other error is a real
		// failure and keeps its own wording rather than being folded into the missing-binary notice.
		const absent = (result.error as NodeJS.ErrnoException).code === "ENOENT";
		return { exitCode: absent ? DF_BINARY_ABSENT : 1, stderr: result.error.message };
	}
	return { exitCode: result.status ?? 1, stderr: result.stderr ?? "" };
};

/** What the account setup needs from the outside world. */
export interface DfAccountSetupOptions {
	/**
	 * The live process environment: read for the secrets, and written with the run's `DF_HOME` and
	 * `DF_CONFIG_DIR` so that every `df` process the ladder later spawns inherits them.
	 */
	live: Record<string, string | undefined>;
	/** The roots the combined configuration document is looked for in, in order. */
	roots: readonly string[];
	/** Runs one `df account` invocation; defaults to {@link spawnDfAccount}. */
	run?: DfAccountRunner;
	/** Writes a progress line; defaults to the console. */
	say?: (message: string) => void;
	/** Writes a warning or an error; defaults to the console. */
	warn?: (message: string) => void;
	/** Creates the run's `DF_HOME`; defaults to a fresh private temporary directory. */
	makeHome?: () => string;
}

/**
 * The first combined configuration document found in one of the roots, or `undefined` for none.
 *
 * The Python searched the workspace and then the checkout the pipeline makes beside it, and treated
 * an ambiguous directory as a raised error rather than a skip. Both properties are kept: ambiguity
 * reaches the caller as a notice, and a root that holds nothing moves on to the next.
 */
function dfConfigSource(roots: readonly string[]): string | undefined {
	for (const root of roots) {
		const selected = resolveConfigDocumentPath(root);
		if (selected) return selected;
	}
	return undefined;
}

/** The failure `subprocess.run(check=True)` raised, in the wording the notices quote. */
function commandFailed(argv: readonly string[], exitCode: number): Error {
	return new Error(
		`Command '[${argv.map((word) => `'${word}'`).join(", ")}]' returned non-zero exit status ${exitCode}.`,
	);
}

/**
 * Point `df` at this run's accounts.
 *
 * @param options - The environment, the configuration roots, and the process and reporting seams.
 * @returns The `DF_HOME` the run uses.
 */
export async function setupDfAccounts(options: DfAccountSetupOptions): Promise<string> {
	const { live, roots } = options;
	const run = options.run ?? spawnDfAccount;
	const say = options.say ?? ((message: string) => console.log(message));
	const warn = options.warn ?? ((message: string) => console.error(message));

	const home = options.makeHome?.() ?? mkdtempSync(join(tmpdir(), "df-home-"));
	live.DF_HOME = home;
	const childEnv: Record<string, string | undefined> = { ...live, DF_HOME: home };

	try {
		const source = dfConfigSource(roots);
		if (source) {
			live.DF_CONFIG_DIR = dirname(source);
			childEnv.DF_CONFIG_DIR = dirname(source);
			say(`Using df config directory from ${source}.`);
		} else {
			warn("No combined DarkFactory config found; df uses its built-in default chain.");
		}
	} catch (error) {
		warn(`df config notice: ${errorMessage(error)}`);
	}

	for (const [variable, account, slot] of DF_ACCOUNT_SET_MAP) {
		const value = live[variable] ?? "";
		if (!value) continue;
		const argv = ["df", "account", "set", account, slot, "--type", "api_key"];
		const result = run(argv, childEnv, value);
		if (result.exitCode === DF_BINARY_ABSENT) {
			warn("df binary not found; skipping df account setup.");
			return home;
		}
		if (result.exitCode !== 0) {
			warn(`df account setup notice for ${account}: ${errorMessage(commandFailed(argv, result.exitCode))}`);
			continue;
		}
		say(`Configured df account ${account} from ${variable}.`);
	}

	for (const [variable, account] of DF_ACCOUNT_LOAD_MAP) {
		if (!live[variable]) continue;
		const argv = ["df", "account", "load", account, "--from-env", variable];
		const result = run(argv, childEnv, "");
		if (result.exitCode === DF_BINARY_ABSENT) {
			warn("df binary not found; skipping df account setup.");
			return home;
		}
		if (result.exitCode !== 0) {
			warn(`df account load notice for ${account}: ${errorMessage(commandFailed(argv, result.exitCode))}`);
			continue;
		}
		say(`Loaded df account ${account} from ${variable}.`);
	}

	return home;
}
