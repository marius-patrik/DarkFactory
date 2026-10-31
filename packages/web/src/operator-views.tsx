import type { FC } from "react";
import type {
	OperatorCollection, OperatorConfig, OperatorItem, OperatorRepository, OperatorResource,
	OperatorResourceData, ResourceState,
} from "./operator-data.ts";
import { QuotaDashboardView, type QuotaDashboardState } from "./quota.tsx";
import { repositoryIdentity } from "./site-contract.ts";

export interface OperatorSurface {
	id: string;
	title: string;
	description: string;
	group: "Workspace" | "Delivery" | "System";
	resource: OperatorResource;
}
/** Product surfaces are live projections; no fabricated workflow, approvals, or graph snapshots. */
export const SURFACES: readonly OperatorSurface[] = [
	{ id: "/", title: "Overview", description: "Authoritative repository identity and GitHub metadata.", group: "Workspace", resource: "repository" },
	{ id: "/requests", title: "Requests", description: "Recently updated issues labeled Request. The displayed slice may be incomplete.", group: "Workspace", resource: "requests" },
	{ id: "/planning", title: "Planning", description: "Issues labeled Planning, subject to the GitHub first-page limit.", group: "Workspace", resource: "planning" },
	{ id: "/approvals", title: "Approvals", description: "Approval records from GitHub issue labels, not proof of release authorization.", group: "Workspace", resource: "approvals" },
	{ id: "/epics", title: "Epics", description: "Epics and dependency references from repository issues.", group: "Workspace", resource: "epics" },
	{ id: "/pulls", title: "Pull requests", description: "Actual GitHub pull requests and head/base revisions.", group: "Delivery", resource: "pulls" },
	{ id: "/checks", title: "Checks", description: "GitHub check runs for the repository's default HEAD reference.", group: "Delivery", resource: "checks" },
	{ id: "/runs", title: "Workflows", description: "Recent GitHub Actions workflow runs.", group: "Delivery", resource: "runs" },
	{ id: "/graph", title: "Graph execution", description: "Durable graph execution requires an authenticated runtime read endpoint.", group: "Delivery", resource: "graph" },
	{ id: "/recovery", title: "Recovery", description: "Resumable execution status requires a verified runtime backend.", group: "Delivery", resource: "recovery" },
	{ id: "/projects", title: "Projects", description: "GitHub Projects data requires an installation-scoped GraphQL bridge.", group: "Delivery", resource: "projects" },
	{ id: "/releases", title: "Releases", description: "Published GitHub releases and tags; not evidence of production acceptance.", group: "Delivery", resource: "releases" },
	{ id: "/capabilities", title: "Capabilities", description: "Capability source directories; runtime installation status is not inferred.", group: "System", resource: "capabilities" },
	{ id: "/configuration", title: "Configuration", description: "Live read-only canonical repository configuration file.", group: "System", resource: "configuration" },
	{ id: "/audit", title: "Audit", description: "Public GitHub event history, not a complete privileged operation audit.", group: "System", resource: "audit" },
	{ id: "/quota", title: "Providers and quota", description: "Redacted quota from a trusted runtime snapshot, when connected.", group: "System", resource: "quota" },
];
export function safeGitHubLink(raw: string, slug: string): string | undefined {
	try {
		const repo = repositoryIdentity(slug);
		const url = new URL(raw);
		if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password)
			return undefined;
		const prefix = `/${repo.owner}/${repo.name}`;
		if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return undefined;
		return url.toString();
	} catch { return undefined; }
}
function isCollection(value: OperatorResourceData): value is OperatorCollection {
	return "items" in value;
}
function isConfig(value: OperatorResourceData): value is OperatorConfig {
	return "content" in value;
}
const Row: FC<{ item: OperatorItem; repository: string }> = ({ item, repository }) => {
	const href = safeGitHubLink(item.url, repository);
	return <li className="df-row">
		<div className="df-row-content">
			<strong>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{item.title}</a> : item.title}</strong>
			<div className="df-meta">
				<span>#{item.id}</span>
				{item.state ? <span className="df-badge">{item.state}</span> : null}
				{item.subtitle ? <span>{item.subtitle}</span> : null}
				{item.updatedAt ? <time dateTime={item.updatedAt}>{item.updatedAt}</time> : null}
			</div>
			{item.labels?.length ? <div className="df-tags">{item.labels.map(label => <span key={label} className="df-tag">{label}</span>)}</div> : null}
			{item.head ? <p className="df-data-note">Head: {item.head}{item.base ? ` · Base: ${item.base}` : ""}</p> : null}
			{item.body ? <p className="df-data-note">{item.body.slice(0, 260)}{item.body.length > 260 ? "…" : ""}</p> : null}
		</div>
	</li>;
};
function RepositorySummary({ value }: { value: OperatorRepository }) {
	return <div className="df-summary" role="group" aria-label="Repository metadata">
		<div className="df-stat"><span>Repository</span><strong>{value.fullName}</strong></div>
		<div className="df-stat"><span>Default branch</span><strong>{value.defaultBranch || "Unknown"}</strong></div>
		<div className="df-stat"><span>Visibility</span><strong>{value.private ? "Private" : "Public"}</strong></div>
		<div className="df-stat"><span>Open issue/PR count (GitHub)</span><strong>{value.openIssues}</strong></div>
		{value.description ? <p>{value.description}</p> : null}
		<p className="df-data-note">Last repository update: {value.updatedAt || "Unknown"}</p>
	</div>;
}
export const OperatorView: FC<{
	surface: OperatorSurface;
	repository: string;
	state: ResourceState<OperatorResourceData>;
	quotaState?: QuotaDashboardState;
	onRefresh?: () => void;
}> = ({ surface, repository, state, quotaState, onRefresh }) => {
	if (surface.resource === "quota")
		return <QuotaDashboardView state={quotaState ?? { status: "disconnected" }} />;
	return <section className="df-section" aria-labelledby="df-surface-heading">
		<header className="df-heading">
			<h2 id="df-surface-heading">{surface.title}</h2>
			<p>{surface.description}</p>
		</header>
		<div className="df-toolbar">
			<div className="df-meta"><span>GitHub: {repository}</span>
				{state.status === "live" ? <time dateTime={new Date(state.fetchedAt).toISOString()}>Read at {new Date(state.fetchedAt).toLocaleString()}</time> : null}
			</div>
			{onRefresh ? <button type="button" onClick={onRefresh} disabled={state.status === "loading"}>Refresh GitHub data</button> : null}
		</div>
		{state.status === "idle" || state.status === "loading"
			? <p className="df-notice" role="status" aria-busy="true">Loading verified repository data…</p> : null}
		{(state.status === "unauthorized" || state.status === "rate-limited" || state.status === "blocked" || state.status === "failed")
			? <div role="alert" className="df-notice df-problem">
				<strong>{state.status === "blocked" ? "Backend unavailable or access denied" : state.status === "rate-limited" ? "Rate limited" : "Data unavailable"}</strong>
				<p>{state.detail}</p>
				{state.retryAt ? <p>Retry hint: {state.retryAt}</p> : null}
			</div> : null}
		{state.status === "live" ? isCollection(state.data)
			? <div>
				<p className="df-data-note" role="status">{state.data.items.length} records in this response. {state.data.note}
					{state.limited ? " · More may exist beyond this page." : ""}
				</p>
				{state.data.items.length ? <ul className="df-list">{state.data.items.map(item =>
					<Row key={item.id} item={item} repository={repository} />)}</ul>
					: <p className="df-empty">No records in the verified response. This is not a repository-wide absence claim.</p>}
			</div>
			: isConfig(state.data)
				? <div><p className="df-data-note">Path: {state.data.path} · SHA: {state.data.sha}</p>
					<pre className="df-config">{state.data.content}</pre></div>
				: <RepositorySummary value={state.data}
			/>
			: null}
	</section>;
};
