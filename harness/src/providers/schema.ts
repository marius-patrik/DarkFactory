import { readFile } from "node:fs/promises";
import { join } from "node:path";
import defaults from "../../assets/providers.defaults.json";
import freeProviders from "../../assets/providers.free.json";

export type ProviderDialect = "openai-completions" | "openai-responses" | "openai-codex-responses" | "anthropic-messages" | "google-generative-ai" | "cloudcode-agent";
export type FailureRuleKind = "quota_exhausted" | "rate_limited" | "auth" | "transient" | "fatal";
export type ModelTier = "tight" | "standard" | "bulk";
export type ConfiguredLimitType = "rate" | "daily" | "window" | "monthly" | "overload" | "auth";

export interface ValueReference { value?: string; env?: string }
export interface ApiKeyAuthConfig {
	kind: "api_key";
	slot: string;
	placement: "bearer" | "header" | "query";
	name?: string;
	env?: string[];
	optional?: boolean;
	anonymousValue?: string;
}
export interface OAuthAuthConfig {
	kind: "oauth";
	slot: string;
	flow: "device_code" | "pkce";
	authorizationEndpoint?: string;
	deviceCodeEndpoint?: string;
	tokenEndpoint: string;
	clientId: ValueReference;
	clientSecret?: ValueReference;
	scopes: string[];
	isSubscription?: boolean;
	loginLabel?: string;
	authHeaders?: Record<string, string>;
	accountIdHeader?: string;
	placement?: "bearer" | "api_key";
	tokenEncoding?: "form" | "json";
	redirectUri?: string;
	authorizationParams?: Record<string, string>;
	accountIdJwtClaim?: string[];
}
export type ProviderAuthConfig = ApiKeyAuthConfig | OAuthAuthConfig;

export interface StaticModelConfig {
	id: string;
	name?: string;
	reasoning?: boolean;
	input?: Array<"text" | "image">;
	contextWindow?: number;
	maxTokens?: number;
	tier?: ModelTier;
}
export interface LimitDefaultConfig {
	type: ConfiguredLimitType;
	dimension?: "requests" | "tokens" | "usage";
	limit: number;
	windowMs: number;
	pool?: string;
	source?: "docs" | "observed" | "default";
	reset?: "rolling" | "fixed";
	model?: string;
}
export type LimitNumberSource = "docs" | "community" | "observed" | "default";
export interface DeclaredLimitConfig {
	/** Model id or glob ("*", "*:free"); absent means every model. */
	model?: string;
	type: ConfiguredLimitType | "concurrency";
	dimension?: "requests" | "tokens" | "usage" | "concurrency";
	limit: number;
	windowMs: number;
	reset?: "rolling" | "fixed";
	/** docs = provider documentation, community = third-party list, observed = seen in real responses. */
	source?: LimitNumberSource;
	sourceUrl?: string;
	/** ISO date the number was last checked against its source. */
	checkedAt?: string;
	note?: string;
	/** A pooled limit is shared by every model the pattern matches (same account). */
	pool?: string;
}
/** How a provider can be used for free and where its owner gets access. */
export interface FreeTierConfig {
	kind: "permanent" | "renewable-credits" | "trial-credits" | "anonymous";
	keyUrl: string;
	signupUrl?: string;
	card?: boolean;
	verification?: string;
	credits?: string;
	notes?: string;
	sourceUrl?: string;
	checkedAt?: string;
	data?: DataConfig;
}
export interface LimitBodyRuleConfig {
	type: ConfiguredLimitType;
	regex: string;
	durationRegex?: string;
	resetAfterMs?: number;
	dimension?: "requests" | "tokens" | "usage";
	pool?: string;
}
export interface LimitPolicyConfig {
	observe: boolean;
	standardHeaders?: boolean;
	reserve?: { requests?: number; tokens?: number };
	defaults?: LimitDefaultConfig[];
	declared?: DeclaredLimitConfig[];
	bodyRules?: LimitBodyRuleConfig[];
	probe?: { enabled?: boolean; method?: "GET" | "POST"; path: string };
	/** When the provider's daily quotas roll over; defaults to UTC midnight. */
	dailyReset?: "utc-midnight" | "pacific-midnight";
}
export interface ModelListConfig {
	path: string;
	method?: "GET" | "POST";
	itemsPath: string;
	idPath: string;
	namePath?: string;
	methodsPath?: string;
	stripIdPrefix?: string;
	nextPageTokenPath?: string;
	pageTokenParam?: string;
	body?: Record<string, unknown>;
}
export interface ResetSourceConfig {
	kind: "retry_info" | "header" | "next_pacific_midnight" | "cooldown";
	path?: string;
	header?: string;
	seconds?: number;
	jitterMs?: number;
}
export interface FailureRuleConfig {
	kind: FailureRuleKind;
	statuses?: number[];
	jsonPath?: string;
	equals?: string;
	regex?: string;
	reset?: ResetSourceConfig[];
	pool?: string;
}
/** Optional data‑collection configuration for a provider. */
export interface DataConfig {
    /** How the provider's data is used. */
    collection: "none" | "logging" | "training" | "unknown";
    /** Optional retention period in days. */
    retentionDays?: number;
    /** Source description for the data. */
    source: string;
    /** Optional HTTPS URL to the source of the data. */
    sourceUrl?: string;
    /** When the data source was last checked (ISO date). */
    checkedAt: string;
    /** Optional free‑form note. */
    note?: string;
}export interface ImporterConfig {
	id: string;
	parser: "claude-code" | "codex" | "grok-cli" | "antigravity-keyring" | "kimi-code";
	path?: string;
	keyring?: { service: string; account: string };
	targetProvider: string;
	apiKeyTargetProvider?: string;
	fieldMapping: Record<string, string>;
	formats?: { expires?: "epoch_seconds" | "epoch_milliseconds" | "iso" };
}
export interface GeneratedHeaderConfig {
	kind: "session-id" | "request-id" | "random";
	scope?: "session" | "request";
	group?: string;
	prefix?: string;
	length?: number;
}
export interface LoginHydrationConfig {
	path: string;
	method?: "GET" | "POST";
	headers?: Record<string, string>;
	body?: Record<string, unknown>;
	authorization?: "bearer" | "none";
	responsePath: string;
	targetSlot: string;
	slotType: "header" | "other";
	stripPrefix?: string;
}
export interface ProviderConfig {
	id: string;
	name: string;
	enabled?: boolean;
	dialect: ProviderDialect;
	baseUrl: string;
	auth: ProviderAuthConfig[];
	requiredCredentialSlots: string[];
	staticHeaders?: Record<string, string>;
	generatedHeaders?: Record<string, GeneratedHeaderConfig>;
	slotHeaders?: Record<string, string>;
	models: { static: StaticModelConfig[]; list?: ModelListConfig };
	quota?: { rules: FailureRuleConfig[] };
	limits?: LimitPolicyConfig;
	/** Optional data‑collection configuration for the provider. */
	data?: DataConfig;
	capabilities: { tools: boolean; reasoning: boolean; images: boolean };
	importers?: ImporterConfig[];
	request?: { path?: string; projectSlot?: string };
	login?: { hydration?: LoginHydrationConfig[] };
	replay?: { foreignToolCallThoughtSignature?: string };
	free?: FreeTierConfig;
}
export interface ProviderConfigFile { version: 1; providers: ProviderConfig[] }

function object(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
	return value as Record<string, unknown>;
}
function text(value: unknown, label: string): string {
	if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
	return value.trim();
}
function validateProvider(value: unknown, index: number): ProviderConfig {
	const entry = object(value, `providers.json providers[${index}]`);
	const id = text(entry.id, `providers.json providers[${index}].id`);
	if (!/^[a-z0-9][a-z0-9._-]*$/u.test(id)) throw new Error(`Invalid provider id: ${id}`);
	const dialect = text(entry.dialect, `provider ${id} dialect`);
	if (!["openai-completions", "openai-responses", "openai-codex-responses", "anthropic-messages", "google-generative-ai", "cloudcode-agent"].includes(dialect)) {
		throw new Error(`Provider ${id} has unsupported dialect ${dialect}`);
	}
	if (!Array.isArray(entry.auth) || entry.auth.length === 0) throw new Error(`Provider ${id} must declare auth`);
	for (const [authIndex, rawAuth] of entry.auth.entries()) {
		const auth = object(rawAuth, `provider ${id} auth[${authIndex}]`);
		if (auth.kind === "api_key") {
			text(auth.slot, `provider ${id} api-key slot`);
			if (!["bearer", "header", "query"].includes(String(auth.placement))) throw new Error(`Provider ${id} has invalid API-key placement`);
			if ((auth.placement === "header" || auth.placement === "query") && auth.name !== undefined) text(auth.name, `provider ${id} API-key name`);
			if (auth.anonymousValue !== undefined) text(auth.anonymousValue, `provider ${id} anonymous API-key value`);
		} else if (auth.kind === "oauth") {
			text(auth.slot, `provider ${id} OAuth slot`); text(auth.tokenEndpoint, `provider ${id} tokenEndpoint`);
			if (auth.flow !== "device_code" && auth.flow !== "pkce") throw new Error(`Provider ${id} has invalid OAuth flow`);
			if (auth.flow === "device_code") text(auth.deviceCodeEndpoint, `provider ${id} deviceCodeEndpoint`);
			if (auth.flow === "pkce") text(auth.authorizationEndpoint, `provider ${id} authorizationEndpoint`);
			object(auth.clientId, `provider ${id} clientId`);
			if (!Array.isArray(auth.scopes)) throw new Error(`Provider ${id} OAuth scopes must be an array`);
		} else throw new Error(`Provider ${id} has unsupported auth kind`);
	}
	if (!Array.isArray(entry.requiredCredentialSlots)) throw new Error(`Provider ${id} requiredCredentialSlots must be an array`);
	if (entry.generatedHeaders !== undefined) {
		const generated = object(entry.generatedHeaders, `provider ${id} generatedHeaders`);
		for (const [name, rawSpec] of Object.entries(generated)) {
			const spec = object(rawSpec, `provider ${id} generated header ${name}`);
			if (!["session-id", "request-id", "random"].includes(String(spec.kind))) throw new Error(`Provider ${id} generated header ${name} has invalid kind`);
			if (spec.scope !== undefined && spec.scope !== "session" && spec.scope !== "request") throw new Error(`Provider ${id} generated header ${name} has invalid scope`);
			if (spec.kind === "random" && (typeof spec.length !== "number" || !Number.isSafeInteger(spec.length) || spec.length <= 0 || spec.length > 256)) throw new Error(`Provider ${id} generated header ${name} has invalid length`);
		}
	}
	if (entry.importers !== undefined) {
		if (!Array.isArray(entry.importers)) throw new Error(`Provider ${id} importers must be an array`);
		for (const rawImporter of entry.importers) {
			const importer = object(rawImporter, `provider ${id} importer`);
			text(importer.id, `provider ${id} importer id`);
			text(importer.targetProvider, `provider ${id} importer targetProvider`);
			if (importer.apiKeyTargetProvider !== undefined) text(importer.apiKeyTargetProvider, `provider ${id} importer apiKeyTargetProvider`);
			if (!["claude-code", "codex", "grok-cli", "antigravity-keyring", "kimi-code"].includes(String(importer.parser))) throw new Error(`Provider ${id} has unsupported importer parser`);
			object(importer.fieldMapping, `provider ${id} importer fieldMapping`);
		}
	}
	if (entry.replay !== undefined) {
		const replay = object(entry.replay, `provider ${id} replay`);
		if (replay.foreignToolCallThoughtSignature !== undefined) text(replay.foreignToolCallThoughtSignature, `provider ${id} foreign tool-call thought signature`);
	}
	if (entry.free !== undefined) {
		const free = object(entry.free, `provider ${id} free`);
		if (!["permanent", "renewable-credits", "trial-credits", "anonymous"].includes(String(free.kind))) throw new Error(`Provider ${id} free.kind must be permanent, renewable-credits, trial-credits, or anonymous`);
		for (const field of ["keyUrl", "signupUrl", "sourceUrl"] as const) {
			if (free[field] === undefined && field !== "keyUrl") continue;
			if (typeof free[field] !== "string" || !/^https:\/\//u.test(free[field] as string)) throw new Error(`Provider ${id} free.${field} must be an https URL`);
		}
		if (free.card !== undefined && typeof free.card !== "boolean") throw new Error(`Provider ${id} free.card must be boolean`);
		if (free.checkedAt !== undefined && (typeof free.checkedAt !== "string" || Number.isNaN(Date.parse(free.checkedAt)))) throw new Error(`Provider ${id} free.checkedAt must be an ISO date`);
	}
	if (entry.free !== undefined && (entry.free as Record<string, unknown>).data !== undefined) {
		const free = object(entry.free as unknown, `provider ${id} free`);
		const freeData = object(free.data as unknown, `provider ${id} free.data`);
		const collection = text(freeData.collection, `provider ${id} free.data.collection`);
		if (!["none", "logging", "training", "unknown"].includes(collection)) throw new Error(`provider ${id} free.data.collection must be one of none, logging, training, unknown`);
		if (freeData.retentionDays !== undefined) {
			if (typeof freeData.retentionDays !== "number" || !Number.isInteger(freeData.retentionDays) || freeData.retentionDays < 0) throw new Error(`provider ${id} free.data.retentionDays must be a non-negative integer`);
		}
		text(freeData.source, `provider ${id} free.data.source`);
		if (freeData.sourceUrl !== undefined) {
			if (typeof freeData.sourceUrl !== "string" || !/^https:\/\//u.test(freeData.sourceUrl)) throw new Error(`provider ${id} free.data.sourceUrl must be an https URL`);
		}
		if (typeof freeData.checkedAt !== "string" || Number.isNaN(Date.parse(freeData.checkedAt))) throw new Error(`provider ${id} free.data.checkedAt must be an ISO date`);
		if (freeData.note !== undefined && typeof freeData.note !== "string") throw new Error(`provider ${id} free.data.note must be a string`);
	}
	if (entry.login !== undefined) {
		const login = object(entry.login, `provider ${id} login`);
		if (login.hydration !== undefined) {
			if (!Array.isArray(login.hydration)) throw new Error(`Provider ${id} login hydration must be an array`);
			for (const rawHydration of login.hydration) {
				const hydration = object(rawHydration, `provider ${id} login hydration`);
				text(hydration.path, `provider ${id} login hydration path`);
				text(hydration.responsePath, `provider ${id} login hydration responsePath`);
				text(hydration.targetSlot, `provider ${id} login hydration targetSlot`);
				if (hydration.method !== undefined && hydration.method !== "GET" && hydration.method !== "POST") throw new Error(`Provider ${id} login hydration has invalid method`);
				if (hydration.slotType !== "header" && hydration.slotType !== "other") throw new Error(`Provider ${id} login hydration has invalid slotType`);
				if (hydration.authorization !== undefined && hydration.authorization !== "bearer" && hydration.authorization !== "none") throw new Error(`Provider ${id} login hydration has invalid authorization`);
			}
		}
	}
	const models = object(entry.models, `provider ${id} models`);
	if (!Array.isArray(models.static) || models.static.length === 0) throw new Error(`Provider ${id} must declare at least one static model`);
	for (const [modelIndex, rawModel] of models.static.entries()) {
		const model = object(rawModel, `provider ${id} model[${modelIndex}]`);
		text(model.id, `provider ${id} model id`);
		if (model.tier !== undefined && !["tight", "standard", "bulk"].includes(String(model.tier))) throw new Error(`Provider ${id} model has invalid tier`);
	}
	if (entry.limits !== undefined) {
		const limits = object(entry.limits, `provider ${id} limits`);
		if (typeof limits.observe !== "boolean") throw new Error(`Provider ${id} limits.observe must be boolean`);
		if (limits.dailyReset !== undefined && limits.dailyReset !== "utc-midnight" && limits.dailyReset !== "pacific-midnight") throw new Error(`Provider ${id} limits.dailyReset must be utc-midnight or pacific-midnight`);
		if (limits.reserve !== undefined) {
			const reserve = object(limits.reserve, `provider ${id} limits.reserve`);
			for (const dimension of ["requests", "tokens"]) if (reserve[dimension] !== undefined && (typeof reserve[dimension] !== "number" || reserve[dimension] < 0)) throw new Error(`Provider ${id} limits.reserve.${dimension} must be non-negative`);
		}
		if (limits.defaults !== undefined) {
			if (!Array.isArray(limits.defaults)) throw new Error(`Provider ${id} limits.defaults must be an array`);
			for (const rawDefault of limits.defaults) {
				const item = object(rawDefault, `provider ${id} limit default`);
				if (!["rate", "daily", "window", "monthly", "overload", "auth"].includes(String(item.type))) throw new Error(`Provider ${id} limit default has invalid type`);
				if (item.dimension !== undefined && !["requests", "tokens", "usage"].includes(String(item.dimension))) throw new Error(`Provider ${id} limit default has invalid dimension`);
				if (typeof item.limit !== "number" || item.limit <= 0 || typeof item.windowMs !== "number" || item.windowMs <= 0) throw new Error(`Provider ${id} limit default needs positive limit and windowMs`);
			}
		}
		if (limits.declared !== undefined) {
			if (!Array.isArray(limits.declared)) throw new Error(`Provider ${id} limits.declared must be an array`);
			for (const rawDeclared of limits.declared) {
				const item = object(rawDeclared, `provider ${id} limit declared`);
				if (!["rate", "daily", "window", "monthly", "concurrency", "overload", "auth"].includes(String(item.type))) throw new Error(`Provider ${id} limit declared has invalid type`);
				if (item.dimension !== undefined && !["requests", "tokens", "usage", "concurrency"].includes(String(item.dimension))) throw new Error(`Provider ${id} limit declared has invalid dimension`);
				if (typeof item.limit !== "number" || item.limit <= 0) throw new Error(`Provider ${id} limit declared limit must be positive`);
				if (typeof item.windowMs !== "number" || item.windowMs <= 0) throw new Error(`Provider ${id} limit declared windowMs must be positive`);
				if (item.reset !== undefined && item.reset !== "rolling" && item.reset !== "fixed") throw new Error(`Provider ${id} limit declared reset must be rolling or fixed`);
				if (item.source !== undefined && !["docs", "community", "observed", "default"].includes(String(item.source))) throw new Error(`Provider ${id} limit declared source must be docs, community, observed, or default`);
				if (item.sourceUrl !== undefined && (typeof item.sourceUrl !== "string" || !/^https:\/\//u.test(item.sourceUrl))) throw new Error(`Provider ${id} limit declared sourceUrl must be an https URL`);
				if (item.checkedAt !== undefined && (typeof item.checkedAt !== "string" || Number.isNaN(Date.parse(item.checkedAt)))) throw new Error(`Provider ${id} limit declared checkedAt must be an ISO date`);
			}
		}
		if (limits.bodyRules !== undefined) {
			if (!Array.isArray(limits.bodyRules)) throw new Error(`Provider ${id} limits.bodyRules must be an array`);
			for (const rawRule of limits.bodyRules) {
				const rule = object(rawRule, `provider ${id} limit body rule`);
				if (!["rate", "daily", "window", "monthly", "overload", "auth"].includes(String(rule.type))) throw new Error(`Provider ${id} limit body rule has invalid type`);
				const regex = text(rule.regex, `provider ${id} limit body regex`);
				try { new RegExp(regex, "iu"); } catch { throw new Error(`Provider ${id} limit body regex is invalid`); }
				if (rule.resetAfterMs !== undefined && (typeof rule.resetAfterMs !== "number" || rule.resetAfterMs <= 0)) throw new Error(`Provider ${id} limit body resetAfterMs must be positive`);
			}
		}
		if (limits.probe !== undefined) {
			const probe = object(limits.probe, `provider ${id} limits.probe`);
			text(probe.path, `provider ${id} limits.probe.path`);
			if (probe.enabled !== undefined && typeof probe.enabled !== "boolean") throw new Error(`Provider ${id} limits.probe.enabled must be boolean`);
			if (probe.method !== undefined && probe.method !== "GET" && probe.method !== "POST") throw new Error(`Provider ${id} limits.probe.method is invalid`);
		}
	}
	if (entry.data !== undefined) {
		const data = object(entry.data, `provider ${id} data`);
		const collection = text(data.collection, `provider ${id} data.collection`);
		if (!["none", "logging", "training", "unknown"].includes(collection)) throw new Error(`provider ${id} data.collection must be one of none, logging, training, unknown`);
		if (data.retentionDays !== undefined) {
			if (typeof data.retentionDays !== "number" || !Number.isInteger(data.retentionDays) || data.retentionDays < 0) throw new Error(`provider ${id} data.retentionDays must be a non-negative integer`);
		}
		text(data.source, `provider ${id} data.source`);
		if (data.sourceUrl !== undefined) {
			if (typeof data.sourceUrl !== "string" || !/^https:\/\//u.test(data.sourceUrl)) throw new Error(`provider ${id} data.sourceUrl must be an https URL`);
		}
		if (typeof data.checkedAt !== "string" || Number.isNaN(Date.parse(data.checkedAt))) throw new Error(`provider ${id} data.checkedAt must be an ISO date`);
		if (data.note !== undefined && typeof data.note !== "string") throw new Error(`provider ${id} data.note must be a string`);
	}
	object(entry.capabilities, `provider ${id} capabilities`);
	return entry as unknown as ProviderConfig;
}

export function parseProviderConfigFile(value: unknown, source = "providers.json"): ProviderConfigFile {
	const root = object(value, source);
	if (root.version !== 1 || !Array.isArray(root.providers)) throw new Error(`${source} must have version 1 and a providers array`);
	const providers = root.providers.map(validateProvider);
	const ids = new Set<string>();
	for (const provider of providers) {
		if (ids.has(provider.id)) throw new Error(`${source} contains duplicate provider ${provider.id}`);
		ids.add(provider.id);
	}
	return { version: 1, providers };
}

/** Built-in providers: the core set plus every researched free provider (assets/providers.free.json). */
export const BUILTIN_PROVIDER_CONFIG = parseProviderConfigFile({ version: 1, providers: [...defaults.providers, ...freeProviders.providers] }, "built-in providers");

export async function loadProviderConfig(home: string, reader: (path: string) => Promise<string> = (path) => readFile(path, "utf8")): Promise<ProviderConfigFile> {
	let local: ProviderConfigFile | undefined;
	try { local = parseProviderConfigFile(JSON.parse(await reader(join(home, "providers.json"))) as unknown, "$DF_HOME/providers.json"); }
	catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			if (error instanceof SyntaxError) throw new Error("Invalid $DF_HOME/providers.json JSON");
			throw error;
		}
	}
	const merged = new Map(BUILTIN_PROVIDER_CONFIG.providers.map((provider) => [provider.id, provider]));
	for (const provider of local?.providers ?? []) merged.set(provider.id, provider);
	return { version: 1, providers: [...merged.values()] };
}
