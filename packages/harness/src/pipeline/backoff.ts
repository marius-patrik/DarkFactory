/**
 * Retry pacing and the model order the ladder walks.
 *
 * Both exist for one reason: an unused account is always a better answer than sleeping. The backoff
 * is therefore only ever consulted at the end of the chain, where there is nothing left to rotate
 * to, and the chain itself is ordered so the cheapest usable model is tried first.
 */

/** The models the ladder falls back through when the node names none. */
export const DEFAULT_MODEL_FALLBACK_CHAIN: readonly string[] = ["gemini-3.8-flash-high", "claude-opus-4-6-thinking"];

/** Tuning for {@link calculateBackoff}. */
export interface BackoffOptions {
	/** Initial delay in seconds. */
	baseDelay?: number;
	/** Multiplier for the exponential growth. */
	backoffFactor?: number;
	/** Upper bound in seconds. */
	maxDelay?: number;
	/** Whether to add random jitter. */
	jitter?: boolean;
	/** Maximum fraction of the computed delay added as jitter. */
	jitterFactor?: number;
	/** Jitter source, in `[0, 1)`. Injected so the delay is reproducible under test. */
	random?: () => number;
}

/** The exponent is clamped here so a large attempt number cannot overflow to infinity. */
const MAX_EXPONENT = 30;

/**
 * An exponential backoff delay with jitter.
 *
 * The jitter is added to a *base clamped below the maximum*, so the sum still respects `maxDelay`.
 * Clamping only the final result would make the maximum unreachable for every attempt.
 *
 * @param attempt - Zero-based retry attempt number.
 * @param options - Tuning, and the jitter source.
 * @returns The delay in seconds.
 */
export function calculateBackoff(attempt: number, options: BackoffOptions = {}): number {
	const {
		baseDelay = 1.0,
		backoffFactor = 2.0,
		maxDelay = 60.0,
		jitter = true,
		jitterFactor = 0.5,
		random = Math.random,
	} = options;
	if (maxDelay <= 0) return 0;
	const safeAttempt = Math.max(0, Math.min(attempt, MAX_EXPONENT));
	const rawDelay = baseDelay * backoffFactor ** safeAttempt;
	if (!jitter || jitterFactor <= 0) return Math.min(maxDelay, rawDelay);
	const maxBase = maxDelay / (1.0 + jitterFactor);
	const effectiveBase = Math.min(rawDelay, maxBase);
	const delay = effectiveBase + random() * effectiveBase * jitterFactor;
	return Math.min(maxDelay, delay);
}

/**
 * The ordered model chain the ladder attempts, starting with the initial model.
 *
 * An explicit chain the node supplies wins, rotated so the initial model is first. Without one, the
 * node's model is prepended to the default chain unless it is already in it, so naming a model in
 * the default chain narrows the ladder rather than repeating it.
 *
 * @param initialModel - The model the node configured, if any.
 * @param customChain - An explicit chain, if the node supplied one.
 * @returns The model identifiers to attempt, in order.
 */
export function getModelFallbackChain(initialModel?: string, customChain?: readonly string[]): string[] {
	if (customChain !== undefined) {
		const chain = [...customChain];
		if (!initialModel) return chain;
		const at = chain.indexOf(initialModel);
		return at >= 0 ? chain.slice(at) : [initialModel, ...chain];
	}
	if (!initialModel) return [...DEFAULT_MODEL_FALLBACK_CHAIN];
	const defaultAt = DEFAULT_MODEL_FALLBACK_CHAIN.indexOf(initialModel);
	return defaultAt >= 0
		? DEFAULT_MODEL_FALLBACK_CHAIN.slice(defaultAt).slice()
		: [initialModel, ...DEFAULT_MODEL_FALLBACK_CHAIN];
}
