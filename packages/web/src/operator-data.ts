/** Tokenless public GitHub reads. Privileged/private reads must come from a separately authorized broker. */
import { repositoryIdentity as parseRepository } from "./site-contract.ts";

export type OperatorResource =
	| "repository" | "requests" | "planning" | "approvals" | "epics" | "pulls" | "checks"
	| "runs" | "graph" | "recovery" | "projects" | "capabilities" | "configuration"
	| "releases" | "audit" | "docs" | "quota";
export type ResourceState<T> =
	| { status: "idle" | "loading" }
	| { status: "live"; data: T; fetchedAt: number; limited: boolean }
	| { status: "unauthorized" | "rate-limited" | "blocked" | "failed"; detail: string; retryAt?: string };
export interface RepositoryIdentity { owner: string; name: string; slug: string }
export interface OperatorItem {
	id: number | string;
	title: string;
	url: string;
	subtitle?: string;
	state?: string;
	labels?: string[];
	updatedAt?: string;
	body?: string;
	head?: string;
	base?: string;
	sha?: string;
}
export interface OperatorCollection { items: OperatorItem[]; limit: number; note?: string }
export interface OperatorRepository {
	fullName: string;
	description?: string;
	defaultBranch: string;
	private: boolean;
	url: string;
	openIssues: number;
	updatedAt: string;
	permissions?: { admin: boolean; push: boolean; pull: boolean };
}
export interface OperatorConfig { content: string; path: string; sha: string; url: string }
export type OperatorResourceData = OperatorCollection | OperatorRepository | OperatorConfig;
export interface OperatorReadSource {
	read(resource: OperatorResource, signal?: AbortSignal): Promise<ResourceState<OperatorResourceData>>;
	issueComments(issue: number, signal?: AbortSignal): Promise<OperatorCollection>;
}
export interface OperatorSourceOptions {
	fetch?: typeof fetch;
	/** Must enforce user session, repository installation scope and read permissions server-side. */
	authorizedRead?: (path: string, signal?: AbortSignal) => Promise<unknown>;
}
export class OperatorHttpError extends Error {
	constructor(
		readonly status: number,
		readonly retryAt?: string,
	) { super(`GitHub returned HTTP ${status}`); }
}
export const repositoryIdentity = parseRepository;
export function classifyReadFailure(error: unknown): ResourceState<never> {
	if (error instanceof OperatorHttpError) {
		if (error.status === 401) return { status: "unauthorized", detail: "Authentication required" };
		if (error.status === 429 || error.status === 403 && error.retryAt) return {
			status: "rate-limited", detail: "GitHub API rate limit reached",
			...(error.retryAt ? { retryAt: error.retryAt } : {}),
		};
		if (error.status === 403 || error.status === 404)
			return { status: "blocked", detail: "Resource is unavailable or access is denied" };
		return { status: "failed", detail: `GitHub request failed (HTTP ${error.status})` };
	}
	return { status: "failed", detail: "The request could not be completed" };
}
function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function str(value: unknown): string { return typeof value === "string" ? value : ""; }
function num(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function item(value: unknown): OperatorItem {
	const r = record(value);
	const number = typeof r.number === "number" ? r.number : (typeof r.id === "number" ? r.id : str(r.sha));
	const labels = array(r.labels).map(x => str(record(x).name)).filter(Boolean);
	const title = str(r.title) || str(r.name) || str(r.message) || str(r.sha) || String(number);
	const url = str(r.html_url);
	const pull = record(r.pull_request);
	return {
		id: number, title, url,
		...(str(r.state) || str(r.status) ? { state: str(r.state) || str(r.status) } : {}),
		...(str(r.updated_at) ? { updatedAt: str(r.updated_at) } : {}),
		...(str(r.body) ? { body: str(r.body) } : {}),
		...(labels.length ? { labels } : {}),
		...(str(record(r.user).login) ? { subtitle: str(record(r.user).login) } : {}),
		...(str(record(r.head).sha) ? { head: str(record(r.head).sha) } : {}),
		...(str(record(r.base).sha) ? { base: str(record(r.base).sha) } : {}),
		...(str(pull.html_url) && !url ? { url: str(pull.html_url) } : {}),
	};
}
const PAGE = 50;
function collection(rows: unknown, note?: string): OperatorCollection {
	const values = array(rows);
	return { items: values.map(item), limit: PAGE, ...(note ? { note } : {}) };
}
/** Browser reader never adds Authorization headers, cookies, or GitHub tokens. */
export function createGitHubOperatorSource(repository: string, options: OperatorSourceOptions = {}): OperatorReadSource {
	const { owner, name } = repositoryIdentity(repository);
	const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
	const get = options.fetch ?? fetch;
	async function request(path: string, signal?: AbortSignal): Promise<unknown> {
		if (!path.startsWith("/") || path.includes("..") || /[\r\n]/u.test(path))
			throw new Error("Unsafe repository request");
		if (options.authorizedRead) return options.authorizedRead(path, signal);
		const response = await get(`${base}${path}`, {
			method: "GET", signal, credentials: "omit", redirect: "error",
			headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
		});
		if (!response.ok) {
			const remaining = response.headers.get("x-ratelimit-remaining");
			const reset = response.headers.get("x-ratelimit-reset");
			const retryAt = response.status === 429 || (response.status === 403 && remaining === "0")
				? reset && /^\d+$/u.test(reset) ? new Date(Number(reset) * 1000).toISOString() : "retry-later"
				: undefined;
			throw new OperatorHttpError(response.status, retryAt);
		}
		return response.json() as Promise<unknown>;
	}
	async function read(resource: OperatorResource, signal?: AbortSignal): Promise<ResourceState<OperatorResourceData>> {
		if (resource === "quota" || resource === "graph" || resource === "recovery" || resource === "projects")
			return { status: "blocked", detail: "No verified runtime/broker read contract for this resource" };
		if (resource === "docs")
			return { status: "blocked", detail: "Documentation is served from the verified static /docs/ route" };
		try {
			if (resource === "repository") {
				const data = record(await request("/", signal));
				const repositoryData: OperatorRepository = {
					fullName: str(data.full_name), description: str(data.description),
					defaultBranch: str(data.default_branch), private: data.private === true,
					url: str(data.html_url), openIssues: num(data.open_issues_count), updatedAt: str(data.updated_at),
				};
				return { status: "live", data: repositoryData, fetchedAt: Date.now(), limited: false };
			}
			if (resource === "configuration") {
				const data = record(await request("/contents/repo.dfconfig", signal));
				if (data.encoding !== "base64" || typeof data.content !== "string")
					return { status: "blocked", detail: "Canonical configuration is not available in GitHub Contents" };
				// GitHub Contents API returns base64 with line breaks; convert UTF-8 without eval.
				const bytes = Uint8Array.from(atob(data.content.replace(/\s+/gu, "")), x => x.charCodeAt(0));
				const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
				return { status: "live", data: { content: decoded, path: "repo.dfconfig",
					sha: str(data.sha), url: str(data.html_url) }, fetchedAt: Date.now(), limited: false };
			}
			if (resource === "capabilities") {
				const rows = await request("/contents/.darkfactory/plugins", signal);
				const values = array(rows).filter(value => record(value).type === "dir");
				return { status: "live", data: collection(values.map(value => {
					const entry = record(value);
					return { id: str(entry.sha), title: str(entry.name), html_url: str(entry.html_url), state: "directory" };
				}), "Repository source directories; not proof of installed capability health"),
					fetchedAt: Date.now(), limited: false };
			}
			const path = resource === "pulls" ? `/pulls?state=all&per_page=${PAGE}`
				: resource === "checks" ? `/commits/HEAD/check-runs?per_page=${PAGE}`
				: resource === "runs" ? `/actions/runs?per_page=${PAGE}`
				: resource === "releases" ? `/releases?per_page=${PAGE}`
				: resource === "audit" ? `/events?per_page=${PAGE}`
				: `/issues?state=all&per_page=${PAGE}`;
			const response = await request(path, signal);
			const rows = resource === "checks" ? array(record(response).check_runs)
				: resource === "runs" ? array(record(response).workflow_runs) : array(response);
			const labels: Record<string, string> = {
				requests: "request", planning: "planning", approvals: "approval", epics: "epic",
			};
			const selected = labels[resource]
				? rows.filter(value => array(record(value).labels).some(label =>
					str(record(label).name).toLowerCase().includes(labels[resource] ?? "")))
				: resource === "requests" || resource === "planning" || resource === "approvals" || resource === "epics"
					? rows : rows;
			const note = `Latest ${PAGE} records maximum from GitHub; this is not a complete repository history`;
			return { status: "live", data: collection(selected, note), fetchedAt: Date.now(), limited: rows.length >= PAGE };
		} catch (error) {
			return classifyReadFailure(error);
		}
	}
	async function issueComments(issue: number, signal?: AbortSignal): Promise<OperatorCollection> {
		if (!Number.isSafeInteger(issue) || issue < 1) throw new Error("Invalid issue number");
		const rows = array(await request(`/issues/${issue}/comments?per_page=${PAGE}`, signal));
		return collection(rows.map(value => {
			const r = record(value);
			return { ...r, title: str(r.body), html_url: str(r.html_url), state: "published" };
		}), "First page of GitHub issue comments");
	}
	return { read, issueComments };
}
