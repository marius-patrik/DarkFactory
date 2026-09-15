import type { Candidate } from "../failover.ts";
import type { FailureKind } from "../quota.ts";

/**
 * The kind of task to be performed.
 * Possible values represent the type of work the router should handle.
 */
export type TaskKind = "plan" | "implement" | "review" | "fix" | "summarize" | "classify" | "chat" | "image" | "video";
/**
 * Desired size of the task, influencing resource allocation.
 * "small" – minimal resources, "medium" – typical, "large" – high resource usage.
 */
export type TaskSize = "small" | "medium" | "large";
/**
 * Additional capabilities required for the task.
 * Multiple needs can be combined in the `needs` array of a {@link TaskProfile}.
 */
export type TaskNeed = "tools" | "reasoning" | "vision" | "long_context" | "image_gen" | "video_gen";
/**
 * Sensitivity level of the request, influencing privacy handling.
 */
export type Sensitivity = "normal" | "sensitive";
/**
 * Tier for rate‑limit enforcement.
 */
export type LimitTier = "tight" | "standard" | "bulk";
/**
 * Modalities a model can handle.
 */
export type ModelModality = "text" | "image" | "video" | "image_gen" | "video_gen";

/**
 * Describes the concrete characteristics of a routing task.
 */
export interface TaskProfile {
	/** The kind of task to be performed. */
	kind: TaskKind;
	/** Desired size influencing resource allocation. */
	size: TaskSize;
	/** Capabilities required for the task. */
	needs: TaskNeed[];
	/** Sensitivity level for privacy handling. */
	sensitivity: Sensitivity;
	/** Approximate token count of the context. */
	contextTokens: number;
}

/**
 * Information about an attached file or snippet.
 */
export interface AttachedContext {
	/** Optional name of the attachment. */
	name?: string;
	/** Token count of the attachment, if known. */
	tokens?: number;
	/** Raw text of the attachment. */
	text?: string;
	/** Modality of the attachment content. */
	modality?: "text" | "image" | "video";
}
/**
 * Optional hints that can influence routing decisions.
 */
export interface TaskHints {
	/** Preferred task kind. */
	kind?: TaskKind;
	/** Preferred task size. */
	size?: TaskSize;
	/** Preferred capabilities. */
	needs?: TaskNeed[];
	/** Preferred sensitivity. */
	sensitivity?: Sensitivity;
}
/**
 * Input payload for the router.
 */
export interface RouterInput {
	/** The main prompt describing the request. */
	prompt: string;
	/** Optional list of attached files or snippets. */
	attachedFiles?: readonly AttachedContext[];
	/** Results from previously executed tools, if any. */
	toolResults?: readonly unknown[];
	/** Overrides for a specific node in the routing graph. */
	node?: TaskHints & { chain?: string; model?: string; reasoning?: "hard" };
	/** Global routing flags that apply to the entire request. */
	flags?: TaskHints;
	/** Explicitly chosen chain identifier, bypassing policy selection. */
	explicitChain?: string;
	/** Explicitly chosen model name, bypassing model selection. */
	explicitModel?: string;
	/** Force hard reasoning for the request. */
	reasoning?: "hard";
}

/**
 * Describes the capabilities of a model candidate.
 */
export interface ModelCapability {
	/** The underlying candidate definition. */
	candidate: Candidate;
	/** Maximum context window in tokens. */
	contextWindow: number;
	/** Whether the model supports tool usage. */
	tools: boolean;
	/** Whether the model supports hard reasoning. */
	reasoning: boolean;
	/** Modalities the model can handle. */
	modalities: ModelModality[];
	/** Quality score per task kind (higher is better). */
	quality: Partial<Record<TaskKind, number>>;
	/** Rate‑limit tier applied to the candidate. */
	limitTier: LimitTier;
	/**
	 * Optional reservation of capacity.
	 * @property requests - optional number of requests reserved.
	 * @property tokens - optional number of tokens reserved.
	 */
	reserve?: { requests?: number; tokens?: number };
	/** Origin of the capability definition. */
	source?: "live" | "cache" | "builtin" | "config";
}

/**
 * Partial overrides for a model capability, used in {@link RouterConfig.models}.
 */
export interface ModelCapabilityOverride extends Partial<Omit<ModelCapability, "candidate">> {}
/**
 * Criteria that a task must match for a policy to apply.
 */
export interface PolicyMatch {
	/** Allowed task kinds. */
	kind?: TaskKind[];
	/** Allowed task sizes. */
	size?: TaskSize[];
	/** Required capabilities. */
	needs?: TaskNeed[];
	/** Allowed sensitivity levels. */
	sensitivity?: Sensitivity[];
}
/**
 * Preferences that influence candidate ranking within a policy.
 */
export interface CandidatePreference {
	/** Candidate IDs to prioritize. */
	candidates?: string[];
	/** Preferred limit tiers. */
	tiers?: LimitTier[];
	/** Task kind whose quality score should be considered. */
	quality?: TaskKind;
}
/**
 * Routing policy that matches tasks and defines preferences.
 */
export interface RouterPolicy {
	/** Unique identifier for the policy. */
	id: string;
	/** Matching criteria. */
	match: PolicyMatch;
	/** Preference rules when the policy matches. */
	prefer: CandidatePreference;
}
/**
 * Top‑level configuration for the router.
 */
export interface RouterConfig {
	/** Optional classifier model name. */
	classifier?: string;
	/** List of candidate IDs available to the router. */
	candidates?: string[];
	/** Model capability overrides keyed by model name. */
	models?: Record<string, ModelCapabilityOverride>;
	/** Set of routing policies evaluated in order. */
	policies: RouterPolicy[];
	/**
	 * Optional learning configuration for adaptive routing.
	 * @property enabled - whether learning is enabled.
	 * @property windowMs - time window in milliseconds.
	 * @property maxPenalty - maximum penalty applied.
	 * @property maxRecords - maximum number of records stored.
	 */
	learning?: LearningConfig;
}

/**
 * A candidate together with its ranking information.
 */
export interface RankedCandidate {
	/** The candidate reference. */
	candidate: Candidate;
	/** Rank order (lower is better). */
	rank: number;
	/** Whether the candidate was chosen or skipped. */
	status: "chosen" | "skipped";
	/** Human‑readable reason for the ranking decision. */
	reason: string;
	/** Numerical score used for ranking. */
	score: number;
	/** Additional detail strings for debugging. */
	details: string[];
}

/**
 * Result of routing a request.
 */
export interface RouteResult {
	/** The resolved task profile. */
	profile: TaskProfile;
	/** Source of the routing decision. */
	source: "explicit" | "graph" | "sensitive" | "hard" | "policy" | "default";
	/** ID of the policy that was applied, if any. */
	policy?: string;
	/** Ordered list of ranked candidates. */
	ranked: RankedCandidate[];
	/** Final chain of candidates to execute. */
	chain: Candidate[];
}

/**
 * Outcome of executing a candidate.
 */
export interface CandidateOutcome {
	/** The candidate that was run. */
	candidate: Candidate;
	/** Task kind that was executed. */
	kind: TaskKind;
	/** Whether the candidate succeeded. */
	success: boolean;
	/** If failed, the kind of failure. */
	failureKind?: FailureKind;
	/** Token usage of the candidate. */
	tokens: number;
	/** Execution duration in milliseconds. */
	durationMs: number;
	/** Unix timestamp when the outcome was observed. */
	observedAt: number;
}

/**
 * Configuration for adaptive learning.
 */
export interface LearningConfig {
 /** Whether learning is enabled. */
 enabled?: boolean;
 /** Time window in milliseconds. */
 windowMs?: number;
 /** Maximum penalty applied. */
 maxPenalty?: number;
 /** Maximum number of records stored. */
 maxRecords?: number;
 }

