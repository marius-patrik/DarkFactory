/** Provider/account/model identity for one routable model candidate. */
export interface Candidate {
	provider: string;
	account: string;
	model: string;
}

/** Normalized model/provider failure classes used by routing and failover. */
export type FailureKind = "quota_exhausted" | "rate_limited" | "auth" | "transient" | "fatal";
/** Semantic kinds of model-backed work understood by the router. */
export type TaskKind = "plan" | "implement" | "review" | "fix" | "summarize" | "classify" | "chat" | "image" | "video";
/** Coarse task-size classification used for routing. */
export type TaskSize = "small" | "medium" | "large";
/** Capabilities a task may require from a model. */
export type TaskNeed = "tools" | "reasoning" | "vision" | "long_context" | "image_gen" | "video_gen";
/** Sensitivity classification controlling eligible provider policies. */
export type Sensitivity = "normal" | "sensitive";
/** Relative quota/capacity tier for a model candidate. */
export type LimitTier = "tight" | "standard" | "bulk";
/** Modalities a model can consume or generate. */
export type ModelModality = "text" | "image" | "video" | "image_gen" | "video_gen";
/** Identifier of a configured model capability tier. */
export type CapabilityTierId = string;
/** Configured capability tier and its model matching rules. */
export interface CapabilityTier {
	id: CapabilityTierId;
	match: string[];
}
/** Task difficulty used to derive the minimum capability tier. */
export type Difficulty = "easy" | "medium" | "hard";
/** Maps task difficulty levels to minimum capability tiers. */
export interface DifficultyTierMapping {
	easy: CapabilityTierId;
	medium: CapabilityTierId;
	hard: CapabilityTierId;
}

/** Normalized semantic routing profile for one task. */
export interface TaskProfile {
	kind: TaskKind;
	size: TaskSize;
	needs: TaskNeed[];
	sensitivity: Sensitivity;
	difficulty?: Difficulty;
	minTier?: CapabilityTierId;
	contextTokens: number;
}

/** Context attached to a routed task. */
export interface AttachedContext {
	name?: string;
	tokens?: number;
	text?: string;
	modality?: "text" | "image" | "video";
}

/** Partial routing hints supplied by callers or graph nodes. */
export interface TaskHints {
	kind?: TaskKind;
	size?: TaskSize;
	needs?: TaskNeed[];
	sensitivity?: Sensitivity;
	difficulty?: Difficulty;
	minTier?: CapabilityTierId;
}

/** Complete router input before task-profile normalization. */
export interface RouterInput {
	prompt: string;
	attachedFiles?: readonly AttachedContext[];
	toolResults?: readonly unknown[];
	node?: TaskHints & { chain?: string; model?: string; reasoning?: "hard" };
	flags?: TaskHints;
	explicitChain?: string;
	explicitModel?: string;
	reasoning?: "hard";
}

/** Resolved model capabilities and routing metadata. */
export interface ModelCapability {
	candidate: Candidate;
	contextWindow: number;
	tools: boolean;
	reasoning: boolean;
	modalities: ModelModality[];
	quality: Partial<Record<TaskKind, number>>;
	limitTier: LimitTier;
	capabilityTier?: CapabilityTierId;
	reserve?: { requests?: number; tokens?: number };
	source?: "live" | "cache" | "builtin" | "config";
	collection?: "none" | "logging" | "training" | "unknown";
}

/** Configuration override for resolved model capabilities. */
export interface ModelCapabilityOverride extends Partial<Omit<ModelCapability, "candidate">> {}

/** Conditions that select a router policy. */
export interface PolicyMatch {
	kind?: TaskKind[];
	size?: TaskSize[];
	needs?: TaskNeed[];
	sensitivity?: Sensitivity[];
}

/** Candidate/tier/quality preferences applied by a router policy. */
export interface CandidatePreference {
	candidates?: string[];
	tiers?: LimitTier[];
	quality?: TaskKind;
}

/** Named routing rule mapping task matches to candidate preferences. */
export interface RouterPolicy {
	id: string;
	match: PolicyMatch;
	prefer: CandidatePreference;
}

/** Configuration for candidate selection, capability tiers, learning, and data policy. */
export interface RouterConfig {
	classifier?: string;
	candidates?: string[];
	models?: Record<string, ModelCapabilityOverride>;
	policies: RouterPolicy[];
	learning?: { enabled?: boolean; windowMs?: number; maxPenalty?: number; maxRecords?: number };
	capabilityTiers?: CapabilityTier[];
	defaultTier?: CapabilityTierId;
	difficultyTiers?: DifficultyTierMapping;
	dataCollection?: { normal?: string[]; sensitive?: string[] };
}

/** One candidate with routing rank, eligibility state, and evidence. */
export interface RankedCandidate {
	candidate: Candidate;
	rank: number;
	status: "chosen" | "skipped";
	reason: string;
	score: number;
	details: string[];
	capabilityTier?: CapabilityTierId;
}

/** Deterministic routing decision and its ranked candidate evidence. */
export interface RouteResult {
	profile: TaskProfile;
	source: "explicit" | "graph" | "sensitive" | "hard" | "policy" | "default";
	policy?: string;
	difficulty?: Difficulty;
	minCapabilityTier?: CapabilityTierId;
	selectedCapabilityTier?: CapabilityTierId;
	capabilityTierOrder?: CapabilityTierId[];
	ranked: RankedCandidate[];
	rejected?: RankedCandidate[];
	chain: Candidate[];
}

/** Observed outcome used by routing/failover learning. */
export interface CandidateOutcome {
	candidate: Candidate;
	kind: TaskKind;
	success: boolean;
	failureKind?: FailureKind;
	tokens: number;
	durationMs: number;
	observedAt: number;
}
