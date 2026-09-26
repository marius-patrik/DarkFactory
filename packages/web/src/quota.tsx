import type { OperatorQuotaSnapshot, QuotaCredentialState, QuotaState } from "@darkfactory/protocol/quota";
import type { FC } from "react";

/** Browser data-source state for the quota dashboard. */
export type QuotaDashboardState =
	| { status: "disconnected" }
	| { status: "loading" }
	| { status: "error" }
	| { status: "live"; snapshot: OperatorQuotaSnapshot };

/** Browser-safe limit row rendered by the quota dashboard. */
export interface QuotaLimitView {
	type: string;
	dimension?: string;
	state: QuotaState;
	remaining?: number;
	limit?: number;
	resetAt?: number;
}

/** Browser-safe model row rendered by the quota dashboard. */
export interface QuotaModelView {
	providerId: string;
	providerName: string;
	providerState: QuotaState | "no-account";
	credentials: QuotaCredentialState;
	account: string;
	model: string;
	state: QuotaState;
	until?: number;
	limits: readonly QuotaLimitView[];
}

/** Browser-safe account group rendered by the quota dashboard. */
export interface QuotaAccountView {
	label: string;
	models: readonly QuotaModelView[];
}

/** Browser-safe provider group rendered even when no account/model data exists. */
export interface QuotaProviderView {
	id: string;
	name: string;
	enabled: boolean;
	credentials: QuotaCredentialState;
	state: QuotaState | "no-account";
	accounts: readonly QuotaAccountView[];
}

/**
 * Projects the canonical redacted quota snapshot into the even narrower UI model.
 *
 * This is intentionally an allow-list mapper rather than an object spread so unexpected runtime
 * fields can never flow into static/browser rendering.
 */
export function quotaDashboardProviders(snapshot: OperatorQuotaSnapshot): QuotaProviderView[] {
	return snapshot.providers.map((provider) => ({
		id: provider.id,
		name: provider.name,
		enabled: provider.enabled,
		credentials: provider.credentials,
		state: provider.state,
		accounts: provider.accounts.map((account) => ({
			label: account.label,
			models: account.models.map((model) => ({
				providerId: provider.id,
				providerName: provider.name,
				providerState: provider.state,
				credentials: provider.credentials,
				account: account.label,
				model: model.model,
				state: model.state,
				...(model.until === undefined ? {} : { until: model.until }),
				limits: model.items.map((item) => ({
					type: item.type,
					...(item.dimension === undefined ? {} : { dimension: item.dimension }),
					state: item.state,
					...(item.remaining === undefined ? {} : { remaining: item.remaining }),
					...(item.limit === undefined ? {} : { limit: item.limit }),
					...(item.resetAt === undefined ? {} : { resetAt: item.resetAt }),
				})),
			})),
		})),
	}));
}

/** Flattens the provider-grouped dashboard projection for compact operator summaries. */
export function quotaDashboardModels(snapshot: OperatorQuotaSnapshot): QuotaModelView[] {
	return quotaDashboardProviders(snapshot).flatMap((provider) =>
		provider.accounts.flatMap((account) => account.models),
	);
}

function stateLabel(state: QuotaState | "no-account"): string {
	return state === "no-account" ? "No account" : state[0]!.toUpperCase() + state.slice(1);
}

function instant(timestamp: number): string {
	return new Date(timestamp).toISOString();
}

function knownAmount(value: number | undefined): string {
	return value === undefined ? "Unknown" : String(value);
}

const ModelQuotaCard: FC<{ model: QuotaModelView }> = ({ model }) => (
	<article className="quota-model">
		<header>
			<h3>{model.model}</h3>
			<p>
				{model.providerName} ({model.providerId}) · account {model.account}
			</p>
		</header>
		<dl>
			<dt>Availability</dt>
			<dd>{stateLabel(model.state)}</dd>
			<dt>Provider</dt>
			<dd>{stateLabel(model.providerState)}</dd>
			<dt>Credentials</dt>
			<dd>{model.credentials}</dd>
			{model.until === undefined ? null : (
				<>
					<dt>Retry/reset</dt>
					<dd>
						<time dateTime={instant(model.until)}>{instant(model.until)}</time>
					</dd>
				</>
			)}
		</dl>
		{model.limits.length === 0 ? (
			<p>No active or known limit observations.</p>
		) : (
			<ul aria-label="Quota limits">
				{model.limits.map((limit, index) => (
					<li key={limit.type + ":" + (limit.dimension ?? "") + ":" + index}>
						<strong>{limit.type}</strong>
						{limit.dimension ? " · " + limit.dimension : ""} · {stateLabel(limit.state)}
						{" · "}remaining {knownAmount(limit.remaining)}
						{limit.limit === undefined ? "" : " / " + limit.limit}
						{limit.resetAt === undefined ? null : (
							<>
								{" · resets "}
								<time dateTime={instant(limit.resetAt)}>{instant(limit.resetAt)}</time>
							</>
						)}
					</li>
				))}
			</ul>
		)}
	</article>
);

/** Renders the quota dashboard from the shared browser-safe operator snapshot contract. */
export const QuotaDashboardView: FC<{ state: QuotaDashboardState }> = ({ state }) => {
	if (state.status === "disconnected") {
		return (
			<section aria-labelledby="quota-dashboard-title">
				<h2 id="quota-dashboard-title">Quota</h2>
				<p role="status">Live quota data is not connected. No private account data is embedded in this page.</p>
			</section>
		);
	}
	if (state.status === "loading") {
		return (
			<section aria-labelledby="quota-dashboard-title" aria-busy="true">
				<h2 id="quota-dashboard-title">Quota</h2>
				<p role="status">Loading quota data…</p>
			</section>
		);
	}
	if (state.status === "error") {
		return (
			<section aria-labelledby="quota-dashboard-title">
				<h2 id="quota-dashboard-title">Quota</h2>
				<p role="alert">Quota data is unavailable. The dashboard does not render raw runtime error text.</p>
			</section>
		);
	}

	const providers = quotaDashboardProviders(state.snapshot);
	return (
		<section aria-labelledby="quota-dashboard-title">
			<header>
				<h2 id="quota-dashboard-title">Quota</h2>
				<p>
					Snapshot generated <time dateTime={state.snapshot.generatedAt}>{state.snapshot.generatedAt}</time>
				</p>
			</header>
			{providers.length === 0 ? (
				<p role="status">No providers are present in this quota snapshot.</p>
			) : (
				<div className="quota-providers">
					{providers.map((provider) => (
						<section key={provider.id} className="quota-provider" aria-labelledby={"quota-provider-" + provider.id}>
							<h3 id={"quota-provider-" + provider.id}>{provider.name}</h3>
							<p>
								{provider.id} · {provider.enabled ? "Enabled" : "Disabled"} · {stateLabel(provider.state)}
								{" · credentials " + provider.credentials}
							</p>
							{provider.accounts.length === 0 ? (
								<p>No account/model quota data is available for this provider.</p>
							) : (
								provider.accounts.map((account) => (
									<section key={account.label} className="quota-account">
										<h4>Account {account.label}</h4>
										{account.models.length === 0 ? (
											<p>No model quota data is available for this account.</p>
										) : (
											<div className="quota-grid">
												{account.models.map((model) => (
													<ModelQuotaCard
														key={model.providerId + ":" + model.account + ":" + model.model}
														model={model}
													/>
												))}
											</div>
										)}
									</section>
								))
							)}
						</section>
					))}
				</div>
			)}
		</section>
	);
};
