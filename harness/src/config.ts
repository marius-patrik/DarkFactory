import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { CredentialFallback } from "@darkfactory/keychain";
import type { ProviderConfigFile } from "./providers/schema.ts";
import { assertTierConfiguration } from "./router/tiers.ts";
import type {
	CapabilityTier,
	DifficultyTierMapping,
	LimitTier,
	ModelCapabilityOverride,
	ModelModality,
	RouterConfig,
	RouterPolicy,
	TaskKind,
	TaskNeed,
	TaskSize,
} from "./router/types.ts";
import { resolveDfFile } from "./utils/resolver";

// Free-tier Gemini models that returned 200 on the AI Studio key (probed 2026-09-13; ~20 requests/day each), then keyless/free providers.

/**
 * The DarkFactory configuration loaded from config.json.
 */
export interface DfConfig {
	defaultChain?: string;
	cooldownTtlMs?: number;
	maxWaitMs?: number;
	hardReasoningChain?: string;
	sensitiveChain?: string;
	credentialFiles?: Record<string, string>;
	router?: RouterConfig;
}

/**
 * The default router configuration with built-in routing policies for
 * sensitive, image-generation, video-generation, review, and implementation tasks.
 */
export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
	policies: [
		{ id: "sensitive", match: { sensitivity: ["sensitive"] }, prefer: {} },
		{
			id: "image-generation",
			match: { needs: ["image_gen"] },
			prefer: { quality: "image", tiers: ["standard", "bulk", "tight"] },
		},
		{
			id: "video-generation",
			match: { needs: ["video_gen"] },
			prefer: { quality: "video", tiers: ["standard", "bulk", "tight"] },
		},
		{
			id: "small-review",
			match: { kind: ["review"], size: ["small"] },
			prefer: { quality: "review", tiers: ["tight", "standard", "bulk"] },
		},
		{
			id: "large-implementation",
			match: { kind: ["implement", "fix"], size: ["large"] },
			prefer: { quality: "implement", tiers: ["bulk", "standard", "tight"] },
		},
	],
};

/**
 * A function that reads a file at the given path and returns its contents as a string.
 */
export type ConfigReader = (path: string) => Promise<string>;

function optionalString(record: Record<string, unknown>, name: string): string | undefined {
	const value = record[name];
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !value.trim()) throw new Error(`config.df ${name} must be a non-empty string`);
	return value.trim();
}

const KINDS: TaskKind[] = ["plan", "implement", "review", "fix", "summarize", "classify", "chat", "image", "video"];
const SIZES: TaskSize[] = ["small", "medium", "large"];
const NEEDS: TaskNeed[] = ["tools", "reasoning", "vision", "long_context", "image_gen", "video_gen"];
const TIERS: LimitTier[] = ["tight", "standard", "bulk"];
const MODALITIES: ModelModality[] = ["text", "image", "video", "image_gen", "video_gen"];
const COLLECTION_VALUES = ["none", "logging", "training", "unknown"];
function stringArray(value: unknown, label: string, allowed?: readonly string[]): string[] | undefined {
	if (value === undefined) return undefined;
	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string" || !entry || (allowed && !allowed.includes(entry)))
	)
		throw new Error(`config.df ${label} must be an array of valid strings`);
	return [...new Set(value as string[])];
}
function candidateArray(value: unknown, label: string): string[] | undefined {
	const values = stringArray(value, label);
	if (values?.some((entry) => !/^[^/@,\s]+\/[^@,\s]+@[^@,\s]+$/u.test(entry)))
		throw new Error(`config.df ${label} entries must be provider/model@account`);
	return values;
}
function parseRouter(value: unknown): RouterConfig | undefined {
	if (value === undefined) return undefined;
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("config.df router must be an object");
	const record = value as Record<string, unknown>;
	if (!Array.isArray(record.policies)) throw new Error("config.df router.policies must be an array");
	const policies: RouterPolicy[] = record.policies.map((raw, index) => {
		if (!raw || typeof raw !== "object" || Array.isArray(raw))
			throw new Error(`config.df router.policies[${index}] must be an object`);
		const item = raw as Record<string, unknown>;
		const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : undefined;
		if (!id || !item.match || typeof item.match !== "object" || !item.prefer || typeof item.prefer !== "object")
			throw new Error(`config.df router.policies[${index}] needs id, match, and prefer`);
		const match = item.match as Record<string, unknown>;
		const prefer = item.prefer as Record<string, unknown>;
		const kind = stringArray(match.kind, `router policy ${id} match.kind`, KINDS) as TaskKind[] | undefined;
		const size = stringArray(match.size, `router policy ${id} match.size`, SIZES) as TaskSize[] | undefined;
		const needs = stringArray(match.needs, `router policy ${id} match.needs`, NEEDS) as TaskNeed[] | undefined;
		const sensitivity = stringArray(match.sensitivity, `router policy ${id} match.sensitivity`, [
			"normal",
			"sensitive",
		]) as ("normal" | "sensitive")[] | undefined;
		const candidates = candidateArray(prefer.candidates, `router policy ${id} prefer.candidates`);
		const tiers = stringArray(prefer.tiers, `router policy ${id} prefer.tiers`, TIERS) as LimitTier[] | undefined;
		const quality =
			prefer.quality === undefined
				? undefined
				: ((typeof prefer.quality === "string" && prefer.quality.trim() ? prefer.quality.trim() : undefined) as
						| TaskKind
						| undefined);
		if (quality && !KINDS.includes(quality)) throw new Error(`config.df router policy ${id} quality is invalid`);
		return {
			id,
			match: {
				...(kind ? { kind } : {}),
				...(size ? { size } : {}),
				...(needs ? { needs } : {}),
				...(sensitivity ? { sensitivity } : {}),
			},
			prefer: { ...(candidates ? { candidates } : {}), ...(tiers ? { tiers } : {}), ...(quality ? { quality } : {}) },
		};
	});
	let models: RouterConfig["models"];
	if (record.models !== undefined) {
		if (!record.models || typeof record.models !== "object" || Array.isArray(record.models))
			throw new Error("config.df router.models must be an object");
		models = {};
		for (const [id, raw] of Object.entries(record.models as Record<string, unknown>)) {
			if (!raw || typeof raw !== "object" || Array.isArray(raw))
				throw new Error(`config.df router.models.${id} must be an object`);
			const model = raw as Record<string, unknown>;
			if (model.contextWindow !== undefined && (typeof model.contextWindow !== "number" || model.contextWindow <= 0))
				throw new Error(`config.df router.models.${id}.contextWindow must be positive`);
			for (const field of ["tools", "reasoning"] as const)
				if (model[field] !== undefined && typeof model[field] !== "boolean")
					throw new Error(`config.df router.models.${id}.${field} must be boolean`);
			if (model.limitTier !== undefined && !TIERS.includes(model.limitTier as LimitTier))
				throw new Error(`config.df router.models.${id}.limitTier is invalid`);
			const modalities = stringArray(model.modalities, `router.models.${id}.modalities`, MODALITIES) as
				| ModelModality[]
				| undefined;
			let quality: ModelCapabilityOverride["quality"];
			if (model.quality !== undefined) {
				if (!model.quality || typeof model.quality !== "object" || Array.isArray(model.quality))
					throw new Error(`config.df router.models.${id}.quality must be an object`);
				quality = {};
				for (const [kind, score] of Object.entries(model.quality as Record<string, unknown>)) {
					if (!KINDS.includes(kind as TaskKind) || typeof score !== "number" || !Number.isFinite(score))
						throw new Error(`config.df router.models.${id}.quality is invalid`);
					quality[kind as TaskKind] = score;
				}
			}
			models[id] = {
				...(typeof model.contextWindow === "number" ? { contextWindow: model.contextWindow } : {}),
				...(typeof model.tools === "boolean" ? { tools: model.tools } : {}),
				...(typeof model.reasoning === "boolean" ? { reasoning: model.reasoning } : {}),
				...(modalities ? { modalities } : {}),
				...(quality ? { quality } : {}),
				...(model.limitTier ? { limitTier: model.limitTier as LimitTier } : {}),
				...(typeof model.capabilityTier === "string" && model.capabilityTier.trim()
					? { capabilityTier: model.capabilityTier.trim() }
					: {}),
			};
		}
	}
	const classifier = optionalString(record, "classifier");
	if (classifier && !/^[^/@,\s]+\/[^@,\s]+@[^@,\s]+$/u.test(classifier))
		throw new Error("config.df router.classifier must be provider/model@account");
	const candidates = candidateArray(record.candidates, "router.candidates");
	let learning: RouterConfig["learning"];
	if (record.learning !== undefined) {
		if (!record.learning || typeof record.learning !== "object" || Array.isArray(record.learning))
			throw new Error("config.df router.learning must be an object");
		const value = record.learning as Record<string, unknown>;
		if (value.enabled !== undefined && typeof value.enabled !== "boolean")
			throw new Error("config.df router.learning.enabled must be boolean");
		for (const field of ["windowMs", "maxPenalty", "maxRecords"] as const)
			if (value[field] !== undefined && (typeof value[field] !== "number" || value[field] <= 0))
				throw new Error(`config.df router.learning.${field} must be positive`);
		learning = value as RouterConfig["learning"];
	}
	let capabilityTiers: CapabilityTier[] | undefined;
	if (record.capabilityTiers !== undefined) {
		if (!Array.isArray(record.capabilityTiers)) throw new Error("config.df router.capabilityTiers must be an array");
		capabilityTiers = record.capabilityTiers.map((raw, index) => {
			if (!raw || typeof raw !== "object" || Array.isArray(raw))
				throw new Error(`config.df router.capabilityTiers[${index}] must be an object`);
			const tier = raw as Record<string, unknown>;
			const id = typeof tier.id === "string" && tier.id.trim() ? tier.id.trim() : undefined;
			if (!id) throw new Error(`config.df router.capabilityTiers[${index}].id must be a non-empty string`);
			const match = stringArray(tier.match, `router.capabilityTiers[${index}].match`);
			if (!match) throw new Error(`config.df router.capabilityTiers[${index}].match must be an array of valid strings`);
			return { id, match };
		});
	}
	const defaultTier =
		record.defaultTier === undefined ? "standard" : (optionalString(record, "defaultTier") ?? "standard");
	let difficultyTiers: DifficultyTierMapping | undefined;
	if (record.difficultyTiers !== undefined) {
		if (!record.difficultyTiers || typeof record.difficultyTiers !== "object" || Array.isArray(record.difficultyTiers))
			throw new Error("config.df router.difficultyTiers must be an object");
		const raw = record.difficultyTiers as Record<string, unknown>;
		const difficultyTier = (name: "easy" | "medium" | "hard"): string => {
			const value = raw[name];
			if (typeof value !== "string" || !value.trim())
				throw new Error(`config.df router.difficultyTiers.${name} must be a non-empty string`);
			return value.trim();
		};
		difficultyTiers = {
			easy: difficultyTier("easy"),
			medium: difficultyTier("medium"),
			hard: difficultyTier("hard"),
		};
	}
	assertTierConfiguration(capabilityTiers, defaultTier, difficultyTiers);
	let dataCollection: RouterConfig["dataCollection"];
	if (record.dataCollection !== undefined) {
		if (!record.dataCollection || typeof record.dataCollection !== "object" || Array.isArray(record.dataCollection))
			throw new Error("config.df router.dataCollection must be an object");
		const dc = record.dataCollection as Record<string, unknown>;
		const normal = stringArray(dc.normal, "router.dataCollection.normal", COLLECTION_VALUES);
		const sensitive = stringArray(dc.sensitive, "router.dataCollection.sensitive", COLLECTION_VALUES);
		if (normal !== undefined || sensitive !== undefined)
			dataCollection = {
				...(normal !== undefined ? { normal } : {}),
				...(sensitive !== undefined ? { sensitive } : {}),
			};
	}
	return {
		policies,
		...(classifier ? { classifier } : {}),
		...(candidates ? { candidates } : {}),
		...(models ? { models } : {}),
		...(learning ? { learning } : {}),
		...(capabilityTiers ? { capabilityTiers } : {}),
		defaultTier,
		...(difficultyTiers ? { difficultyTiers } : {}),
		...(dataCollection ? { dataCollection } : {}),
	};
}

/**
 * Loads the DarkFactory configuration from config.df in the given root directory.
 * Falls back to the default chain if config.df is missing.
 * @param root - The directory containing config.df (or .darkfactory/config.df)
 * @param reader - Optional custom file reader (defaults to reading files with UTF-8 encoding)
 * @returns A promise resolving to the loaded DfConfig
 */
export async function loadDfConfig(
	root: string,
	reader: ConfigReader = (path) => readFile(path, "utf8"),
): Promise<DfConfig> {
	let path: string;
	try {
		path = resolveDfFile(root, "config");
	} catch (error) {
		if ((error as Error).message.includes("Both") && (error as Error).message.includes("exist")) throw error;
		return {};
	}
	let raw: string;
	try {
		raw = await reader(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
		throw error;
	}
	let value: unknown;
	try {
		value = JSON.parse(raw) as unknown;
	} catch {
		throw new Error("Invalid config.df JSON");
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${path}`);
	const record = value as Record<string, unknown>;
	const hardReasoningChain = optionalString(record, "hardReasoningChain");
	const sensitiveChain = optionalString(record, "sensitiveChain");
	const router = parseRouter(record.router);
	const cooldownTtlMs = record.cooldownTtlMs;
	if (
		cooldownTtlMs !== undefined &&
		(typeof cooldownTtlMs !== "number" || !Number.isSafeInteger(cooldownTtlMs) || cooldownTtlMs <= 0)
	) {
		throw new Error("config.df cooldownTtlMs must be a positive integer");
	}
	const maxWaitMs = record.maxWaitMs;
	if (
		maxWaitMs !== undefined &&
		(typeof maxWaitMs !== "number" || !Number.isSafeInteger(maxWaitMs) || maxWaitMs <= 0)
	) {
		throw new Error("config.df maxWaitMs must be a positive integer");
	}
	let credentialFiles: Record<string, string> | undefined;
	if (record.credentialFiles !== undefined) {
		if (!record.credentialFiles || typeof record.credentialFiles !== "object" || Array.isArray(record.credentialFiles))
			throw new Error("config.df credentialFiles must be an object");
		credentialFiles = {};
		for (const [account, path] of Object.entries(record.credentialFiles as Record<string, unknown>))
			credentialFiles[account] = optionalString({ path }, "path")!;
	}
	const defaultChain = optionalString(record, "defaultChain");
	return {
		...(defaultChain ? { defaultChain } : {}),
		...(hardReasoningChain ? { hardReasoningChain } : {}),
		...(sensitiveChain ? { sensitiveChain } : {}),
		...(typeof cooldownTtlMs === "number" ? { cooldownTtlMs } : {}),
		...(typeof maxWaitMs === "number" ? { maxWaitMs } : {}),
		...(credentialFiles ? { credentialFiles } : {}),
		...(router ? { router } : {}),
	};
}

/**
 * Creates a credential fallback that resolves API keys from provider config files,
 * environment variables, or the vault. Used when no credentials are found in the
 * credential store.
 * @param home - The $DF_HOME directory
 * @param config - The loaded DfConfig
 * @param providers - The provider configuration file
 * @param options - Optional env and reader overrides
 * @returns A credential fallback function that resolves provider credentials
 */
export function localCredentialFallback(
	home: string,
	config: DfConfig,
	providers: ProviderConfigFile,
	options: { env?: Readonly<Record<string, string | undefined>>; read?: ConfigReader } = {},
): CredentialFallback {
	const env = options.env ?? process.env;
	const reader = options.read ?? ((path: string) => readFile(path, "utf8"));
	return async (provider, label) => {
		const apiKey = providers.providers
			.find((entry) => entry.id === provider)
			?.auth.find((entry) => entry.kind === "api_key");
		if (label === "default") {
			for (const name of apiKey?.env ?? []) {
				const value = env[name]?.trim();
				if (value) return { type: "api_key", key: value };
			}
		}
		const configured = config.credentialFiles?.[`${provider}:${label}`];
		if (!configured) return undefined;
		const path = isAbsolute(configured) ? configured : resolve(home, configured);
		let key: string;
		try {
			key = (await reader(path)).trim();
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT")
				throw new Error(`Credential file does not exist: ${path}`);
			throw error;
		}
		if (!key) throw new Error(`Credential file is empty: ${path}`);
		return { type: "api_key", key };
	};
}
