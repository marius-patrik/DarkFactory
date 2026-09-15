import type { Candidate } from "../failover.ts";

/**
 * Types of limits that can be applied (e.g., rate limiting, daily quota).
 */
export type LimitType = "rate" | "daily" | "window" | "monthly" | "overload" | "auth";
/**
 * Dimensions of a limit, indicating whether it counts requests or tokens.
 */
export type LimitDimension = "requests" | "tokens" | "usage";
/**
 * Source of a limit value.
 *
 * - `"header"`: derived from response headers.
 * - `"body"`: parsed from response body.
 * - `"rule"`: from a configured rule.
 * - `"default"`: default limit when none provided.
 * - `"migration"`: limits from migration process.
 * - `"manual"`: manually set limits.
 * - `"declared"`: limits declared in schema.
 */
export type LimitSource = "header" | "body" | "rule" | "default" | "migration" | "manual" | "declared";

/**
 * Represents a limit entry for a specific candidate model, including its quota and source.
 */
export interface LimitEntry extends Candidate {
  /** The type of limit (e.g., rate, daily). */
  type: LimitType;
  /** Optional dimension of the limit (e.g., requests, tokens). */
  dimension?: LimitDimension;
  /** Optional pool name for aggregated limits. */
  pool?: string;
  /** Timestamp when the limit observation was recorded. */
  observedAt: number;
  /** Timestamp when the limit resets. */
  resetAt: number;
  /** Source from which the limit value was obtained. */
  source: LimitSource;
  /** Remaining quota (if known). */
  remaining?: number;
  /** Absolute limit value (if known). */
  limit?: number;
}

/**
 * Observation data from a limit request, including HTTP status and optional response data.
 */
export interface LimitObservation {
  /** HTTP status code of the request. */
  status: number;
  /** Optional response headers. */
  headers?: Headers | Record<string, string>;
  /** Optional response body. */
  body?: unknown;
}

/**
 * Generates a unique key string for a limit entry based on its identifying fields.
 *
 * @param entry - Object containing the identifying properties of the limit.
 * @returns Concatenated key string.
 */
export function limitKey(entry: Pick<LimitEntry, "provider" | "account" | "model" | "pool" | "type" | "dimension">): string {
	return [entry.provider, entry.account, entry.pool ?? entry.model, entry.type, entry.dimension ?? "usage"].join("/");
}
