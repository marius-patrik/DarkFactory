import type { Candidate } from "../failover.ts";

export type LimitType = "rate" | "daily" | "window" | "monthly" | "overload" | "auth";
export type LimitDimension = "requests" | "tokens" | "usage";
/** "declared" marks an in-memory admission block from a declared limit; it is never persisted. */
export type LimitSource = "header" | "body" | "rule" | "default" | "migration" | "manual" | "declared";

export interface LimitEntry extends Candidate {
	type: LimitType;
	dimension?: LimitDimension;
	pool?: string;
	observedAt: number;
	resetAt: number;
	source: LimitSource;
	remaining?: number;
	limit?: number;
}

export interface LimitObservation {
	status: number;
	headers?: Headers | Record<string, string>;
	body?: unknown;
}

export function limitKey(entry: Pick<LimitEntry, "provider" | "account" | "model" | "pool" | "type" | "dimension">): string {
	return [entry.provider, entry.account, entry.pool ?? entry.model, entry.type, entry.dimension ?? "usage"].join("/");
}
