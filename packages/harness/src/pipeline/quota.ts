/**
 * When a run that stopped on quota may start again.
 *
 * The time is decided by whichever signal the provider gave, in order of specificity: an explicit
 * reset timestamp, a `resetAt` epoch, a retry delay, and only then a guess. The guess is the next
 * midnight in America/Los_Angeles, because that is when Google's daily free-tier quotas reset.
 *
 * The Pacific arithmetic is computed from the US daylight-saving rule rather than a time zone
 * database, so it works in an image with no `tzdata` and needs no dependency.
 */

/** An ISO-8601 timestamp, with or without a zone designator. */
const ISO_TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?/u;

/** A `resetAt` epoch in milliseconds, as several providers report it. */
const RESET_AT_RE = /"resetAt"\s*:\s*(\d{10,})/u;

/** A `retryDelay` in seconds, as the Google APIs report it. */
const RETRY_DELAY_RE = /"retryDelay"\s*:\s*(\d+)/u;

/** The prose form of a retry delay. */
const RETRY_PROSE_RE = /please\s+retry\s+in\s+(\d+)s/iu;

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86400;

/**
 * The UTC offset of America/Los_Angeles at a moment, in hours.
 *
 * -7 during daylight saving time (second Sunday of March to first Sunday of November), else -8.
 * Transitions are at 02:00 local, which is 10:00 UTC entering and 09:00 UTC leaving.
 *
 * @param momentMs - The moment, in epoch milliseconds.
 * @returns The offset in hours.
 */
export function pacificOffsetHours(momentMs: number): number {
	const year = new Date(momentMs).getUTCFullYear();
	const marchFirst = Date.UTC(year, 2, 1);
	const novemberFirst = Date.UTC(year, 10, 1);
	const daysUntilSunday = (epochMs: number): number => (7 - new Date(epochMs).getUTCDay()) % 7;
	const secondSundayMarch = marchFirst + (daysUntilSunday(marchFirst) + 7) * SECONDS_PER_DAY * 1000;
	const firstSundayNovember = novemberFirst + daysUntilSunday(novemberFirst) * SECONDS_PER_DAY * 1000;
	const dstStart = Date.UTC(year, 2, new Date(secondSundayMarch).getUTCDate(), 10);
	const dstEnd = Date.UTC(year, 10, new Date(firstSundayNovember).getUTCDate(), 9);
	return dstStart <= momentMs && momentMs < dstEnd ? -7 : -8;
}

/**
 * The epoch seconds of the next midnight in America/Los_Angeles.
 *
 * @param nowSeconds - The current time in epoch seconds.
 * @returns The next Pacific midnight, in epoch seconds.
 */
export function nextPacificMidnight(nowSeconds: number): number {
	const nowMs = nowSeconds * MILLISECONDS_PER_SECOND;
	const localMs = nowMs + pacificOffsetHours(nowMs) * 60 * 60 * MILLISECONDS_PER_SECOND;
	const local = new Date(localMs);
	const localNextMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
	// The offset is read twice because the offset at the *guess* can differ from the offset now,
	// on the two days a year the transition falls between.
	const guess = localNextMidnight - pacificOffsetHours(nowMs) * 60 * 60 * MILLISECONDS_PER_SECOND;
	const resolved = localNextMidnight - pacificOffsetHours(guess) * 60 * 60 * MILLISECONDS_PER_SECOND;
	return resolved / MILLISECONDS_PER_SECOND;
}

/**
 * The earliest moment a run that stopped on quota may resume.
 *
 * Uses, in order: an ISO timestamp found in the detail, a `resetAt` epoch in milliseconds, a
 * `retryDelay` or `Please retry in Ns` value added to `now`, and finally the next Pacific midnight.
 * The order is by specificity, so a provider that told us exactly when is believed over one that
 * only told us how long.
 *
 * @param errorDetail - The failure detail the provider produced.
 * @param nowSeconds - The current time in epoch seconds.
 * @returns The resume moment, in epoch seconds.
 */
export function nextQuotaReset(errorDetail: string, nowSeconds: number): number {
	const iso = ISO_TIMESTAMP_RE.exec(errorDetail);
	if (iso) {
		const parsed = Date.parse(iso[0].endsWith("Z") ? iso[0] : `${iso[0]}Z`);
		if (!Number.isNaN(parsed)) return parsed / MILLISECONDS_PER_SECOND;
	}
	const resetAt = RESET_AT_RE.exec(errorDetail);
	if (resetAt) {
		const milliseconds = Number(resetAt[1]);
		if (Number.isFinite(milliseconds)) return milliseconds / MILLISECONDS_PER_SECOND;
	}
	const delay = RETRY_DELAY_RE.exec(errorDetail) ?? RETRY_PROSE_RE.exec(errorDetail);
	if (delay) {
		const seconds = Number(delay[1]);
		if (Number.isFinite(seconds)) return nowSeconds + seconds;
	}
	return nextPacificMidnight(nowSeconds);
}

/** The provider list a run names when every candidate in the chain ran out. */
const CHAIN_SUFFIX_RE = /across every harness and model\s*\(([^)]+)\)/u;

/**
 * Read the provider names a run names when it ran out of quota across the whole chain.
 *
 * These names go into the repository's provider map so a later resume knows which provider is worth
 * trying first, so the list has to come from the failure itself rather than from the chain the
 * runner happened to be configured with.
 *
 * @param errorDetail - The failure detail the run produced.
 * @returns The provider names, or an empty array when the detail names none.
 */
export function exhaustedProviders(errorDetail: string): string[] {
	const match = CHAIN_SUFFIX_RE.exec(errorDetail);
	if (!match?.[1]) return [];
	return match[1]
		.split(",")
		.map((provider) => provider.trim())
		.filter(Boolean);
}

/** What a run variable records about one blocked item. */
export interface QuotaBlockRecord {
	/** The issue or pull request that was blocked. */
	item: number;
	/** Whether that item is a pull request. */
	isPr: boolean;
	/** When the run may resume, as an ISO-8601 UTC instant. */
	resetAt: string;
	/** When the block was recorded, as an ISO-8601 UTC instant. */
	blockedAt: string;
}

/**
 * Format an epoch second as the ISO-8601 UTC instant the repository variables store.
 *
 * @param epochSeconds - The instant in epoch seconds.
 * @returns The instant as `YYYY-MM-DDTHH:MM:SSZ`.
 */
export function isoUtc(epochSeconds: number): string {
	return `${new Date(epochSeconds * MILLISECONDS_PER_SECOND).toISOString().slice(0, 19)}Z`;
}

/**
 * Build the run variable that records a blocked item.
 *
 * @param input - The blocked item, the resume moment, and when the block was recorded.
 * @returns The run variable's JSON value.
 */
export function quotaBlockRecord(input: {
	item: number;
	isPr: boolean;
	resetAt: number;
	blockedAt: number;
}): QuotaBlockRecord {
	return {
		item: input.item,
		isPr: input.isPr,
		resetAt: isoUtc(input.resetAt),
		blockedAt: isoUtc(input.blockedAt),
	};
}

/**
 * Merge freshly blocked providers into the stored map, keeping the latest reset per provider.
 *
 * The map is monotonic on purpose: a run that was blocked until tomorrow must not be unblocked by
 * a later run that only saw a one-minute retry delay for the same provider.
 *
 * @param existing - The stored provider map.
 * @param providers - The providers this run exhausted.
 * @param resetAt - The resume moment.
 * @returns The map to write back.
 */
export function mergeProviderResets(
	existing: Readonly<Record<string, number>>,
	providers: readonly string[],
	resetAt: number,
): Record<string, number> {
	const merged: Record<string, number> = { ...existing };
	for (const provider of providers) {
		merged[provider] = Math.max(merged[provider] ?? 0, resetAt);
	}
	return merged;
}

/** The repository variable holding the per-provider resume moments. */
export const QUOTA_PROVIDERS_VARIABLE = "DARKFACTORY_QUOTA_PROVIDERS";

/**
 * The repository variable holding one blocked item's state, for a given run.
 *
 * @param runId - The GitHub Actions run id.
 * @returns The variable name.
 */
export function quotaRunVariable(runId: string): string {
	return `DF_QUOTA_${runId}`;
}

/**
 * Report whether a failed `gh` write means the variable already exists.
 *
 * `gh api` reports a create over an existing variable as HTTP 409, and the write has to fall back
 * to a patch. The wording check is there because not every failure surfaces the status code.
 *
 * @param failure - The message the failed write produced.
 * @returns `true` for a 409 or an "Already exists".
 */
export function alreadyExists(failure: string): boolean {
	return failure.includes("409") || failure.toLowerCase().includes("already exists");
}
