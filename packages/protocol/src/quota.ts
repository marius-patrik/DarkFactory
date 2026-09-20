import type { Candidate } from "./model.ts";

/** Availability of a provider/account/model candidate under the canonical quota engine. */
export type QuotaState = "available" | "waiting" | "exhausted" | "unavailable" | "unknown";

/** One browser-safe limit observation used by CLI, TUI and web operator surfaces. */
export interface QuotaStatusItem {
	provider: string;
	account: string;
	model: string;
	pool?: string;
	type: string;
	dimension?: string;
	limit?: number;
	used?: number;
	remaining?: number;
	windowStart?: number;
	resetAt?: number;
	state: QuotaState;
	source: string;
	sourceUrl?: string;
	checkedAt?: string;
	note?: string;
	enforced: boolean;
	origin: "declared" | "learned";
}

/** Canonical browser-safe quota state for one routed model candidate. */
export interface CandidateQuota extends Candidate {
	state: QuotaState;
	until?: number;
	reason?: string;
	items: readonly QuotaStatusItem[];
}

/** Non-secret credential availability exposed to operator surfaces. */
export type QuotaCredentialState = "configured" | "anonymous" | "missing";

/** Browser-safe quota state for one account label. */
export interface OperatorQuotaAccount {
	label: string;
	models: readonly CandidateQuota[];
}

/** Browser-safe provider quota state with no credential material or secret-bearing provider configuration. */
export interface OperatorQuotaProvider {
	id: string;
	name: string;
	enabled: boolean;
	credentials: QuotaCredentialState;
	state: QuotaState | "no-account";
	accounts: readonly OperatorQuotaAccount[];
}

/** Redacted canonical quota snapshot shared by CLI, TUI and DarkFactory Web. */
export interface OperatorQuotaSnapshot {
	version: 1;
	generatedAt: string;
	providers: readonly OperatorQuotaProvider[];
}
