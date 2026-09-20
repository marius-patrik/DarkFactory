import type { OperatorQuotaSnapshot } from "../../../packages/protocol/src/quota.ts";\nimport type { Candidate } from "../failover.ts";
import type { DeclaredLimitConfig, FreeTierConfig, ProviderConfig } from "../providers/schema.ts";
import type { CandidateQuota, QuotaEngine, QuotaState } from "./quota-engine.ts";

export interface QuotaReportAccount {
	label: string;
	models: CandidateQuota[];
}

export interface QuotaReportProvider {
	id: string;
	name: string;
	dialect: string;
	baseUrl: string;
	/** Disabled providers are listed (they may need local configuration first) but never evaluated. */
	enabled: boolean;
	/** configured: df holds an account; anonymous: usable without a key; missing: needs a login or key first. */
	credentials: "configured" | "anonymous" | "missing";
	state: QuotaState | "no-account";
	free?: FreeTierConfig;
	/** Optional data‑collection configuration for a provider */
	data?: {
		collection: "none" | "logging" | "training" | "unknown";
		source?: string;
		sourceUrl?: string;
		checkedAt?: string;
	};
	declared: DeclaredLimitConfig[];
	accounts: QuotaReportAccount[];
}

export interface QuotaReport {
	version: 2;
	generatedAt: string;
	providers: QuotaReportProvider[];
}

export interface QuotaReportInput {
	providers: readonly ProviderConfig[];
	accounts: ReadonlyArray<{ provider: string; label: string }>;
	/** Candidates named in df's configured chains; their models are reported even when not in the static catalog. */
	chains: readonly Candidate[];
	engine: QuotaEngine;
	now?: number;
	provider?: string;
}

function providerState(accounts: readonly QuotaReportAccount[]): QuotaState {
	const states = accounts.flatMap((account) => account.models.map((model) => model.state));
	if (states.includes("available")) return "available";
	if (states.includes("waiting")) return "waiting";
	if (states.includes("exhausted")) return "exhausted";
	if (states.includes("unavailable")) return "unavailable";
	return "unknown";
}

/** df's single quota status surface: every provider, account and model with the source of each number. Sends no requests. */
export async function buildQuotaReport(input: QuotaReportInput): Promise<QuotaReport> {
	const now = input.now ?? Date.now();
	const providers: QuotaReportProvider[] = [];
	for (const provider of input.providers) {
		if (input.provider && provider.id !== input.provider) continue;
		const enabled = provider.enabled !== false;
		const configured = input.accounts
			.filter((account) => account.provider === provider.id)
			.map((account) => account.label);
		const anonymous = configured.length === 0 && provider.auth.some((auth) => auth.kind === "api_key" && auth.optional);
		const labels = !enabled ? [] : configured.length > 0 ? configured : anonymous ? ["default"] : [];
		const accounts: QuotaReportAccount[] = [];
		for (const label of labels) {
			const models = new Set(provider.models.static.map((model) => model.id));
			for (const candidate of input.chains)
				if (candidate.provider === provider.id && candidate.account === label) models.add(candidate.model);
			const statuses: CandidateQuota[] = [];
			for (const model of models)
				statuses.push(await input.engine.status({ provider: provider.id, account: label, model }, now));
			accounts.push({ label, models: statuses });
		}
		const data: NonNullable<QuotaReportProvider["data"]> = provider.free?.data ??
			provider.data ?? { collection: "unknown" };
		providers.push({
			id: provider.id,
			name: provider.name,
			dialect: provider.dialect,
			baseUrl: provider.baseUrl,
			enabled,
			credentials: configured.length > 0 ? "configured" : anonymous ? "anonymous" : "missing",
			state: labels.length === 0 ? "no-account" : providerState(accounts),
			...(provider.free ? { free: provider.free } : {}),
			declared: provider.limits?.declared ?? [],
			data,
			accounts,
		});
	}
	if (input.provider && providers.length === 0) throw new Error(`Unknown provider ${input.provider}`);
	return { version: 2, generatedAt: new Date(now).toISOString(), providers };
}


function operatorQuotaItem(item: CandidateQuota["items"][number]) {
	return {
		provider: item.provider,
		account: item.account,
		model: item.model,
		...(item.pool ? { pool: item.pool } : {}),
		type: item.type,
		...(item.dimension ? { dimension: item.dimension } : {}),
		...(item.limit !== undefined ? { limit: item.limit } : {}),
		...(item.used !== undefined ? { used: item.used } : {}),
		...(item.remaining !== undefined ? { remaining: item.remaining } : {}),
		...(item.windowStart !== undefined ? { windowStart: item.windowStart } : {}),
		...(item.resetAt !== undefined ? { resetAt: item.resetAt } : {}),
		state: item.state,
		source: item.source,
		...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
		...(item.checkedAt ? { checkedAt: item.checkedAt } : {}),
		...(item.note ? { note: item.note } : {}),
		enforced: item.enforced,
		origin: item.origin,
	};
}

/**
 * Projects the canonical quota report into the redacted browser-safe operator contract.
 *
 * Provider transport URLs, dialect configuration, free-tier configuration and declared policy objects are deliberately
 * excluded so future additions to provider configuration cannot leak into static/browser operator surfaces by spread.
 */
export function operatorQuotaSnapshot(report: QuotaReport): OperatorQuotaSnapshot {
	return {
		version: 1,
		generatedAt: report.generatedAt,
		providers: report.providers.map((provider) => ({
			id: provider.id,
			name: provider.name,
			enabled: provider.enabled,
			credentials: provider.credentials,
			state: provider.state,
			accounts: provider.accounts.map((account) => ({
				label: account.label,
				models: account.models.map((model) => ({
					provider: model.provider,
					account: model.account,
					model: model.model,
					state: model.state,
					...(model.until !== undefined ? { until: model.until } : {}),
					...(model.reason ? { reason: model.reason } : {}),
					items: model.items.map(operatorQuotaItem),
				})),
			})),
		})),
	};
}

/** Builds the canonical runtime quota report and immediately projects its redacted operator snapshot. */
export async function buildOperatorQuotaSnapshot(input: QuotaReportInput): Promise<OperatorQuotaSnapshot> {
	return operatorQuotaSnapshot(await buildQuotaReport(input));
}
