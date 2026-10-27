import { useCallback, useEffect, useState, type FC, type ReactNode } from "react";
import {
	type OperatorCollection, type OperatorConfig, type OperatorItem, type OperatorReadSource,
	type OperatorRepository, type OperatorResource, type OperatorResourceData, type ResourceState,
} from "./operator-data.ts";
import {
	type AuthState, type BrowserLoginConfig, type EffectiveAuthority,
	postVerifiedIssueComment,
} from "./operator-auth.ts";
import { type QuotaDashboardState, QuotaDashboardView } from "./quota.tsx";

export const SURFACES = [
	{ path: "/", label: "Overview", resource: "repository", group: "Workspace" },
	{ path: "/requests", label: "Requests", resource: "requests", group: "Work" },
	{ path: "/planning", label: "Planning", resource: "planning", group: "Work" },
	{ path: "/approvals", label: "Approvals", resource: "approvals", group: "Work" },
	{ path: "/epics", label: "Epics & dependencies", resource: "epics", group: "Work" },
	{ path: "/pulls", label: "Pull requests & stacks", resource: "pulls", group: "Delivery" },
	{ path: "/checks", label: "Checks", resource: "checks", group: "Delivery" },
	{ path: "/runs", label: "Workflow runs", resource: "runs", group: "Delivery" },
	{ path: "/graph", label: "Graph execution", resource: "graph", group: "Execution" },
	{ path: "/recovery", label: "Recovery & blocked", resource: "recovery", group: "Execution" },
	{ path: "/projects", label: "GitHub Projects", resource: "projects", group: "Workspace" },
	{ path: "/providers", label: "Providers & quota", resource: "quota", group: "System" },
	{ path: "/capabilities", label: "Capabilities & plugins", resource: "capabilities", group: "System" },
	{ path: "/configuration", label: "Configuration", resource: "configuration", group: "System" },
	{ path: "/releases", label: "Releases", resource: "releases", group: "Delivery" },
	{ path: "/audit", label: "Audit events", resource: "audit", group: "System" },
	{ path: "/docs", label: "Documentation", resource: "docs", group: "Learn" },
] as const satisfies ReadonlyArray<{ path: string; label: string; resource: OperatorResource; group: string }>;

export function safeGitHubLink(raw: string): string | undefined {
	try {
		const parsed = new URL(raw);
		if (parsed.protocol === "https:" && parsed.hostname === "github.com" && !parsed.username && !parsed.password)
			return parsed.href;
	} catch { /* Not a GitHub URL. */ }
	return undefined;
}
function readableTime(value: string): string {
	if (!value) return "Not reported";
	const date = new Date(value);
	return Number.isNaN(date.valueOf()) ? "Not reported" : date.toLocaleString();
}
function StatusBadge({ children }: { children: ReactNode }) {
	return <span className="df-badge">{children}</span>;
}
function ExternalLink({ item }: { item: OperatorItem }) {
	const link = safeGitHubLink(item.url);
	if (/^#\/docs\/[A-Za-z0-9_%.-]+$/u.test(item.url)) return <a href={item.url}>{item.title}</a>;
	return link
		? <a href={link} target="_blank" rel="noopener noreferrer">{item.title}<span className="sr-only"> (opens GitHub)</span></a>
		: <span>{item.title}</span>;
}
export function StateNotice({ state, onRetry }: {
	state: ResourceState<OperatorResourceData>; onRetry: () => void;
}): ReactNode {
	if (state.status === "idle" || state.status === "loading") return <div role="status" aria-busy="true" className="df-notice">Loading live GitHub state…</div>;
	if (state.status === "live") return null;
	return (
		<div className="df-notice df-problem" role={state.status === "failed" ? "alert" : "status"}>
			<strong>{state.status === "rate-limited" ? "Rate limited" : state.status === "unauthorized" ? "Unauthorized" :
				state.status === "blocked" ? "Integration unavailable" : "Unable to load"}</strong>
			<p>{state.detail}</p>
			{state.retryAt ? <p>Retry after <time dateTime={state.retryAt}>{readableTime(state.retryAt)}</time>.</p> : null}
			<button type="button" onClick={onRetry}>Retry live read</button>
		</div>
	);
}
export function useLiveResource(source: OperatorReadSource | undefined, resource: OperatorResource) {
	const [state, setState] = useState<ResourceState<OperatorResourceData>>({ status: "idle" });
	const [revision, setRevision] = useState(0);
	const retry = useCallback(() => setRevision((value) => value + 1), []);
	useEffect(() => {
		if (!source) {
			setState({ status: "blocked", detail: "No repository data source is configured for this deployment." });
			return;
		}
		const controller = new AbortController();
		setState({ status: "loading" });
		void source.read(resource, controller.signal).then((next) => {
			if (!controller.signal.aborted) setState(next);
		}, () => {
			if (!controller.signal.aborted) setState({ status: "failed", detail: "GitHub read failed." });
		});
		return () => controller.abort();
	}, [resource, revision, source]);
	return { state, retry };
}
function ItemList({ data, resource, auth, source, repository }: {
	data: OperatorCollection; resource: OperatorResource; auth?: AuthState;
	source?: OperatorReadSource; repository?: string;
}) {
	const [selected, setSelected] = useState<OperatorItem | null>(null);
	const [comment, setComment] = useState("");
	const [writeState, setWriteState] = useState<"idle" | "pending" | "confirmed" | "error">("idle");
	const [writeDetail, setWriteDetail] = useState("");
	const broker = authConfigForMutation(auth);
	function authConfigForMutation(value?: AuthState): {
		config: BrowserLoginConfig; authority: EffectiveAuthority;
	} | null {
		if (!value?.session || !value.authority || !value.config || !value.authority.canMutate) return null;
		return { config: value.config, authority: value.authority };
	}
	async function submit() {
		if (!selected || !broker || !source || !repository || !auth?.session) return;
		setWriteState("pending"); setWriteDetail("");
		try {
			const confirmed = await postVerifiedIssueComment(
				source, broker.config.broker, auth.session, broker.authority,
				repository, Number(selected.id), comment, selected.updatedAt ?? "",
			);
			setWriteState("confirmed");
			setWriteDetail(`Confirmed GitHub comment #${confirmed.id} by authenticated readback.`);
			setComment("");
		} catch (error) {
			setWriteState("error");
			setWriteDetail(error instanceof Error ? error.message : "Write outcome could not be verified.");
		}
	}
	if (data.items.length === 0) {
		return <div className="df-empty" role="status">No matching records in the currently loaded GitHub page.
			{data.note ? <p>{data.note}</p> : null}</div>;
	}
	return <>
		{data.note ? <p className="df-data-note" role="status">{data.note}</p> : null}
		<ul className="df-list">
			{data.items.map((item) => <li key={item.id} className="df-row">
				<div className="df-row-content">
					<strong><ExternalLink item={item} /></strong>
					<div className="df-meta">
						<span>#{item.id}</span>{item.subtitle ? <span>{item.subtitle}</span> : null}
						{item.updatedAt ? <time dateTime={item.updatedAt}>{readableTime(item.updatedAt)}</time> : null}
						{item.head && item.base ? <span>{item.head} → {item.base}</span> : null}
					</div>
					{item.labels?.length ? <div className="df-tags">{item.labels.map((label) =>
						<span key={label} className="df-tag">{label}</span>)}</div> : null}
					{resource === "epics" && item.body ? <IssueReferences body={item.body} repository={repository} /> : null}
				</div>
				<div className="df-row-actions">
					{item.state ? <StatusBadge>{item.state}</StatusBadge> : null}
					{resource === "pulls" && item.head && data.items.some((candidate) =>
						candidate !== item && candidate.head === item.base)
						? <span className="df-stack">Stacked PR</span> : null}
					{["requests", "planning", "approvals", "recovery"].includes(resource) && broker
						? <button type="button" onClick={() => {
							setSelected(item); setComment(""); setWriteState("idle"); setWriteDetail("");
						}}>Comment</button> : null}
				</div>
			</li>)}
		</ul>
		{selected && broker ? <section className="df-editor" aria-label={`Comment on issue #${selected.id}`}>
			<h3>GitHub comment · issue #{selected.id}</h3>
			<p>This adds a discussion comment. It does not grant Planning approval or bypass runtime gates.</p>
			<label htmlFor="df-comment">Comment</label>
			<textarea id="df-comment" rows={4} value={comment} onChange={(event) => setComment(event.target.value)} />
			<div className="df-actions">
				<button type="button" onClick={() => void submit()} disabled={writeState === "pending" || !comment.trim()}>Submit & verify</button>
				<button type="button" onClick={() => setSelected(null)} disabled={writeState === "pending"}>Cancel</button>
			</div>
			{writeState !== "idle" ? <p role={writeState === "error" ? "alert" : "status"}>
				{writeState === "pending" ? "Submitting; success requires authoritative GitHub readback…" : writeDetail}
			</p> : null}
		</section> : null}
	</>;
}
function IssueReferences({ body, repository }: { body: string; repository?: string }) {
	const matches = [...body.matchAll(/(?:^|\s)#(\d{1,7})\b/gu)].map((match) => Number(match[1]));
	const unique = [...new Set(matches)].slice(0, 20);
	if (!unique.length || !repository) return null;
	const slug = (() => {
		try { const u = repository.split("/"); return u.length === 2 && u.every((s) => /^[\w.-]+$/u.test(s)) ? repository : ""; }
		catch { return ""; }
	})();
	return slug ? <p className="df-references">Body references (not verified dependencies): {unique.map((number, index) =>
		<span key={number}>{index ? ", " : ""}<a href={`https://github.com/${slug}/issues/${number}`}>#{number}</a></span>)}</p> : null;
}
function RepositoryView({ data }: { data: OperatorRepository }) {
	return <div className="df-summary">
		<div className="df-stat"><span>Repository</span><strong>{data.fullName}</strong></div>
		<div className="df-stat"><span>Default branch</span><strong>{data.defaultBranch}</strong></div>
		<div className="df-stat"><span>Open issues + PRs reported by GitHub</span><strong>{data.openIssues}</strong></div>
		<div className="df-stat"><span>Visibility</span><strong>{data.private ? "Private" : "Public"}</strong></div>
		<p>{data.description || "No repository description supplied."}</p>
		<p>Repository last updated: <time dateTime={data.updatedAt}>{readableTime(data.updatedAt)}</time></p>
		<p>{safeGitHubLink(data.url) ? <a href={data.url} target="_blank" rel="noopener noreferrer">Open repository on GitHub</a> : null}</p>
	</div>;
}
function ConfigurationView({ data }: { data: OperatorConfig }) {
	return <>
		<p>Source: <a href={safeGitHubLink(data.url) ?? "#configuration"}>repo.dfconfig at GitHub</a>.
			Revision <code>{data.sha}</code>. This is a read-only source snapshot.</p>
		<pre className="df-config"><code>{data.content}</code></pre>
	</>;
}
export interface OperatorViewProps {
	resource: OperatorResource; title: string; description: string;
	source?: OperatorReadSource; repository?: string; auth?: AuthState;
	quota?: QuotaDashboardState; docsPage?: string;
}
const EXPLICIT_LIMITATIONS: Partial<Record<OperatorResource, string>> = {
	approvals: "Labels do not prove approved Planning. Authorized decisions must be verified by the governed runtime and broker.",
	epics: "Issue references are not authoritative dependency edges. Projects/sub-issue GraphQL integration is pending.",
	checks: "Observed check-run statuses do not establish required-branch-protection acceptance.",
	graph: "This view cannot report real graph execution without a durable runtime read interface; GitHub Actions is not a substitute.",
	runs: "These are GitHub Actions runs. Durable DarkFactory graph checkpoints and transitions are a separate runtime contract.",
	recovery: "Blocked issue labels do not prove a recoverable graph checkpoint. Runtime recovery readback is pending.",
	projects: "Projects v2 cannot be read anonymously: brokered GraphQL and stable project IDs are required.",
	capabilities: "Capability inventory must come from a verified installed receipt or generated capability graph.",
	audit: "GitHub issue events are evidence, not a complete append-only DarkFactory effect journal.",
};
export const OperatorView: FC<OperatorViewProps> = ({ resource, title, description, source, repository, auth, quota, docsPage }) => {
	const { state, retry } = useLiveResource(resource === "quota" ? undefined : source, resource);
	if (resource === "quota") {
		return <section className="df-section"><div className="df-heading"><h2>{title}</h2><p>{description}</p></div>
			<QuotaDashboardView state={quota ?? { status: "disconnected" }} /></section>;
	}
	const data = state.status === "live" ? state.data : undefined;
	const isRepo = data && "fullName" in data;
	const isConfig = data && "content" in data;
	const collection = data && "items" in data ? data : undefined;
	const docs = resource === "docs" && docsPage && collection ?
		collection.items.find((item) => String(item.id) === docsPage) : undefined;
	return <section className="df-section" aria-labelledby="df-section-title">
		<div className="df-heading"><h2 id="df-section-title">{docs ? docs.title : title}</h2><p>{description}</p></div>
		{EXPLICIT_LIMITATIONS[resource] ? <div className="df-caveat" role="note">{EXPLICIT_LIMITATIONS[resource]}</div> : null}
		<div className="df-toolbar">
			<span className="df-meta">{state.status === "live"
				? <>Live GitHub read · <time dateTime={new Date(state.fetchedAt).toISOString()}>{readableTime(new Date(state.fetchedAt).toISOString())}</time>
					{state.limited ? " · capped result" : ""}</> : "Not currently synchronized"}</span>
			<button type="button" onClick={retry}>Refresh</button>
		</div>
		<StateNotice state={state} onRetry={retry} />
		{isRepo ? <RepositoryView data={data} /> : null}
		{isConfig ? <ConfigurationView data={data} /> : null}
		{docs ? <div className="df-document">
			<a href="#/docs">← All documentation</a>
			<pre className="df-markdown">{docs.body}</pre>
		</div> : collection ? <ItemList data={collection} resource={resource} auth={auth} source={source} repository={repository} /> : null}
	</section>;
};
