import type { Candidate } from "../failover.ts";
import type { DeclaredLimitConfig, FreeTierConfig, ProviderConfig } from "../providers/schema.ts";
import type { CandidateQuota, QuotaEngine, QuotaState } from "./quota-engine.ts";

/**
 * Mapping entry for a provider's account used in quota report input.
 */
interface QuotaReportAccountMap {
  /** Identifier of the provider */
  provider: string;
  /** Human‑readable label for the account */
  label: string;
}

/**
 * Represents a quota report for a specific account, listing the models and their quota information.
 */
export interface QuotaReportAccount {
	/** Account label */
label: string;
	/** Array of quota information for each model under this account */
models: CandidateQuota[];
}

/**
 * Detailed quota information for a provider, including its accounts and model quotas.
 */
export interface QuotaReportProvider {
	/** Provider identifier */
id: string;
	/** Human‑readable provider name */
name: string;
	/** Provider dialect (e.g., "openai", "anthropic") */
dialect: string;
	/** Base URL for the provider API */
baseUrl: string;
	/** Disabled providers are listed (they may need local configuration first) but never evaluated. */
	enabled: boolean;
	/** configured: df holds an account; anonymous: usable without a key; missing: needs a login or key first. */
	credentials: "configured" | "anonymous" | "missing";
	/** Overall quota state for the provider (or "no-account" if no accounts are configured) */
state: QuotaState | "no-account";
	/** Optional free‑tier configuration */
free?: FreeTierConfig;
	/** Limits that the provider has declared in its configuration */
declared: DeclaredLimitConfig[];
	/** Quota information for each account under this provider */
accounts: QuotaReportAccount[];
}

/**
 * Top‑level quota report produced by the CLI.
 */
export interface QuotaReport {
	/** Report format version (currently 2) */
version: 2;
	/** ISO‑8601 timestamp when the report was generated */
generatedAt: string;
	/** List of providers included in the report */
providers: QuotaReportProvider[];
}

/**
 * Parameters required to build a quota report.
 */
export interface QuotaReportInput {
	/** Provider configurations to include in the report */
providers: readonly ProviderConfig[];
/**
 * Mapping of provider IDs to account labels that are configured.
 *
 * @property provider - Identifier of the provider.
 * @property label - Human‑readable label for the account.
 */
accounts: ReadonlyArray<QuotaReportAccountMap>;
	/** Candidate chains whose models should be reported even if not in the static catalog */
chains: readonly Candidate[];
	/** Quota engine used to query the current quota status */
engine: QuotaEngine;
	/** Optional override for the current timestamp (in ms since epoch) */
now?: number;
	/** Optional provider ID to limit the report to a single provider */
provider?: string;
}

function providerState(accounts: readonly QuotaReportAccount[]): QuotaState {
	const states = accounts.flatMap((account) => account.models.map((model) => model.state));
	if (states.includes("available")) return "available";
	if (states.includes("waiting")) return "waiting";
	if (states.includes("exhausted")) return "exhausted";
	return "unknown";
}

/**
 * Generates a quota report based on the supplied input.
 *
 * @param input - Configuration and state required to build the report.
 * @returns A {@link QuotaReport} containing quota information for each provider.
 * @throws If a specific provider is requested via `input.provider` but does not exist.
 */
export async function buildQuotaReport(input: QuotaReportInput): Promise<QuotaReport> {
	const now = input.now ?? Date.now();
	const providers: QuotaReportProvider[] = [];
	for (const provider of input.providers) {
		if (input.provider && provider.id !== input.provider) continue;
		const enabled = provider.enabled !== false;
		const configured = input.accounts.filter((account) => account.provider === provider.id).map((account) => account.label);
		const anonymous = configured.length === 0 && provider.auth.some((auth) => auth.kind === "api_key" && auth.optional);
		const labels = !enabled ? [] : configured.length > 0 ? configured : anonymous ? ["default"] : [];
		const accounts: QuotaReportAccount[] = [];
		for (const label of labels) {
			const models = new Set(provider.models.static.map((model) => model.id));
			for (const candidate of input.chains) if (candidate.provider === provider.id && candidate.account === label) models.add(candidate.model);
			const statuses: CandidateQuota[] = [];
			for (const model of models) statuses.push(await input.engine.status({ provider: provider.id, account: label, model }, now));
			accounts.push({ label, models: statuses });
		}
		providers.push({
			id: provider.id, name: provider.name, dialect: provider.dialect, baseUrl: provider.baseUrl, enabled,
			credentials: configured.length > 0 ? "configured" : anonymous ? "anonymous" : "missing",
			state: labels.length === 0 ? "no-account" : providerState(accounts),
			...(provider.free ? { free: provider.free } : {}),
			declared: provider.limits?.declared ?? [],
			accounts,
		});
	}
	if (input.provider && providers.length === 0) throw new Error(`Unknown provider ${input.provider}`);
	return { version: 2, generatedAt: new Date(now).toISOString(), providers };
}
