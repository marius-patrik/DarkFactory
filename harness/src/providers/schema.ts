import { readFile } from "node:fs/promises";
import { join } from "node:path";
import defaults from "../../assets/providers.defaults.json";
import freeProviders from "../../assets/providers.free.json";

/** The provider dialect determines the API format and behavior for the provider. */
export type ProviderDialect = "openai-completions" | "openai-responses" | "openai-codex-responses" | "anthropic-messages" | "google-generative-ai" | "cloudcode-agent";
/** Categorizes failure types for provider quota and error handling. */
export type FailureRuleKind = "quota_exhausted" | "rate_limited" | "auth" | "transient" | "fatal";
/** Tier classification for model usage limits and pricing. */
export type ModelTier = "tight" | "standard" | "bulk";
/** Types of limits that can be configured for a provider. */
export type ConfiguredLimitType = "rate" | "daily" | "window" | "monthly" | "overload" | "auth";

/** Reference to a value that can be provided directly or via an environment variable. */
export interface ValueReference {
	/** Direct string value. */
	value?: string;
	/** Environment variable name containing the value. */
	env?: string;
}
/** Configuration for API‑key based authentication. */
export interface ApiKeyAuthConfig {
	/** Authentication type identifier. */
	kind: "api_key";
	/** Name of the credential slot to use. */
	slot: string;
	/** Where to place the API key in requests. */
	placement: "bearer" | "header" | "query";
	/** Header or query parameter name for the API key. */
	name?: string;
	/** Environment variables that may contain the API key. */
	env?: string[];
	/** Whether this auth is optional. */
	optional?: boolean;
	/** Value to use when no key is provided. */
	anonymousValue?: string;
}
/** Configuration for OAuth‑based authentication flows. */
export interface OAuthAuthConfig {
	/** Authentication type identifier. */
	kind: "oauth";
	/** Name of the credential slot to use. */
	slot: string;
	/** OAuth flow type to use. */
	flow: "device_code" | "pkce";
	/** OAuth authorization endpoint URL. */
	authorizationEndpoint?: string;
	/** OAuth device code endpoint URL. */
	deviceCodeEndpoint?: string;
	/** OAuth token endpoint URL. */
	tokenEndpoint: string;
	/** OAuth client ID. */
	clientId: ValueReference;
	/** OAuth client secret. */
	clientSecret?: ValueReference;
	/** OAuth scopes to request. */
	scopes: string[];
	/** Whether this is a subscription-based OAuth. */
	isSubscription?: boolean;
	/** Label to display for login. */
	loginLabel?: string;
	/** Additional HTTP headers to include in the OAuth token request. */
	authHeaders?: Record<string, string>;
	/** Name of the response header that contains the account ID. */
	accountIdHeader?: string;
	/** Where to place the OAuth token (header or API-key style). */
	placement?: "bearer" | "api_key";
	/** Encoding format for the token request body. */
	tokenEncoding?: "form" | "json";
	/** URI to redirect to after successful authentication (if applicable). */
	redirectUri?: string;
	/** Extra query parameters to include in the authorization request. */
	authorizationParams?: Record<string, string>;
	/** JWT claim names that may contain the account ID. */
	accountIdJwtClaim?: string[];
}
/** Union of supported authentication configurations for a provider. */
export type ProviderAuthConfig = ApiKeyAuthConfig | OAuthAuthConfig;

/** Definition of a static model that does not require a discovery endpoint. */
export interface StaticModelConfig {
	/** Unique identifier for the static model. */
	id: string;
	/** Human-readable name of the model. */
	name?: string;
	/** Whether the model supports chain-of-thought reasoning. */
	reasoning?: boolean;
	/** Types of inputs the model accepts (text, image). */
	input?: Array<"text" | "image">;
	/** Maximum number of tokens the model can consider in a single request. */
	contextWindow?: number;
	/** Maximum number of tokens the model can generate in a response. */
	maxTokens?: number;
	/** Pricing tier of the model (tight, standard, bulk). */
	tier?: ModelTier;
}
/** Default limit configuration used when a provider does not supply explicit limits. */
export interface LimitDefaultConfig {
	/** Kind of limit being configured (rate, daily, etc.). */
	type: ConfiguredLimitType;
	/** What the limit dimension applies to (requests count, token count, or usage cost). */
	dimension?: "requests" | "tokens" | "usage";
	/** Numeric value of the limit. */
	limit: number;
	/** Time window for the limit in milliseconds. */
	windowMs: number;
	/** Identifier of a pool of limits shared across models. */
	pool?: string;
	/** Source of the limit value (documentation, observed, or default). */
	source?: "docs" | "observed" | "default";
	/** Reset behavior for the limit (rolling window or fixed interval). */
	reset?: "rolling" | "fixed";
	/** Model identifier this limit applies to (optional). */
	model?: string;
}
/** Source of the numeric limit value used for documentation or runtime checks. */
export type LimitNumberSource = "docs" | "community" | "observed" | "default";
/** Explicitly declared limit configuration for a specific model pattern. */
export interface DeclaredLimitConfig {
	/** Model id or glob ("*", "*:free"); absent means every model. */
	model?: string;
	/** Type of limit (including concurrency limits). */
	type: ConfiguredLimitType | "concurrency";
	/** Dimension of the declared limit. */
	dimension?: "requests" | "tokens" | "usage" | "concurrency";
	/** Numeric value of the limit. */
	limit: number;
	/** Time window for the limit in milliseconds. */
	windowMs: number;
	/** Reset behavior for the limit (rolling window or fixed interval). */
	reset?: "rolling" | "fixed";
	/** docs = provider documentation, community = third-party list, observed = seen in real responses. */
	source?: LimitNumberSource;
	/** URL pointing to the source documentation for the limit. */
	sourceUrl?: string;
	/** ISO date the number was last checked against its source. */
	checkedAt?: string;
	/** Additional human-readable note about the limit. */
	note?: string;
	/** A pooled limit is shared by every model the pattern matches (same account). */
	pool?: string;
}
/** How a provider can be used for free and where its owner gets access. */
export interface FreeTierConfig {
	/** Category of free-tier access. */
	kind: "permanent" | "renewable-credits" | "trial-credits" | "anonymous";
	/** URL where a free API key can be obtained. */
	keyUrl: string;
	/** URL to sign up for the free tier (if separate from key URL). */
	signupUrl?: string;
	/** Whether a credit card is required for the free tier. */
	card?: boolean;
	/** Description of any verification steps required. */
	verification?: string;
	/** Amount of free credits provided. */
	credits?: string;
	/** Additional notes about the free tier. */
	notes?: string;
	/** URL to the source information for the free tier. */
	sourceUrl?: string;
	/** Date when the free-tier information was last verified. */
	checkedAt?: string;
}
/** Rule describing how request body contents affect limit enforcement. */
export interface LimitBodyRuleConfig {
	/** Type of limit to apply to request bodies. */
	type: ConfiguredLimitType;
	/** Regular expression that matches request body content triggering the limit. */
	regex: string;
	/** Regular expression to match duration-related content in the body. */
	durationRegex?: string;
	/** Time in milliseconds after which to reset the limit counter. */
	resetAfterMs?: number;
	/** What the limit dimension applies to (requests count, token count, or usage cost). */
	dimension?: "requests" | "tokens" | "usage";
	/** Identifier of a pool of limits shared across models. */
	pool?: string;
}
/** Policy governing how limits are observed and enforced for a provider. */
export interface LimitPolicyConfig {
	/** Whether to automatically observe and learn from observed limits in responses. */
	observe: boolean;
	/** Whether the provider uses standard rate limit headers. */
	standardHeaders?: boolean;
	/** Reserved capacity that should not be used for regular requests. */
	reserve?: {
		/** Number of requests to reserve. */
		requests?: number;
		/** Number of tokens to reserve. */
		tokens?: number;
	};
	/** Default limit values when a provider does not supply explicit limits. */
	defaults?: LimitDefaultConfig[];
	/** Explicitly declared limit configuration for specific model patterns. */
	declared?: DeclaredLimitConfig[];
	/** Rules describing how request body contents affect limit enforcement. */
	bodyRules?: LimitBodyRuleConfig[];
	/** Health probe configuration to check if limits are available. */
	probe?: {
		/** Whether the probe is enabled. */
		enabled?: boolean;
		/** HTTP method to use for the probe. */
		method?: "GET" | "POST";
		/** API path to probe. */
		path: string;
	};
	/** When the provider's daily quotas roll over; defaults to UTC midnight. */
	dailyReset?: "utc-midnight" | "pacific-midnight";
}
/** Configuration for endpoints that list available models dynamically. */
export interface ModelListConfig {
	/** API endpoint path to fetch the list of models. */
	path: string;
	/** HTTP method to use for the request. */
	method?: "GET" | "POST";
	/** JSONPath expression to extract the array of model items. */
	itemsPath: string;
	/** JSONPath expression to extract the model ID. */
	idPath: string;
	/** JSONPath expression to extract the model name. */
	namePath?: string;
	/** JSONPath expression to extract supported methods. */
	methodsPath?: string;
	/** Prefix to strip from model IDs when generating identifiers. */
	stripIdPrefix?: string;
	/** JSONPath expression to extract the next page token. */
	nextPageTokenPath?: string;
	/** Query parameter name for pagination. */
	pageTokenParam?: string;
	/** Request body for POST endpoints. */
	body?: Record<string, unknown>;
}
/** Configuration describing how a limit reset time is derived. */
export interface ResetSourceConfig {
	/** Source type for the reset time. */
	kind: "retry_info" | "header" | "next_pacific_midnight" | "cooldown";
	/** JSONPath expression to extract the reset time from response. */
	path?: string;
	/** HTTP header name containing the reset time. */
	header?: string;
	/** Reset time in seconds. */
	seconds?: number;
	/** Random jitter in milliseconds to prevent thundering herd. */
	jitterMs?: number;
}
/** Rule defining when a failure should trigger a limit reset or back‑off. */
export interface FailureRuleConfig {
	/** Type of failure that triggers this rule. */
	kind: FailureRuleKind;
	/** HTTP status codes that indicate this failure. */
	statuses?: number[];
	/** JSONPath expression to extract the failure condition. */
	jsonPath?: string;
	/** Expected string value to match. */
	equals?: string;
	/** Regular expression pattern to match the failure. */
	regex?: string;
	/** How to derive the reset time after this failure. */
	reset?: ResetSourceConfig[];
	/** Pool identifier for shared limits. */
	pool?: string;
}
/** Configuration for importing credentials or tokens from external sources. */
export interface ImporterConfig {
	/** Unique identifier for this importer. */
	id: string;
	/** Parser type to extract credentials from the source. */
	parser: "claude-code" | "codex" | "grok-cli" | "antigravity-keyring" | "kimi-code";
	/** Path to the file or directory containing credentials. */
	path?: string;
	/** Keyring configuration for system credential store. */
	keyring?: {
		/** Keyring service name. */
		service: string;
		/** Keyring account name. */
		account: string;
	};
	/** Target provider name to import credentials for. */
	targetProvider: string;
	/** APIKey target provider if different from targetProvider. */
	apiKeyTargetProvider?: string;
	/** Mapping of credential fields to provider-specific names. */
	fieldMapping: Record<string, string>;
	/** Formats for credential expiration dates. */
	formats?: {
		/** How the expiration is encoded. */
		expires?: "epoch_seconds" | "epoch_milliseconds" | "iso";
	};
}
/** Specification for headers that are generated automatically per request or session. */
export interface GeneratedHeaderConfig {
	/** Type of value to generate. */
	kind: "session-id" | "request-id" | "random";
	/** Scope of the generated value. */
	scope?: "session" | "request";
	/** Group identifier for related generated values. */
	group?: string;
	/** Prefix to prepend to generated values. */
	prefix?: string;
	/** Length of the generated value. */
	length?: number;
}
/** Configuration for login hydration steps required before using a provider. */
export interface LoginHydrationConfig {
	/** API endpoint path to call for login. */
	path: string;
	/** HTTP method to use. */
	method?: "GET" | "POST";
	/** Headers to include in the login request. */
	headers?: Record<string, string>;
	/** Request body for POST login requests. */
	body?: Record<string, unknown>;
	/** Authorization type to use. */
	authorization?: "bearer" | "none";
	/** JSONPath to extract the response token. */
	responsePath: string;
	/** Target slot to store the token. */
	targetSlot: string;
	/** Type of slot the token goes to. */
	slotType: "header" | "other";
	/** Prefix to strip from the response. */
	stripPrefix?: string;
}
/** Full configuration object describing a provider and its capabilities. */
export interface ProviderConfig {
	/** Unique provider identifier. */
	id: string;
	/** Human-readable provider name. */
	name: string;
	/** Whether the provider is enabled. */
	enabled?: boolean;
	/** API dialect to use. */
	dialect: ProviderDialect;
	/** Base URL for API requests. */
	baseUrl: string;
	/** Authentication configurations. */
	auth: ProviderAuthConfig[];
	/** Required credential slot names. */
	requiredCredentialSlots: string[];
	/** Headers always included in requests. */
	staticHeaders?: Record<string, string>;
	/** Automatically generated headers. */
	generatedHeaders?: Record<string, GeneratedHeaderConfig>;
	/** Headers derived from credential slots. */
	slotHeaders?: Record<string, string>;
	/** Model definitions. */
	models: {
		/** Static model definitions. */
		static: StaticModelConfig[];
		/** Dynamic model list configuration. */
		list?: ModelListConfig;
	};
	/** Failure handling rules. */
	quota?: {
		/** Rules for detecting failures. */
		rules: FailureRuleConfig[];
	};
	/** Limit policies. */
	limits?: LimitPolicyConfig;
	/** Provider capabilities. */
	capabilities: {
		/** Whether tool calls are supported. */
		tools: boolean;
		/** Whether reasoning is supported. */
		reasoning: boolean;
		/** Whether images are supported. */
		images: boolean;
	};
	/** Credential importers. */
	importers?: ImporterConfig[];
	/** Request configuration. */
	request?: {
		/** Request path template. */
		path?: string;
		/** Project slot name. */
		projectSlot?: string;
	};
	/** Login configuration. */
	login?: {
		/** Hydration steps. */
		hydration?: LoginHydrationConfig[];
	};
	/** Replay configuration. */
	replay?: {
		/** Signature for foreign tool-call thoughts. */
		foreignToolCallThoughtSignature?: string;
	};
	/** Free tier information. */
	free?: FreeTierConfig;
}
/** Container format for a providers configuration file. */
export interface ProviderConfigFile {
	/** Schema version. */
	version: 1;
	/** List of provider configurations. */
	providers: ProviderConfig[];
}

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
	object(entry.capabilities, `provider ${id} capabilities`);
	return entry as unknown as ProviderConfig;
}

/**
 * Parse and validate a providers configuration JSON structure.
 * @param value - Parsed JSON content.
 * @param source - Optional identifier used in error messages.
 * @returns The validated ProviderConfigFile.
 */
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

/**
 * Load and merge built‑in provider configurations with a user‑provided file.
 * @param home - Directory containing a `providers.json` file.
 * @param reader - Optional custom file reader.
 * @returns The merged ProviderConfigFile.
 */
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
