import { readdir } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { join } from "node:path";
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
	createAgentSession,
	DefaultResourceLoader,
	ModelRuntime,
	SessionManager,
	SettingsManager,
	type AgentSession,
	type ExtensionFactory,
} from "@earendil-works/pi-coding-agent";
import { FileCredentialStore, defaultDfHome } from "../credentials.ts";
import type { Candidate } from "../failover.ts";
import { materializeCatalogModels, type CatalogResult } from "../models/catalog.ts";
import type { ProviderConfig } from "../providers/schema.ts";
import { policyExtension, ToolPolicy, type ToolPolicyOptions } from "./tools.ts";

const isolatedAuthContext: AuthContext = {
	env: async (_name: string) => undefined,
	fileExists: async (_path: string) => false,
};

/**
 * Resolve generated provider headers based on the provider configuration and session values.
 *
 * @param config - Provider configuration that may define generated headers.
 * @param sessionId - Identifier of the current runtime session.
 * @param sessionValues - Map storing values generated for the session scope.
 * @returns A map of header names to their resolved values.
 */
export function resolveGeneratedHeaders(config: ProviderConfig | undefined, sessionId: string, sessionValues: Map<string, string>): ProviderHeaders {
	const result: ProviderHeaders = {};
	const requestValues = new Map<string, string>();
	for (const [header, spec] of Object.entries(config?.generatedHeaders ?? {})) {
		const values = spec.scope === "session" ? sessionValues : requestValues;
		const key = `${config!.id}:${spec.group ?? header}`;
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

	modify(providerId: string, fn: (current: Credential | undefined) => Promise<Credential | undefined>, options?: AuthOperationOptions): Promise<Credential | undefined> {
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
	return {
		...provider,
		auth: {
			...provider.auth,
			...(apiKey ? {
				apiKey: {
					...apiKey,
					...(apiKey.check ? { check: (input) => apiKey.check!({ ...input, ctx: isolatedAuthContext }) } : {}),
					resolve: (input) => apiKey.resolve({ ...input, ctx: isolatedAuthContext }),
				},
			} : {}),
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
	if (matches.length !== 1) throw new Error(matches.length === 0 ? `Session not found: ${id}` : `Ambiguous session id: ${id}`);
	return join(sessionDir, matches[0]!);
}

/**
 * Snapshot of an HTTP response produced by a provider.
 */
export interface ResponseSnapshot {
	/** HTTP status code of the response. */
	status: number;
	/** Header map of the response (name to value). */
	headers: Record<string, string>;
}

/**
 * Options for creating a HarnessRuntime.
 */
export interface HarnessRuntimeOptions {
	/** Current working directory for the runtime. */
	cwd: string;
	/** Candidate to be executed by the runtime. */
	candidate: Candidate;
	/** Optional home directory for DF; defaults to standard location. */
	home?: string;
	/** Optional session ID to resume from a previous run. */
	resume?: string;
	/** Optional tool policy configuration (excluding cwd). */
	policy?: Omit<ToolPolicyOptions, "cwd">;
	/** Additional providers to register in the runtime. */
	providers?: readonly Provider[];
	/** Provider IDs for which authentication validation is skipped. */
	authOptionalProviders?: readonly string[];
	/** Map of provider IDs to catalog results to augment model set. */
	catalogs?: ReadonlyMap<string, CatalogResult>;
	/** Credential store to use; defaults to new store in home. */
	store?: FileCredentialStore;
	/** Provider configuration map used for request header generation and limits. */
	providerConfigs?: ReadonlyMap<string, ProviderConfig>;
}

/**
 * Represents the runtime environment for a candidate execution.
 */
export interface HarnessRuntime {
	/** Active AgentSession for the runtime. */
	session: AgentSession;
	/** ModelRuntime instance managing models and providers. */
	modelRuntime: ModelRuntime;
	/** Credential store used by the runtime. */
	store: FileCredentialStore;
	/** Validate that required credentials are present for the candidate. */
	validateCandidate(candidate: Candidate): Promise<void>;
	/** Bind a new candidate to the runtime, updating credentials and session model. */
	bindCandidate(candidate: Candidate): Promise<void>;
	/** Retrieve and clear buffered response snapshots from provider calls. */
	takeResponses(): ResponseSnapshot[];
	/** Perform a lightweight probe request to verify provider availability and limits. Returns true if successful. */
	probeCandidate(candidate: Candidate): Promise<boolean>;
}

/**
 * Validate that the required credentials are present for the given candidate.
 *
 * @param store - Credential store containing stored credentials.
 * @param candidate - The candidate whose credentials are being validated.
 * @param config - Provider configuration that may specify required credential slots.
 * @param authOptional - If true, skip validation for optional providers.
 * @throws When required credentials are missing or required slots are absent.
 */
export async function validateCandidateCredentials(
	store: FileCredentialStore,
	candidate: Candidate,
	config: ProviderConfig | undefined,
	authOptional: boolean,
): Promise<void> {
	if (authOptional) return;
	const credential = await store.forAccount(candidate.provider, candidate.account).read(candidate.provider);
	if (!credential) {
		const error = new Error(`No credentials for ${candidate.provider}/${candidate.account}`) as Error & { code: string };
		error.code = "auth";
		throw error;
	}
	const account = await store.readAccount(`${candidate.provider}:${candidate.account}`);
	for (const slot of config?.requiredCredentialSlots ?? []) {
		if (slot === "api_key" && credential.type === "api_key") continue;
		if (slot === "oauth" && credential.type === "oauth") continue;
		if (!account?.slots[slot]) {
			const error = new Error(`Account ${candidate.provider}/${candidate.account} is missing required slot ${slot}`) as Error & { code: string };
			error.code = "auth";
			throw error;
		}
	}
}

/**
 * Creates a test harness runtime for candidate execution without consulting real pi auth.json,
 * ambient token environment variables, or real pi directories. This runtime is isolated and
 * suitable for testing harness functionality without external dependencies.
 *
 * @param options - Configuration for the runtime including working directory, candidate, and optional settings.
 * @returns A HarnessRuntime instance with session, modelRuntime, store, and candidate management methods.
 */
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
		noSkills: true,
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
			await validateCandidateCredentials(store, candidate, options.providerConfigs?.get(candidate.provider), authOptional.has(candidate.provider));
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
			const rawHeaders = { ...(config.staticHeaders ?? {}), ...(await store.requestHeaders(candidate.provider, candidate.account, config.slotHeaders)) };
			const headers = Object.fromEntries(Object.entries(rawHeaders).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
			const credential = await store.forAccount(candidate.provider, candidate.account).read(candidate.provider);
			const auth = config.auth[0];
			let url = new URL(probe.path, `${config.baseUrl.replace(/\/$/u, "")}/`);
			if (credential?.type === "api_key" && credential.key && auth?.kind === "api_key") {
				if (auth.placement === "bearer") headers.authorization = `Bearer ${credential.key}`;
				else if (auth.placement === "header") headers[auth.name ?? "x-api-key"] = credential.key;
				else url.searchParams.set(auth.name ?? "key", credential.key);
			} else if (credential?.type === "oauth" && credential.access) headers.authorization = `Bearer ${credential.access}`;
			try {
				const result = await fetch(url, { method: probe.method ?? "GET", headers, ...(probe.method === "POST" ? { body: "{}" } : {}) });
				return result.ok;
			} catch { return false; }
		},
	};
}
