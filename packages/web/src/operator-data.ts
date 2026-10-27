/** GitHub is the durable control plane; this module never accepts or persists GitHub tokens. */
export type OperatorResource =
	| "repository" | "requests" | "planning" | "approvals" | "epics" | "pulls"
	| "checks" | "runs" | "graph" | "recovery" | "projects" | "capabilities"
	| "configuration" | "releases" | "audit" | "docs" | "quota";

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
	fullName: string; description?: string; defaultBranch: string; private: boolean;
	url: string; openIssues: number; updatedAt: string; permissions?: { admin: boolean; push: boolean; pull: boolean };
}
export interface OperatorConfig { content: string; path: string; sha: string; url: string }
export type OperatorResourceData = OperatorCollection | OperatorRepository | OperatorConfig;
export interface OperatorReadSource {
	read(resource: OperatorResource, signal?: AbortSignal): Promise<ResourceState<OperatorResourceData>>;
	issueComments?(number: number, signal?: AbortSignal): Promise<OperatorCollection>;
}

export function repositoryIdentity(input: string): RepositoryIdentity {
	if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/u.test(input) || input.includes("..")) {
		throw new Error("Expected an owner/repository slug");
	}
	const [owner, name] = input.split("/") as [string, string];
	return { owner, name, slug: input };
}
function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function str(value: unknown): string { return typeof value === "string" ? value : ""; }
function num(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function labels(value: unknown): string[] {
	return array(value).map((x) => typeof x === "string" ? x : str(record(x).name)).filter(Boolean);
}
function page(value: unknown, limit: number, item: (x: unknown) => OperatorItem): OperatorCollection {
	const entries = array(value);
	return { items: entries.slice(0, limit).map(item), limit, note: entries.length >= limit ? `Showing first ${limit}; additional pages not loaded.` : undefined };
}
function issue(value: unknown): OperatorItem {
	const x = record(value);
	return {
		id: num(x.number), title: str(x.title), url: str(x.html_url),
		state: str(x.state), updatedAt: str(x.updated_at), body: str(x.body),
		labels: labels(x.labels), subtitle: str(record(x.user).login),
	};
}
function pull(value: unknown): OperatorItem {
	const x = record(value);
	return {
		...issue(value), state: x.merged_at ? "merged" : x.draft ? "draft" : str(x.state),
		head: str(record(x.head).ref), base: str(record(x.base).ref),
		sha: str(record(x.head).sha),
	};
}
function run(value: unknown): OperatorItem {
	const x = record(value);
	return {
		id: num(x.id), title: str(x.name) || str(x.display_title) || "Workflow",
		url: str(x.html_url), state: str(x.conclusion) || str(x.status),
		updatedAt: str(x.updated_at), subtitle: `#${num(x.run_number)} · ${str(x.event)}`,
		head: str(x.head_branch), sha: str(x.head_sha),
	};
}
function release(value: unknown): OperatorItem {
	const x = record(value);
	return {
		id: num(x.id), title: str(x.name) || str(x.tag_name), url: str(x.html_url),
		state: x.draft ? "draft" : x.prerelease ? "prerelease" : "published",
		updatedAt: str(x.published_at), subtitle: `${str(x.tag_name)} · ${array(x.assets).length} assets`,
		body: array(x.assets).map((a) => {
			const asset = record(a);
			return `${str(asset.name)} (${num(asset.size)} bytes)`;
		}).join("\n"),
	};
}
function event(value: unknown): OperatorItem {
	const x = record(value);
	return {
		id: num(x.id), title: str(x.event) || "Repository issue event",
		url: str(x.url).replace("https://api.github.com/repos/", "https://github.com/").replace("/issues/events/", "/issues/"),
		subtitle: str(record(x.actor).login), updatedAt: str(x.created_at),
	};
}
export class OperatorHttpError extends Error {
	constructor(public readonly status: number, public readonly retryAt?: string) {
		super(status === 401 ? "Sign in required" : status === 403 ? "GitHub permission or rate limit denied" :
			status === 429 ? "GitHub rate limit exceeded" : `GitHub request failed (HTTP ${status})`);
	}
}
export function classifyReadFailure(error: unknown): ResourceState<never> {
	if (error instanceof OperatorHttpError) {
		if (error.status === 401) return { status: "unauthorized", detail: error.message };
		if (error.status === 403 && !error.retryAt)
			return { status: "unauthorized", detail: "GitHub denied access to this resource." };
		if (error.status === 403 || error.status === 429)
			return { status: "rate-limited", detail: error.message, ...(error.retryAt ? { retryAt: error.retryAt } : {}) };
		if (error.status === 404) return { status: "blocked", detail: "Resource not found or not visible with current permissions." };
		return { status: "failed", detail: error.message };
	}
	return { status: "failed", detail: error instanceof Error && error.name === "AbortError" ? "Request cancelled" : "GitHub is unreachable." };
}
export interface PublicSourceOptions {
	fetch?: typeof globalThis.fetch;
	/** Optional trusted same-origin or explicit configured broker read transport. No tokens in browser. */
	readThroughBroker?: (path: string, signal?: AbortSignal) => Promise<unknown>;
	/** Repository-specific compiled DocsContentGraph asset, produced by the existing docs compiler. */
	docsContentUrl?: string;
}
/**
 * Reads public GitHub REST endpoints anonymously, or delegates reads to a caller-supplied
 * opaque-session broker for private repositories. There is no secret-bearing GitHubClient in Web.
 */
export function createGitHubOperatorSource(slug: string, options: PublicSourceOptions = {}): OperatorReadSource {
	const repo = repositoryIdentity(slug);
	const base = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
	const fetcher = options.fetch ?? globalThis.fetch;
	const limit = 50;
	async function get(path: string, signal?: AbortSignal): Promise<unknown> {
		if (!path.startsWith(base + "/") && path !== base) throw new Error("Cross-repository read denied");
		if (options.readThroughBroker) return options.readThroughBroker(path, signal);
		const response = await fetcher(`https://api.github.com${path}`, {
			method: "GET", signal, headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
			redirect: "error", cache: "no-store",
		});
		if (!response.ok) {
			const reset = response.headers.get("x-ratelimit-reset");
			const retryAt = reset && /^\d+$/u.test(reset) ? new Date(Number(reset) * 1000).toISOString() : undefined;
			throw new OperatorHttpError(response.status, retryAt);
		}
		return response.json() as Promise<unknown>;
	}
	async function docs(signal?: AbortSignal): Promise<OperatorCollection> {
		if (!options.docsContentUrl) throw new Error("Compiled documentation asset not configured");
		const target = new URL(options.docsContentUrl, typeof location === "undefined" ? "https://example.invalid" : location.href);
		// Public documentation can be loaded only from this static deployment origin.
		if (typeof location !== "undefined" && target.origin !== location.origin) throw new Error("Cross-origin documentation denied");
		const result = await fetcher(target.href, { signal, cache: "no-store" });
		if (!result.ok) throw new OperatorHttpError(result.status);
		const graph = record(await result.json());
		if (graph.version !== 1 || !Array.isArray(graph.pages)) throw new Error("Unsupported documentation graph");
		return page(graph.pages, 200, (value) => {
			const x = record(value), id = str(x.id);
			return { id, title: str(x.title), url: `#docs/${encodeURIComponent(id)}`, subtitle: str(x.kind), body: str(x.markdown) };
		});
	}
	async function readRaw(resource: OperatorResource, signal?: AbortSignal): Promise<OperatorResourceData> {
		switch(resource) {
			case "repository": {
				const x = record(await get(base, signal));
				return {
					fullName: str(x.full_name), description: str(x.description), defaultBranch: str(x.default_branch),
					private: x.private === true, url: str(x.html_url), openIssues: num(x.open_issues_count),
					updatedAt: str(x.updated_at),
					...(x.permissions ? { permissions: {
						admin: record(x.permissions).admin === true, push: record(x.permissions).push === true,
						pull: record(x.permissions).pull === true,
					} } : {}),
				};
			}
			case "requests": case "planning": case "approvals": case "epics": case "recovery": {
				// GitHub issues API mixes PRs into its response; never report them as requests.
				const list = array(await get(`${base}/issues?state=all&sort=updated&direction=desc&per_page=${limit}`, signal))
					.filter((x) => !record(x).pull_request);
				const relevant = list.filter((x) => {
					const names = labels(record(x).labels).map((s) => s.toLowerCase());
					if (resource === "requests") return names.includes("request");
					if (resource === "planning") return names.some((n) => n.includes("planning") || n === "in progress");
					if (resource === "approvals") return names.some((n) => n.includes("approv") || n === "blocked");
					if (resource === "epics") return names.some((n) => n.includes("epic") || n.includes("parent"));
					return names.some((n) => n === "blocked" || n.includes("recover"));
				});
				const collection = page(relevant, limit, issue);
				collection.note = "Filtered from the 50 most recently updated issues; labels are discovery hints, not authoritative workflow approvals.";
				return collection;
			}
			case "pulls": return page(await get(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=${limit}`, signal), limit, pull);
			case "checks": case "runs": {
				const x = record(await get(`${base}/actions/runs?per_page=${limit}`, signal));
				return page(x.workflow_runs, limit, run);
			}
			case "releases": return page(await get(`${base}/releases?per_page=${limit}`, signal), limit, release);
			case "audit": return page(await get(`${base}/issues/events?per_page=${limit}`, signal), limit, event);
			case "configuration": {
				const x = record(await get(`${base}/contents/repo.dfconfig`, signal));
				if (str(x.encoding) !== "base64") throw new Error("Configuration encoding unsupported");
				const encoded = str(x.content).replace(/\s/gu, "");
				// UTF-8 decoded explicitly; configuration is displayed as text, never evaluated.
				const decoded = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
				return { path: "repo.dfconfig", sha: str(x.sha), url: str(x.html_url), content: new TextDecoder().decode(decoded) };
			}
			case "docs": return docs(signal);
			case "graph": throw new Error("Durable graph run state requires the DF-02 runtime read contract.");
			case "projects": throw new Error("Projects v2 needs authorized GraphQL through the confidential broker.");
			case "capabilities": throw new Error("Capability inventory needs an authoritative installed receipt or compiled docs graph.");
			case "quota": throw new Error("Quota is private runtime state; a redacted authenticated snapshot is required.");
		}
	}
	return {
		async read(resource, signal) {
			if (["graph", "projects", "capabilities", "quota"].includes(resource)) {
				return { status: "blocked", detail: resource === "projects" ?
					"Projects v2 requires the authenticated GraphQL broker (not available in public REST)." :
					resource === "graph" ? "Durable DarkFactory graph state is not exposed by an authenticated read contract." :
					resource === "quota" ? "Redacted quota snapshot requires a connected runtime." :
					"Verified installed-capability receipt or generated graph required." };
			}
			try {
				const data = await readRaw(resource, signal);
				return { status: "live", data, fetchedAt: Date.now(), limited: "items" in data && Boolean(data.note) };
			} catch (error) {
				if (resource === "docs" && !options.docsContentUrl) return { status: "blocked", detail: "Compiled content.json URL not configured." };
				return classifyReadFailure(error);
			}
		},
		async issueComments(number, signal) {
			if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid issue number");
			return page(await get(`${base}/issues/${number}/comments?per_page=${limit}`, signal), limit, (x) => {
				const c = record(x); return {
					id: num(c.id), title: str(c.body), body: str(c.body),
					url: str(c.html_url), subtitle: str(record(c.user).login), updatedAt: str(c.updated_at),
				};
			});
		},
	};
}
