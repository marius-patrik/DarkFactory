import { readFile } from "node:fs/promises";
import { join } from "node:path";
import defaults from "../../assets/providers.defaults.json";

export type ProviderDialect = "openai-completions" | "openai-responses" | "openai-codex-responses" | "anthropic-messages" | "google-generative-ai" | "cloudcode-agent";
export type FailureRuleKind = "quota_exhausted" | "rate_limited" | "auth" | "transient" | "fatal";

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
	kind: "retry_info" | "header" | "next_pacific_midnight";
	path?: string;
	header?: string;
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
export interface ImporterConfig {
	id: string;
	parser: "claude-code" | "codex" | "grok-cli" | "antigravity-keyring" | "kimi-code";
	path?: string;
	keyring?: { service: string; account: string };
	targetProvider: string;
	apiKeyTargetProvider?: string;
	fieldMapping: Record<string, string>;
	refresh: "reimport-first";
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
	capabilities: { tools: boolean; reasoning: boolean; images: boolean };
	importers?: ImporterConfig[];
	request?: { path?: string; projectSlot?: string };
	login?: { hydration?: LoginHydrationConfig[] };
	replay?: { foreignToolCallThoughtSignature?: string };
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
			if (importer.refresh !== "reimport-first") throw new Error(`Provider ${id} importer refresh must be reimport-first`);
			object(importer.fieldMapping, `provider ${id} importer fieldMapping`);
		}
	}
	if (entry.replay !== undefined) {
		const replay = object(entry.replay, `provider ${id} replay`);
		if (replay.foreignToolCallThoughtSignature !== undefined) text(replay.foreignToolCallThoughtSignature, `provider ${id} foreign tool-call thought signature`);
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
	for (const [modelIndex, rawModel] of models.static.entries()) text(object(rawModel, `provider ${id} model[${modelIndex}]`).id, `provider ${id} model id`);
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

export const BUILTIN_PROVIDER_CONFIG = parseProviderConfigFile(defaults, "built-in providers defaults");

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
