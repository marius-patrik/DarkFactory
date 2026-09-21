import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Credential, Model, Provider, ProviderHeaders } from "@earendil-works/pi-ai";
import { defaultDfHome, FileCredentialStore } from "@darkfactory/keychain";
import type { ModelListConfig, ProviderConfig } from "../providers/schema.ts";
import { replaceFile } from "../storage/replace-file.ts";

export const DEFAULT_MODEL_CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const PI_CATALOG_BASE_URL = "https://pi.dev";

const DIALECT_DEFAULTS: Record<string, ModelListConfig> = {
	"openai-completions": { path: "/models", method: "GET", itemsPath: "data", idPath: "id", namePath: "display_name" },
	"openai-responses": { path: "/models", method: "GET", itemsPath: "data", idPath: "id", namePath: "display_name" },
	"google-generative-ai": {
		path: "/models",
		method: "GET",
		itemsPath: "models",
		idPath: "name",
		namePath: "displayName",
		stripIdPrefix: "models/",
		methodsPath: "supportedGenerationMethods",
	},
	"anthropic-messages": {
		path: "/v1/models",
		method: "GET",
		itemsPath: "data",
		idPath: "id",
		namePath: "display_name",
	},
};

export interface CatalogModel {
	id: string;
	name: string;
	supportedMethods?: string[];
	/** Optional metadata fields */
	contextLength?: number;
	modalities?: string[];
	tools?: boolean;
	pricing?: { prompt?: string; completion?: string; free?: boolean };
}

interface CatalogFile {
	version: 1;
	provider: string;
	fetchedAt: number;
	models: CatalogModel[];
}

export interface CatalogResult {
	provider: string;
	models: CatalogModel[];
	source: "live" | "cache" | "builtin";
	fetchedAt?: number;
	/** Set when a live refresh failed and a cached catalog was served instead. */
	error?: string;
}

export type CatalogFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface ModelCatalogOptions {
	home?: string;
	providers: readonly Provider[];
	providerConfigs?: readonly ProviderConfig[];
	store?: FileCredentialStore;
	fetch?: CatalogFetch;
	ttlMs?: number;
	offline?: boolean;
	now?: () => number;
}

function nonEmpty(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function modelMetadata(item: Record<string, unknown>, id: string, supportedMethods?: string[]): Partial<CatalogModel> {
	const contextLength = [item.context_length, item.inputTokenLimit, item.context_window].find(
		(value): value is number => typeof value === "number",
	);
	let modalities: string[] | undefined;
	if (Array.isArray(item.modalities))
		modalities = item.modalities.filter((value): value is string => typeof value === "string");
	else if (Array.isArray(item.tasks))
		modalities = item.tasks.filter((value): value is string => typeof value === "string");
	else if (supportedMethods)
		modalities = supportedMethods
			.map((method) => (method === "generateContent" ? "text" : method === "predict" ? "image" : undefined))
			.filter((value) => typeof value === "string") as string[];
	const tools = Array.isArray(item.supported_parameters) && item.supported_parameters.includes("tools");
	let pricing: CatalogModel["pricing"];
	const free = id.includes(":free") || id.includes("-free");
	if (item.pricing && typeof item.pricing === "object") {
		const raw = item.pricing as Record<string, unknown>;
		const prompt = typeof raw.prompt === "string" ? raw.prompt : undefined;
		const completion = typeof raw.completion === "string" ? raw.completion : undefined;
		if (prompt !== undefined || completion !== undefined || free || prompt === "0")
			pricing = {
				...(prompt !== undefined ? { prompt } : {}),
				...(completion !== undefined ? { completion } : {}),
				...(prompt === "0" || free ? { free: true } : {}),
			};
	} else if (free) pricing = { free: true };
	return {
		...(contextLength !== undefined ? { contextLength } : {}),
		...(modalities?.length ? { modalities: [...new Set(modalities)] } : {}),
		...(tools ? { tools: true } : {}),
		...(pricing ? { pricing } : {}),
	};
}

function candidateModel(value: unknown, key?: string): CatalogModel | undefined {
	if (typeof value === "string") return { id: value, name: value };
	if (!value || typeof value !== "object") return undefined;
	const item = value as Record<string, unknown>;
	const nested = item.model && typeof item.model === "object" ? (item.model as Record<string, unknown>) : undefined;
	const config =
		item.modelConfig && typeof item.modelConfig === "object"
			? (item.modelConfig as Record<string, unknown>)
			: undefined;
	const rawId =
		nonEmpty(item.id) ??
		nonEmpty(item.modelId) ??
		nonEmpty(item.modelConfigId) ??
		nonEmpty(config?.id) ??
		nonEmpty(nested?.id) ??
		nonEmpty(item.name) ??
		nonEmpty(key);
	if (!rawId) return undefined;
	const id = rawId.startsWith("models/") ? rawId.slice("models/".length) : rawId;
	if (!id) return undefined;
	const name =
		nonEmpty(item.display_name) ??
		nonEmpty(item.displayName) ??
		nonEmpty(config?.displayName) ??
		nonEmpty(nested?.displayName) ??
		nonEmpty(item.name) ??
		id;
	const rawMethods = item.supportedGenerationMethods ?? item.supportedMethods;
	const supportedMethods = Array.isArray(rawMethods)
		? rawMethods.filter((method): method is string => typeof method === "string" && method.length > 0)
		: undefined;
	return {
		id,
		name,
		...(supportedMethods?.length ? { supportedMethods: [...new Set(supportedMethods)].sort() } : {}),
		...modelMetadata(item, id, supportedMethods),
	};
}

/** Normalizes OpenAI, Anthropic, Google, pi.dev, and Antigravity catalog envelopes. */
function pathValues(value: unknown, path: string): Array<{ key?: string; value: unknown }> {
	let current: Array<{ key?: string; value: unknown }> = [{ value }];
	for (const part of path.split(".").filter(Boolean)) {
		const next: Array<{ key?: string; value: unknown }> = [];
		for (const item of current) {
			if (part === "*" && Array.isArray(item.value))
				item.value.forEach((entry, key) => {
					next.push({ key: String(key), value: entry });
				});
			else if (part === "*" && item.value && typeof item.value === "object")
				Object.entries(item.value as Record<string, unknown>).forEach(([key, entry]) => {
					next.push({ key, value: entry });
				});
			else if (item.value && typeof item.value === "object" && part in item.value)
				next.push({ key: item.key, value: (item.value as Record<string, unknown>)[part] });
		}
		current = next;
	}
	return current;
}

function mappedString(value: unknown, path: string | undefined, key?: string): string | undefined {
	if (path === "$key") return nonEmpty(key);
	if (!path) return undefined;
	return nonEmpty(pathValues(value, path)[0]?.value);
}

export function normalizeConfiguredCatalog(provider: string, value: unknown, mapping: ModelListConfig): CatalogModel[] {
	const raw = pathValues(value, mapping.itemsPath);
	const entries =
		raw.length === 1 && Array.isArray(raw[0]?.value)
			? (raw[0]!.value as unknown[]).map((entry, index) => ({ key: String(index), value: entry }))
			: raw.length === 1 && raw[0]?.value && typeof raw[0].value === "object"
				? Object.entries(raw[0].value as Record<string, unknown>).map(([key, entry]) => ({ key, value: entry }))
				: raw;
	const byId = new Map<string, CatalogModel>();
	for (const entry of entries) {
		const rawId = mappedString(entry.value, mapping.idPath, entry.key);
		if (!rawId) continue;
		const id =
			mapping.stripIdPrefix && rawId.startsWith(mapping.stripIdPrefix)
				? rawId.slice(mapping.stripIdPrefix.length)
				: rawId;
		if (!id) continue;
		const entryRecord =
			entry.value && typeof entry.value === "object" ? (entry.value as Record<string, unknown>) : undefined;
		const methodsValue = mapping.methodsPath
			? pathValues(entry.value, mapping.methodsPath)[0]?.value
			: (entryRecord?.supportedGenerationMethods ?? entryRecord?.supportedMethods);
		const methods = Array.isArray(methodsValue)
			? methodsValue.filter((item): item is string => typeof item === "string" && !!item)
			: undefined;
		byId.set(id, {
			id,
			name: mappedString(entry.value, mapping.namePath, entry.key) ?? id,
			...(methods?.length ? { supportedMethods: [...new Set(methods)].sort() } : {}),
			...modelMetadata(entryRecord ?? {}, id, methods),
		});
	}
	if (byId.size === 0) throw new Error(`Model catalog for provider ${provider} contained no valid models`);
	return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Backward-compatible loose normalization; configured providers use explicit paths. */
export function normalizeCatalogResponse(provider: string, value: unknown): CatalogModel[] {
	let entries: Array<[string | undefined, unknown]> | undefined;
	if (Array.isArray(value)) entries = value.map((entry) => [undefined, entry]);
	else if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		const envelope = [record.data, record.models, record.availableModels, record.modelConfigs].find(Array.isArray);
		if (Array.isArray(envelope)) entries = envelope.map((entry) => [undefined, entry]);
		else if (record.models && typeof record.models === "object")
			entries = Object.entries(record.models as Record<string, unknown>);
		else if (record.availableModels && typeof record.availableModels === "object")
			entries = Object.entries(record.availableModels as Record<string, unknown>);
		else entries = Object.entries(record);
	}
	if (!entries) throw new Error(`Invalid model catalog for provider ${provider}`);
	const byId = new Map<string, CatalogModel>();
	for (const [key, entry] of entries) {
		const model = candidateModel(entry, key);
		if (model) byId.set(model.id, model);
	}
	if (byId.size === 0) throw new Error(`Model catalog for provider ${provider} contained no valid models`);
	return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function parseCache(provider: string, value: unknown): CatalogFile {
	if (!value || typeof value !== "object") throw new Error(`Invalid cached model catalog for ${provider}`);
	const file = value as Partial<CatalogFile>;
	if (
		file.version !== 1 ||
		file.provider !== provider ||
		typeof file.fetchedAt !== "number" ||
		!Array.isArray(file.models)
	) {
		throw new Error(`Invalid cached model catalog for ${provider}`);
	}
	const models = file.models.map((entry) => candidateModel(entry)).filter((entry): entry is CatalogModel => !!entry);
	if (models.length !== file.models.length || models.length === 0)
		throw new Error(`Invalid cached model catalog for ${provider}`);
	return { version: 1, provider, fetchedAt: file.fetchedAt, models };
}

function authParts(
	credential: Credential | undefined,
	config: ProviderConfig | undefined,
): { headers: ProviderHeaders; query: Record<string, string> } {
	if (!credential) return { headers: {}, query: {} };
	const secret = credential.type === "oauth" ? credential.access : credential.key;
	if (!secret) return { headers: {}, query: {} };
	if (credential.type === "oauth") return { headers: { Authorization: `Bearer ${secret}` }, query: {} };
	const auth = config?.auth.find((entry) => entry.kind === "api_key");
	if (auth?.placement === "header") return { headers: { [auth.name ?? "x-api-key"]: secret }, query: {} };
	if (auth?.placement === "query") return { headers: {}, query: { [auth.name ?? "key"]: secret } };
	return { headers: { Authorization: `Bearer ${secret}` }, query: {} };
}

function mergeHeaders(...sets: ProviderHeaders[]): Headers {
	const headers = new Headers({ accept: "application/json" });
	for (const set of sets)
		for (const [name, value] of Object.entries(set)) {
			if (value === null) headers.delete(name);
			else headers.set(name, value);
		}
	return headers;
}

export class ModelCatalog {
	private readonly home: string;
	private readonly providers: Map<string, Provider>;
	private readonly configs: Map<string, ProviderConfig>;
	private readonly store: FileCredentialStore;
	private readonly fetcher: CatalogFetch;
	private readonly ttlMs: number;
	private readonly offline: boolean;
	private readonly now: () => number;

	constructor(options: ModelCatalogOptions) {
		this.home = options.home ?? defaultDfHome();
		this.providers = new Map(options.providers.map((provider) => [provider.id, provider]));
		this.configs = new Map((options.providerConfigs ?? []).map((provider) => [provider.id, provider]));
		this.store = options.store ?? new FileCredentialStore(this.home);
		this.fetcher = options.fetch ?? globalThis.fetch;
		this.ttlMs = options.ttlMs ?? DEFAULT_MODEL_CATALOG_TTL_MS;
		this.offline = options.offline ?? false;
		this.now = options.now ?? Date.now;
	}

	private path(provider: string): string {
		if (!/^[A-Za-z0-9._-]+$/u.test(provider)) throw new Error(`Invalid provider id: ${provider}`);
		return join(this.home, "models", `${provider}.df`);
	}

	private async cached(provider: string): Promise<CatalogFile | undefined> {
		try {
			return parseCache(provider, JSON.parse(await readFile(this.path(provider), "utf8")) as unknown);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			if (error instanceof SyntaxError) throw new Error(`Invalid cached model catalog JSON for ${provider}`);
			throw error;
		}
	}

	private async save(file: CatalogFile): Promise<void> {
		const path = this.path(file.provider);
		await mkdir(dirname(path), { recursive: true });
		const temporary = `${path}.${process.pid}.${crypto.randomUUID()}.tmp.df`;
		await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
		await replaceFile(temporary, path);
	}

	private async accountCredential(provider: string, account?: string): Promise<Credential | undefined> {
		if (!account) return undefined;
		return this.store.forAccount(provider, account).read(provider);
	}

	private async piDiscovery(provider: Provider, credential: Credential | undefined): Promise<CatalogModel[]> {
		if (!provider.refreshModels) throw new Error(`Provider ${provider.id} has no pi model discovery`);
		let published: readonly Model<any>[] | undefined;
		await provider.refreshModels({
			credential,
			allowNetwork: true,
			force: true,
			signal: AbortSignal.timeout(15_000),
			stored: undefined,
			async publish(value) {
				value.update?.();
				if (value.persist) published = value.persist.models;
				return true;
			},
		});
		return normalizeCatalogResponse(provider.id, published ?? provider.getModels());
	}

	private async live(provider: Provider, account?: string): Promise<CatalogModel[]> {
		const credential = await this.accountCredential(provider.id, account);
		const config = this.configs.get(provider.id);
		if (!config) {
			if (provider.refreshModels) return this.piDiscovery(provider, credential);
			const response = await this.fetcher(
				`${PI_CATALOG_BASE_URL}/api/models/providers/${encodeURIComponent(provider.id)}`,
				{ signal: AbortSignal.timeout(15_000) },
			);
			if (!response.ok) throw new Error(`Model catalog request failed for ${provider.id}: HTTP ${response.status}`);
			return normalizeCatalogResponse(provider.id, await response.json());
		}
		const mapping = config.models.list ?? DIALECT_DEFAULTS[config.dialect];
		if (!mapping) return provider.getModels().map((entry) => ({ id: entry.id, name: entry.name }));
		const target = { url: `${config.baseUrl.replace(/\/$/u, "")}${mapping.path}`, method: mapping.method ?? "GET" };
		const extras = account ? await this.store.requestHeaders(provider.id, account) : {};
		const auth = authParts(credential, config);
		const headers = mergeHeaders(config.staticHeaders ?? {}, auth.headers, extras);
		const bodyObject = mapping.body ? structuredClone(mapping.body) : undefined;
		if (bodyObject)
			for (const [key, value] of Object.entries(bodyObject)) {
				if (typeof value === "string" && value.startsWith("$slot:")) {
					const slot = value.slice("$slot:".length);
					const replacement = headers.get(slot);
					if (!replacement) throw new Error(`Model catalog for ${provider.id} requires slot ${slot}`);
					bodyObject[key] = replacement;
					headers.delete(slot);
				}
			}
		const body = bodyObject ? JSON.stringify(bodyObject) : undefined;
		if (body) headers.set("content-type", "application/json");
		const models = new Map<string, CatalogModel>();
		let pageToken: string | undefined;
		const seenTokens = new Set<string>();
		do {
			const url = new URL(target.url);
			for (const [name, value] of Object.entries(auth.query)) url.searchParams.set(name, value);
			if (pageToken) url.searchParams.set(mapping.pageTokenParam ?? "pageToken", pageToken);
			const response = await this.fetcher(url, {
				method: target.method,
				headers,
				...(body ? { body } : {}),
				signal: AbortSignal.timeout(15_000),
			});
			if (!response.ok) throw new Error(`Model catalog request failed for ${provider.id}: HTTP ${response.status}`);
			let payload: unknown;
			try {
				payload = await response.json();
			} catch {
				throw new Error(`Model catalog response was not JSON for ${provider.id}`);
			}
			for (const model of normalizeConfiguredCatalog(provider.id, payload, mapping)) models.set(model.id, model);
			const next = mapping.nextPageTokenPath ? mappedString(payload, mapping.nextPageTokenPath) : undefined;
			if (next && seenTokens.has(next)) throw new Error(`Model catalog for ${provider.id} repeated a page token`);
			if (next) seenTokens.add(next);
			pageToken = next;
		} while (pageToken);
		return [...models.values()].sort((a, b) => a.id.localeCompare(b.id));
	}

	async get(providerId: string, options: { account?: string; refresh?: boolean } = {}): Promise<CatalogResult> {
		const provider = this.providers.get(providerId);
		if (!provider) throw new Error(`Unknown provider ${providerId}`);
		// Providers with no catalog endpoint have an upstream-maintained static catalog.
		// Never let a prior cached static revision hide newly shipped models.
		if (
			this.configs.get(providerId) &&
			!this.configs.get(providerId)?.models.list &&
			!DIALECT_DEFAULTS[this.configs.get(providerId)!.dialect]
		) {
			return {
				provider: providerId,
				models: provider.getModels().map((model) => ({ id: model.id, name: model.name })),
				source: "builtin",
			};
		}
		const cached = await this.cached(providerId);
		if (this.offline) {
			if (cached) return { provider: providerId, models: cached.models, source: "cache", fetchedAt: cached.fetchedAt };
			return {
				provider: providerId,
				models: provider.getModels().map((model) => ({ id: model.id, name: model.name })),
				source: "builtin",
			};
		}
		if (!options.refresh && cached && this.now() - cached.fetchedAt < this.ttlMs) {
			return { provider: providerId, models: cached.models, source: "cache", fetchedAt: cached.fetchedAt };
		}
		try {
			const models = await this.live(provider, options.account);
			const file: CatalogFile = { version: 1, provider: providerId, fetchedAt: this.now(), models };
			await this.save(file);
			return { provider: providerId, models, source: "live", fetchedAt: file.fetchedAt };
		} catch (error) {
			if (cached)
				return {
					provider: providerId,
					models: cached.models,
					source: "cache",
					fetchedAt: cached.fetchedAt,
					error: error instanceof Error ? error.message : String(error),
				};
			throw error;
		}
	}
}

export function materializeCatalogModels(provider: Provider, catalog: CatalogResult): Model<any>[] {
	const builtins = provider.getModels();
	const fallback = builtins[0];
	return catalog.models.filter(isRunnableCatalogModel).flatMap((entry) => {
		const known = builtins.find((model) => model.id === entry.id);
		const template = known ?? fallback;
		return template ? [{ ...template, id: entry.id, name: entry.name, provider: provider.id }] : [];
	});
}

export function isRunnableCatalogModel(model: CatalogModel): boolean {
	return (
		!model.supportedMethods ||
		model.supportedMethods.some((method) => method === "generateContent" || method === "streamGenerateContent")
	);
}
