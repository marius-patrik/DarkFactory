/**
 * Retry pacing.
 *
 * The model order this file also used to carry is gone. `DEFAULT_MODEL_FALLBACK_CHAIN` named
 * `gemini-3.8-flash-high` and `claude-opus-*` in code, and `getModelFallbackChain` — its only reader —
 * had no caller at all. Model preference is declared in the configuration document's
 * `providers.router` policies and `df` resolves the model it runs, so a second ladder here was a
 * policy nothing read.
 */

/** Tuning for {@link calculateBackoff}. */
interface BackoffOptions {
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
