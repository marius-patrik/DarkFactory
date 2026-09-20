export interface Candidate {
	provider: string;
	account: string;
	model: string;
}

export type FailureKind = "quota_exhausted" | "rate_limited" | "auth" | "transient" | "fatal";
export type TaskKind = "plan" | "implement" | "review" | "fix" | "summarize" | "classify" | "chat" | "image" | "video";
export type TaskSize = "small" | "medium" | "large";
export type TaskNeed = "tools" | "reasoning" | "vision" | "long_context" | "image_gen" | "video_gen";
export type Sensitivity = "normal" | "sensitive";
export type LimitTier = "tight" | "standard" | "bulk";
export type ModelModality = "text" | "image" | "video" | "image_gen" | "video_gen";
export type CapabilityTierId = string;
export interface CapabilityTier {
	id: CapabilityTierId;
	match: string[];
}
export type Difficulty = "easy" | "medium" | "hard";
export interface DifficultyTierMapping {
	easy: CapabilityTierId;
	medium: CapabilityTierId;
	hard: CapabilityTierId;
}

export interface TaskProfile {
	kind: TaskKind;
	size: TaskSize;
	needs: TaskNeed[];
	sensitivity: Sensitivity;
	difficulty?: Difficulty;
	minTier?: CapabilityTierId;
	contextTokens: number;
}

export interface AttachedContext {
	name?: string;
	tokens?: number;
	text?: string;
	modality?: "text" | "image" | "video";
}

export interface TaskHints {
	kind?: TaskKind;
	size?: TaskSize;
	needs?: TaskNeed[];
	sensitivity?: Sensitivity;
	difficulty?: Difficulty;
	minTier?: CapabilityTierId;
}

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

export interface ModelCapabilityOverride extends Partial<Omit<ModelCapability, "candidate">> {}

export interface PolicyMatch {
	kind?: TaskKind[];
	size?: TaskSize[];
	needs?: TaskNeed[];
	sensitivity?: Sensitivity[];
}

export interface CandidatePreference {
	candidates?: string[];
	tiers?: LimitTier[];
	quality?: TaskKind;
}

export interface RouterPolicy {
	id: string;
	match: PolicyMatch;
	prefer: CandidatePreference;
}

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

export interface RankedCandidate {
	candidate: Candidate;
	rank: number;
	status: "chosen" | "skipped";
	reason: string;
	score: number;
	details: string[];
	capabilityTier?: CapabilityTierId;
}

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

export interface CandidateOutcome {
	candidate: Candidate;
	kind: TaskKind;
	success: boolean;
	failureKind?: FailureKind;
	tokens: number;
	durationMs: number;
	observedAt: number;
}
