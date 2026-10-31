import { GitHubError, type GitHubErrorKind, redact } from "./errors.ts";
import { FetchTransport, type GitHubFetch } from "./transport.ts";
import type { GraphQLConnection, RateLimitSnapshot } from "./types.ts";

type TokenSource = string | (() => string | Promise<string>);
type Sleep = (milliseconds: number) => Promise<void>;
interface CacheEntry {
	etag: string;
	value: unknown;
}

/**
 * Configuration options for {@link GitHubClient}.
 *
 * @property token - Token source; a static token string or a function returning a token.
 * @property fetch - Optional fetch implementation; defaults to global fetch.
 * @property apiBase - Base URL for the GitHub REST API; defaults to "https://api.github.com".
 * @property graphqlUrl - URL for GraphQL endpoint; defaults to `${apiBase}/graphql`.
 * @property timeoutMs - Optional request timeout in milliseconds.
 * @property maxRetries - Maximum number of retry attempts for transient failures.
 * @property random - Function returning a random number for jitter calculation.
 * @property sleep - Async sleep function; defaults to Bun.sleep.
 * @property userAgent - User‑Agent string sent with requests.
 * @property onAuthenticationFailure - Callback invoked when authentication errors are encountered.
 */
interface GitHubClientOptions {
	token: TokenSource;
	fetch?: GitHubFetch;
	apiBase?: string;
	graphqlUrl?: string;
	timeoutMs?: number;
	maxRetries?: number;
	random?: () => number;
	sleep?: Sleep;
	userAgent?: string;
	onAuthenticationFailure?: () => void;
}

/**
 * Client for interacting with the GitHub REST and GraphQL APIs.
 *
 * Handles authentication, rate‑limit tracking, request caching, and automatic retries.
 */
export class GitHubClient {
	readonly #token: TokenSource;
	readonly #transport: FetchTransport;
	readonly #apiBase: string;
	readonly #graphqlUrl: string;
	readonly #maxRetries: number;
	readonly #random: () => number;
	readonly #sleep: Sleep;
	readonly #userAgent: string;
	readonly #onAuthenticationFailure?: () => void;
	readonly #cache = new Map<string, CacheEntry>();
	#cacheToken?: string;
	rateLimit?: RateLimitSnapshot;

	constructor(options: GitHubClientOptions) {
		if (typeof options.token === "string" && options.token.length === 0) throw new Error("GitHub token is required");
		this.#token = options.token;
		this.#transport = new FetchTransport({ fetch: options.fetch, timeoutMs: options.timeoutMs });
		this.#apiBase = (options.apiBase ?? "https://api.github.com").replace(/\/$/, "");
		this.#graphqlUrl = options.graphqlUrl ?? `${this.#apiBase}/graphql`;
		// The credential is scoped to one GitHub API origin. Do not let caller-supplied
		// absolute REST URLs or a configured GraphQL endpoint exfiltrate it.
		this.#assertTrustedUrl(this.#apiBase);
		this.#assertTrustedUrl(this.#graphqlUrl);
		this.#maxRetries = options.maxRetries ?? 3;
		this.#random = options.random ?? Math.random;
		this.#sleep = options.sleep ?? ((ms) => Bun.sleep(ms));
		this.#userAgent = options.userAgent ?? "darkfactory-df/0.0";
		this.#onAuthenticationFailure = options.onAuthenticationFailure;
	}

	async rest<T>(
		method: string,
		path: string,
		body?: unknown,
		accept = "application/vnd.github+json",
		options: { apiVersion?: string } = {},
	): Promise<T> {
		const url =
			path.startsWith("http://") || path.startsWith("https://")
				? path
				: `${this.#apiBase}${path.startsWith("/") ? "" : "/"}${path}`;
		return (await this.#request<T>(method.toUpperCase(), url, body, true, accept, options.apiVersion)).value;
	}

	async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
		const response = await this.#request<{ data?: T; errors?: Array<{ message?: string }> }>(
			"POST",
			this.#graphqlUrl,
			{ query, variables },
			false,
		);
		if (response.value.errors?.length || response.value.data === undefined) {
			throw new GitHubError({
				kind: "graphql",
				message: redact(
					response.value.errors?.map((e) => e.message ?? "unknown GraphQL error").join("; ") ?? "missing GraphQL data",
					[await this.#getToken()],
				),
				method: "POST",
				path: "/graphql",
				status: response.status,
				requestId: response.requestId,
			});
		}
		this.#readGraphQLRate(response.value.data);
		return response.value.data;
	}

	/**
	 * Collects every item across a paginated REST collection.
	 *
	 * @param path First page, relative or absolute.
	 * @param limit Maximum items to return.
	 * @param select Extracts the item array from a page. Needed for the endpoints that wrap their
	 *   list in an object - `GET /installation/repositories` answers `{total_count, repositories}` -
	 *   because pagination lives in the `Link` header rather than the body, so an enveloped endpoint
	 *   cannot be paged by walking the body the way a bare array can.
	 * @returns Items across every page, in order.
	 */
	async collectRest<T>(path: string, limit = 10_000, select?: (page: unknown) => unknown[] | undefined): Promise<T[]> {
		const items: T[] = [];
		const seen = new Set<string>();
		let next: string | undefined = path;
		while (next && items.length < limit) {
			const url = next.startsWith("http") ? next : `${this.#apiBase}${next.startsWith("/") ? "" : "/"}${next}`;
			if (seen.has(url)) throw this.#protocol("GET", url, "REST pagination loop");
			seen.add(url);
			const response = await this.#request<unknown>("GET", url, undefined, true);
			const page = select ? select(response.value) : response.value;
			if (!Array.isArray(page)) throw this.#protocol("GET", url, "expected an array page");
			items.push(...(page as T[]).slice(0, limit - items.length));
			next = parseNextLink(response.headers.get("link"));
		}
		return items;
	}

	async collectGraphQL<T>(
		query: string,
		variables: Record<string, unknown>,
		connection: (data: unknown) => GraphQLConnection<T>,
		limit = 10_000,
	): Promise<T[]> {
		const nodes: T[] = [];
		const cursors = new Set<string>();
		let cursor: string | null = null;
		while (nodes.length < limit) {
			const data: unknown = await this.graphql<unknown>(query, { ...variables, cursor });
			const page = connection(data);
			if (!page || !Array.isArray(page.nodes) || !page.pageInfo || typeof page.pageInfo.hasNextPage !== "boolean")
				throw this.#protocol("POST", "/graphql", "missing GraphQL connection pageInfo");
			nodes.push(...page.nodes.slice(0, limit - nodes.length));
			if (!page.pageInfo.hasNextPage) break;
			const next = page.pageInfo.endCursor;
			if (!next || cursors.has(next)) throw this.#protocol("POST", "/graphql", "missing or repeated GraphQL cursor");
			cursors.add(next);
			cursor = next;
		}
		return nodes;
	}

	invalidate(pathPrefix = ""): void {
		for (const key of this.#cache.keys()) if (!pathPrefix || key.includes(pathPrefix)) this.#cache.delete(key);
	}

	async #request<T>(
		method: string,
		url: string,
		body: unknown,
		useEtag: boolean,
		accept = "application/vnd.github+json",
		apiVersion = "2022-11-28",
	): Promise<{ value: T; headers: Headers; status: number; requestId?: string }> {
		if (!/^\d{4}-\d{2}-\d{2}$/u.test(apiVersion)) throw this.#protocol(method, url, "invalid API version");
		this.#assertTrustedUrl(url);
		const token = await this.#getToken();
		// An App token source can rotate or switch installation/account. A 304
		// must never hydrate a different principal's ETag-cached response.
		if (this.#cacheToken !== token) {
			this.#cache.clear();
			this.#cacheToken = token;
		}
		const cacheKey = `${url}|${accept}`;
		const cached = method === "GET" && useEtag ? this.#cache.get(cacheKey) : undefined;
		let currentUrl = url;
		let redirects = 0;
		// A timed-out mutation may already have committed. Retrying it could duplicate a
		// comment, review, issue, dispatch or merge. Only read requests are replayable.
		const replayable = method === "GET" || method === "HEAD";
		for (let attempt = 0; ; attempt++) {
			const headers = new Headers({
				Accept: accept,
				Authorization: `Bearer ${token}`,
				"X-GitHub-Api-Version": apiVersion,
				"User-Agent": this.#userAgent,
			});
			if (body !== undefined) headers.set("Content-Type", "application/json");
			if (cached) headers.set("If-None-Match", cached.etag);
			let response: Response;
			try {
				response = await this.#transport.request(currentUrl, {
					method,
					headers,
					body: body === undefined ? undefined : JSON.stringify(body),
					// Never delegate bearer-token redirects to the default fetch policy.
					// Inspect every hop before issuing another credentialed request.
					redirect: "manual",
				});
			} catch (cause) {
				if (replayable && attempt < this.#maxRetries) {
					await this.#sleep(this.#jitter(attempt));
					continue;
				}
				throw new GitHubError({
					kind: "transport",
					message: redact(cause instanceof Error ? cause.message : String(cause), [token]),
					method,
					path: safePath(url),
				});
			}
			if ([301, 302, 303, 307, 308].includes(response.status)) {
				const location = response.headers.get("location");
				if (!location || redirects >= 5)
					throw this.#protocol(method, currentUrl, "missing or excessive GitHub API redirect");
				if (method !== "GET" && method !== "HEAD" && response.status !== 307 && response.status !== 308)
					throw this.#protocol(method, currentUrl, "unsafe GitHub API method redirect");
				let destination: string;
				try {
					destination = new URL(location, currentUrl).href;
				} catch {
					throw this.#protocol(method, currentUrl, "invalid GitHub API redirect");
				}
				this.#assertTrustedUrl(destination);
				currentUrl = destination;
				redirects += 1;
				continue;
			}
			const requestId = response.headers.get("x-github-request-id") ?? undefined;
			this.#readRestRate(response.headers);
			if (response.status === 304) {
				if (!cached) throw this.#protocol(method, currentUrl, "unexpected 304 without a matching ETag cache entry");
				return { value: cached.value as T, headers: response.headers, status: 304, requestId };
			}
			const raw = await response.text();
			const value = raw ? (accept.includes("json") ? safeJson(raw) : raw) : undefined;
			if (response.ok) {
				const etag = response.headers.get("etag");
				if (method === "GET" && useEtag && etag && this.#cacheToken === token)
					this.#cache.set(cacheKey, { etag, value });
				if (method !== "GET") this.invalidate();
				return { value: value as T, headers: response.headers, status: response.status, requestId };
			}
			const classification = classify(response, value);
			if (response.status === 401 || response.status === 403) this.#onAuthenticationFailure?.();
			if (replayable && attempt < this.#maxRetries && classification.retryable) {
				await this.#sleep(classification.delayMs ?? this.#jitter(attempt));
				continue;
			}
			const remoteMessage =
				value && typeof value === "object" && "message" in value
					? String((value as { message: unknown }).message)
					: `GitHub returned HTTP ${response.status}`;
			throw new GitHubError({
				kind: classification.kind,
				message: redact(remoteMessage, [token]),
				method,
				path: safePath(url),
				status: response.status,
				requestId,
				retryAt: classification.retryAt,
			});
		}
	}

	#assertTrustedUrl(value: string): void {
		let actual: URL;
		let expected: URL;
		try {
			actual = new URL(value);
			expected = new URL(this.#apiBase);
		} catch {
			throw this.#protocol("GET", value, "invalid GitHub API URL");
		}
		if (
			actual.origin !== expected.origin ||
			!["https:", "http:"].includes(actual.protocol) ||
			actual.username ||
			actual.password
		) {
			throw this.#protocol("GET", value, "GitHub API URL is outside the configured credential origin");
		}
	}

	#jitter(attempt: number): number {
		return Math.floor(this.#random() * Math.min(30_000, 500 * 2 ** attempt));
	}
	async #getToken(): Promise<string> {
		const token = typeof this.#token === "function" ? await this.#token() : this.#token;
		if (!token) throw new Error("GitHub token is required");
		return token;
	}
	#protocol(method: string, path: string, message: string): GitHubError {
		return new GitHubError({ kind: "protocol", message, method, path: safePath(path) });
	}
	#readRestRate(headers: Headers): void {
		const remaining = numberHeader(headers, "x-ratelimit-remaining");
		const reset = numberHeader(headers, "x-ratelimit-reset");
		if (remaining !== undefined && reset !== undefined)
			this.rateLimit = {
				resource: headers.get("x-ratelimit-resource") ?? "core",
				limit: numberHeader(headers, "x-ratelimit-limit"),
				remaining,
				resetAt: new Date(reset * 1000),
			};
	}
	#readGraphQLRate(data: unknown): void {
		if (!data || typeof data !== "object" || !("rateLimit" in data)) return;
		const rate = (data as any).rateLimit;
		if (rate && typeof rate.remaining === "number" && typeof rate.resetAt === "string")
			this.rateLimit = {
				resource: "graphql",
				remaining: rate.remaining,
				resetAt: new Date(rate.resetAt),
				cost: typeof rate.cost === "number" ? rate.cost : undefined,
			};
	}
}

function safeJson(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}
function safePath(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}
function numberHeader(headers: Headers, name: string): number | undefined {
	const raw = headers.get(name);
	if (raw === null) return undefined;
	const value = Number(raw);
	return Number.isFinite(value) ? value : undefined;
}
function parseNextLink(link: string | null): string | undefined {
	if (!link) return undefined;
	for (const part of link.split(",")) {
		const match = part.match(/^\s*<([^>]+)>\s*;\s*rel="?([^";]+)"?/);
		if (match?.[2] === "next") return match[1];
	}
	return undefined;
}
function classify(
	response: Response,
	value: unknown,
): { kind: GitHubErrorKind; retryable: boolean; delayMs?: number; retryAt?: Date } {
	const message =
		value && typeof value === "object" && "message" in value ? String((value as any).message).toLowerCase() : "";
	const remaining = numberHeader(response.headers, "x-ratelimit-remaining");
	const retryAfter = retryAfterMilliseconds(response.headers.get("retry-after"));
	if (
		(response.status === 403 || response.status === 429) &&
		(retryAfter !== undefined || message.includes("secondary rate limit") || message.includes("abuse detection"))
	)
		return {
			kind: "secondary-rate-limit",
			retryable: true,
			delayMs: retryAfter,
		};
	if ((response.status === 403 || response.status === 429) && remaining === 0) {
		const reset = numberHeader(response.headers, "x-ratelimit-reset");
		return {
			kind: "primary-rate-limit",
			retryable: false,
			retryAt: reset === undefined ? undefined : new Date(reset * 1000),
		};
	}
	if (response.status >= 500) return { kind: "transport", retryable: true };
	if (response.status === 401) return { kind: "authentication", retryable: false };
	if (response.status === 403) return { kind: "permission", retryable: false };
	if (response.status === 404) return { kind: "not-found", retryable: false };
	if (response.status === 409 || response.status === 422) return { kind: "validation", retryable: false };
	return { kind: "protocol", retryable: false };
}

/** Retry-After permits seconds or an HTTP-date; neither permits a negative wait. */
function retryAfterMilliseconds(header: string | null): number | undefined {
	if (!header) return undefined;
	const seconds = Number(header);
	if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
	const when = Date.parse(header);
	return Number.isFinite(when) ? Math.max(0, when - Date.now()) : undefined;
}
