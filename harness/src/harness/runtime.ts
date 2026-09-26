import { randomBytes, randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { defaultDfHome, FileCredentialStore } from "@darkfactory/keychain";
import type {
	AuthContext,
	AuthOperationOptions,
	Credential,
	CredentialInfo,
	CredentialStore,
	Provider,
	ProviderHeaders,
} from "@earendil-works/pi-ai";
import {
	type AgentSession,
	createAgentSession,
	DefaultResourceLoader,
	type ExtensionFactory,
	ModelRuntime,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";
import type { Candidate } from "../failover.ts";
import { type CatalogResult, materializeCatalogModels } from "../models/catalog.ts";
import type { ProviderConfig } from "../providers/schema.ts";
import { policyExtension, ToolPolicy, type ToolPolicyOptions } from "./tools.ts";

const isolatedAuthContext: AuthContext = {
	env: async (_name: string) => undefined,
	fileExists: async (_path: string) => false,
};

export function resolveGeneratedHeaders(
	config: ProviderConfig | undefined,
	sessionId: string,
	sessionValues: Map<string, string>,
): ProviderHeaders {
	const result: ProviderHeaders = {};
	const requestValues = new Map<string, string>();
	for (const [header, spec] of Object.entries(config?.generatedHeaders ?? {})) {
		const values = spec.scope === "session" ? sessionValues : requestValues;
		const key = `${config?.id}:${spec.group ?? header}`;
		let value = values.get(key);
		if (!value) {
			if (spec.kind === "session-id") value = sessionId;
			else if (spec.kind === "request-id") value = randomUUID();
			else {
				const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
				const bytes = randomBytes(spec.length ?? 26);
				value = `${spec.prefix ?? ""}${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join("")}`;
			}
			values.set(key, value);
		}
		result[header] = value;
	}
	return result;
}

class RebindableCredentialStore implements CredentialStore {
	private delegate?: CredentialStore;
	private provider?: string;

	bind(provider: string, delegate: CredentialStore): void {
		this.provider = provider;
		this.delegate = delegate;
	}

	private selected(providerId: string): CredentialStore | undefined {
		return providerId === this.provider ? this.delegate : undefined;
	}

	read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
		return this.selected(providerId)?.read(providerId, options) ?? Promise.resolve(undefined);
	}

	list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]> {
		return this.delegate?.list(options) ?? Promise.resolve([]);
	}

	modify(
		providerId: string,
		fn: (current: Credential | undefined) => Promise<Credential | undefined>,
		options?: AuthOperationOptions,
	): Promise<Credential | undefined> {
		const store = this.selected(providerId);
		if (!store) throw new Error(`No df account is bound for provider ${providerId}`);
		return store.modify(providerId, fn, options);
	}

	delete(providerId: string, options?: AuthOperationOptions): Promise<void> {
		const store = this.selected(providerId);
		if (!store) return Promise.resolve();
		return store.delete(providerId, options);
	}
}

function isolateAmbientAuth(provider: Provider): Provider {
	const apiKey = provider.auth.apiKey;
	// A provider with no api-key resolver has nothing to isolate, and returning it untouched keeps
	// `auth` assignable — a conditional spread would widen `apiKey` back to optional.
	if (!apiKey) return provider;
	// Bound so the wrapper is a definite call: `apiKey.check?.(…)` would widen the result to
	// `Promise<AuthCheck> | undefined`, which does not satisfy ApiKeyAuth["check"].
	const check = apiKey.check;
	return {
		...provider,
		auth: {
			...provider.auth,
			apiKey: {
				...apiKey,
				...(check
					? { check: (input: Parameters<typeof check>[0]) => check({ ...input, ctx: isolatedAuthContext }) }
					: {}),
				resolve: (input: Parameters<typeof apiKey.resolve>[0]) =>
					apiKey.resolve({ ...input, ctx: isolatedAuthContext }),
			},
		},
	};
}

async function sessionFileForId(sessionDir: string, id: string): Promise<string> {
	if (!/^[A-Za-z0-9_-]+$/u.test(id)) throw new Error("Invalid session id");
	let files: string[];
	try {
		files = await readdir(sessionDir);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Session not found: ${id}`);
		throw error;
	}
	const matches = files.filter((file) => file.endsWith(`_${id}.jsonl`));
	if (matches.length !== 1)
		throw new Error(matches.length === 0 ? `Session not found: ${id}` : `Ambiguous session id: ${id}`);
	return join(sessionDir, matches[0]!);
}

export interface ResponseSnapshot {
	status: number;
	headers: Record<string, string>;
}

export interface HarnessRuntimeOptions {
	cwd: string;
	candidate: Candidate;
	home?: string;
	resume?: string;
	policy?: Omit<ToolPolicyOptions, "cwd">;
	providers?: readonly Provider[];
	authOptionalProviders?: readonly string[];
	catalogs?: ReadonlyMap<string, CatalogResult>;
	store?: FileCredentialStore;
	providerConfigs?: ReadonlyMap<string, ProviderConfig>;
	/** Skills to load as context for this run, by name (`.agents/skills/<name>` in `cwd`). */
	skills?: readonly string[];
}

/**
 * Resolves named skills to their installed directories. Names are plain identifiers, so a name can never point outside
 * `.agents/skills`.
 *
 * @param cwd - Repository working directory.
 * @param skills - Skill names from the run or graph node.
 * @returns Absolute skill directories, in the given order.
 * @throws Error when a name is not a lowercase identifier.
 */
export function namedSkillPaths(cwd: string, skills: readonly string[] = []): string[] {
	return skills.map((name) => {
		if (!/^[a-z0-9][a-z0-9-]*$/u.test(name)) throw new Error(`Invalid skill name: ${name}`);
		return join(cwd, ".agents", "skills", name);
	});
}

export interface HarnessRuntime {
	session: AgentSession;
	modelRuntime: ModelRuntime;
	store: FileCredentialStore;
	validateCandidate(candidate: Candidate): Promise<void>;
	bindCandidate(candidate: Candidate): Promise<void>;
	takeResponses(): ResponseSnapshot[];
	probeCandidate(candidate: Candidate): Promise<boolean>;
}

export async function validateCandidateCredentials(
	store: FileCredentialStore,
	candidate: Candidate,
	config: ProviderConfig | undefined,
	authOptional: boolean,
): Promise<void> {
	if (authOptional) return;
	const credential = await store.forAccount(candidate.provider, candidate.account).read(candidate.provider);
	if (!credential) {
		const error = new Error(`No credentials for ${candidate.provider}/${candidate.account}`) as Error & {
			code: string;
		};
		error.code = "auth";
		throw error;
	}
	const account = await store.readAccount(`${candidate.provider}:${candidate.account}`);
	for (const slot of config?.requiredCredentialSlots ?? []) {
		if (slot === "api_key" && credential.type === "api_key") continue;
		if (slot === "oauth" && credential.type === "oauth") continue;
		if (!account?.slots[slot]) {
			const error = new Error(
				`Account ${candidate.provider}/${candidate.account} is missing required slot ${slot}`,
			) as Error & { code: string };
			error.code = "auth";
			throw error;
		}
	}
}

/** Creates an SDK AgentSession without consulting pi auth.json, ambient token env, or real pi directories. */
export async function createHarnessRuntime(options: HarnessRuntimeOptions): Promise<HarnessRuntime> {
	const home = options.home ?? defaultDfHome();
	const agentDir = join(home, "pi-agent");
	const sessionDir = join(home, "sessions");
	const store = options.store ?? new FileCredentialStore(home);
	const credentials = new RebindableCredentialStore();
	const modelRuntime = await ModelRuntime.create({
		credentials,
		modelsPath: join(agentDir, "models.json"),
		modelsStorePath: join(agentDir, "models-store.json"),
		allowModelNetwork: false,
		refreshOnCreate: false,
	});

	// Replace built-ins with auth-equivalent providers whose ambient lookup context is empty.
	for (const provider of modelRuntime.getProviders()) modelRuntime.registerNativeProvider(isolateAmbientAuth(provider));
	for (const provider of options.providers ?? []) modelRuntime.registerNativeProvider(isolateAmbientAuth(provider));
	for (const [providerId, catalog] of options.catalogs ?? []) {
		const provider = modelRuntime.getProvider(providerId);
		if (!provider) throw new Error(`Catalog references unknown provider ${providerId}`);
		const models = materializeCatalogModels(provider, catalog);
		if (models.length === 0) throw new Error(`Catalog for ${providerId} has no runnable model definitions`);
		modelRuntime.registerNativeProvider(isolateAmbientAuth({ ...provider, getModels: () => models }));
	}

	let selected = options.candidate;
	let responses: ResponseSnapshot[] = [];
	let runtimeSessionId = "";
	const generatedForSession = new Map<string, string>();
	const authOptional = new Set(options.authOptionalProviders ?? []);
	const policy = new ToolPolicy({ cwd: options.cwd, ...options.policy });
	const runtimeExtension: ExtensionFactory = (pi) => {
		pi.on("before_provider_headers", async (event) => {
			const providerConfig = options.providerConfigs?.get(selected.provider);
			const extra = await store.requestHeaders(selected.provider, selected.account, providerConfig?.slotHeaders);
			Object.assign(extra, resolveGeneratedHeaders(providerConfig, runtimeSessionId, generatedForSession));
			for (const [name, value] of Object.entries(extra)) event.headers[name] = value;
		});
		pi.on("after_provider_response", (event) => {
			responses.push({ status: event.status, headers: event.headers });
		});
	};
	const settingsManager = SettingsManager.inMemory({
		retry: { enabled: false, maxRetries: 0, provider: { maxRetries: 0, maxRetryDelayMs: 1_000 } },
		compaction: { enabled: false },
		defaultProjectTrust: "never",
	});
	const resourceLoader = new DefaultResourceLoader({
		cwd: options.cwd,
		agentDir,
		settingsManager,
		extensionFactories: [
			{ name: "df-runtime", factory: runtimeExtension, hidden: true },
			{ name: "df-policy", factory: policyExtension(policy), hidden: true },
		],
		noExtensions: true,
		// Discovery stays off: only the skills a run or graph node names are loaded, from the repository's installed
		// copies (.agents/skills/<name>, written by df ci install). Skills are context, never policy overrides.
		noSkills: true,
		additionalSkillPaths: namedSkillPaths(options.cwd, options.skills),
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
	});
	await resourceLoader.reload();

	async function bindCandidate(candidate: Candidate): Promise<void> {
		const model = modelRuntime.getModel(candidate.provider, candidate.model);
		if (!model) throw new Error(`Unknown model ${candidate.provider}/${candidate.model}`);
		selected = candidate;
		credentials.bind(candidate.provider, store.forAccount(candidate.provider, candidate.account));
		responses = [];
	}

	await bindCandidate(selected);
	const initialModel = modelRuntime.getModel(selected.provider, selected.model)!;
	const sessionManager = options.resume
		? SessionManager.open(await sessionFileForId(sessionDir, options.resume), sessionDir, options.cwd)
		: SessionManager.create(options.cwd, sessionDir);
	const { session } = await createAgentSession({
		cwd: options.cwd,
		agentDir,
		modelRuntime,
		model: initialModel,
		sessionManager,
		settingsManager,
		resourceLoader,
		tools: ["read", "write", "edit", "bash"],
	});
	runtimeSessionId = session.sessionId;

	return {
		session,
		modelRuntime,
		store,
		async validateCandidate(candidate) {
			await validateCandidateCredentials(
				store,
				candidate,
				options.providerConfigs?.get(candidate.provider),
				authOptional.has(candidate.provider),
			);
		},
		async bindCandidate(candidate) {
			await bindCandidate(candidate);
			await session.setModel(modelRuntime.getModel(candidate.provider, candidate.model)!);
		},
		takeResponses() {
			const value = responses;
			responses = [];
			return value;
		},
		async probeCandidate(candidate) {
			const config = options.providerConfigs?.get(candidate.provider);
			const probe = config?.limits?.probe;
			if (!config || !probe?.enabled) return true;
			const rawHeaders = {
				...(config.staticHeaders ?? {}),
				...(await store.requestHeaders(candidate.provider, candidate.account, config.slotHeaders)),
			};
			const headers = Object.fromEntries(
				Object.entries(rawHeaders).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
			);
			const credential = await store.forAccount(candidate.provider, candidate.account).read(candidate.provider);
			const auth = config.auth[0];
			const url = new URL(probe.path, `${config.baseUrl.replace(/\/$/u, "")}/`);
			if (credential?.type === "api_key" && credential.key && auth?.kind === "api_key") {
				if (auth.placement === "bearer") headers.authorization = `Bearer ${credential.key}`;
				else if (auth.placement === "header") headers[auth.name ?? "x-api-key"] = credential.key;
				else url.searchParams.set(auth.name ?? "key", credential.key);
			} else if (credential?.type === "oauth" && credential.access)
				headers.authorization = `Bearer ${credential.access}`;
			try {
				const result = await fetch(url, {
					method: probe.method ?? "GET",
					headers,
					...(probe.method === "POST" ? { body: "{}" } : {}),
				});
				return result.ok;
			} catch {
				return false;
			}
		},
	};
}
