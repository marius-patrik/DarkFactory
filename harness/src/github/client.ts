import { GitHubError, redact, type GitHubErrorKind } from "./errors.ts";
import { FetchTransport, type GitHubFetch } from "./transport.ts";
import type { GraphQLConnection, RateLimitSnapshot } from "./types.ts";

type TokenSource = string | (() => string | Promise<string>);
type Sleep = (milliseconds: number) => Promise<void>;
interface CacheEntry {
	etag: string;
	value: unknown;
}

export interface GitHubClientOptions {
	token: TokenSource;
	fetch?: GitHubFetch;
	apiBase?: string;
	graphqlUrl?: string;
	timeoutMs?: number;
	maxRetries?: number;
	random?: () => number;
	sleep?: Sleep;
	now?: () => Date;
	userAgent?: string;
	onAuthenticationFailure?: () => void;
}

export class GitHubClient {
	readonly #token: TokenSource;
	readonly #transport: FetchTransport;
	readonly #apiBase: string;
	readonly #graphqlUrl: string;
	readonly #maxRetries: number;
	readonly #random: () => number;
	readonly #sleep: Sleep;
	readonly #now: () => Date;
	readonly #userAgent: string;
	readonly #onAuthenticationFailure?: () => void;
	readonly #cache = new Map<string, CacheEntry>();
	rateLimit?: RateLimitSnapshot;

	constructor(options: GitHubClientOptions) {
		if (typeof options.token === "string" && options.token.length === 0) throw new Error("GitHub token is required");
		this.#token = options.token;
		this.#transport = new FetchTransport({ fetch: options.fetch, timeoutMs: options.timeoutMs });
		this.#apiBase = (options.apiBase ?? "https://api.github.com").replace(/\/$/, "");
		this.#graphqlUrl = options.graphqlUrl ?? `${this.#apiBase}/graphql`;
		this.#maxRetries = options.maxRetries ?? 3;
		this.#random = options.random ?? Math.random;
		this.#sleep = options.sleep ?? ((ms) => Bun.sleep(ms));
		this.#now = options.now ?? (() => new Date());
		this.#userAgent = options.userAgent ?? "darkfactory-df/0.0";
		this.#onAuthenticationFailure = options.onAuthenticationFailure;
	}

	async rest<T>(method: string, path: string, body?: unknown, accept = "application/vnd.github+json"): Promise<T> {
		const url =
			path.startsWith("http://") || path.startsWith("https://")
				? path
				: `${this.#apiBase}${path.startsWith("/") ? "" : "/"}${path}`;
		return (await this.#request<T>(method.toUpperCase(), url, body, true, accept)).value;
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

	async collectRest<T>(path: string, limit = 10_000): Promise<T[]> {
		const items: T[] = [];
		const seen = new Set<string>();
		let next: string | undefined = path;
		while (next && items.length < limit) {
			const url = next.startsWith("http") ? next : `${this.#apiBase}${next.startsWith("/") ? "" : "/"}${next}`;
			if (seen.has(url)) throw this.#protocol("GET", url, "REST pagination loop");
			seen.add(url);
			const response = await this.#request<T[]>("GET", url, undefined, true);
			if (!Array.isArray(response.value)) throw this.#protocol("GET", url, "expected an array page");
			items.push(...response.value.slice(0, limit - items.length));
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
	): Promise<{ value: T; headers: Headers; status: number; requestId?: string }> {
		const token = await this.#getToken();
		const cacheKey = `${url}|${accept}`;
		const cached = method === "GET" && useEtag ? this.#cache.get(cacheKey) : undefined;
		for (let attempt = 0; ; attempt++) {
			const headers = new Headers({
				Accept: accept,
				Authorization: `Bearer ${token}`,
				"X-GitHub-Api-Version": "2022-11-28",
				"User-Agent": this.#userAgent,
			});
			if (body !== undefined) headers.set("Content-Type", "application/json");
			if (cached) headers.set("If-None-Match", cached.etag);
			let response: Response;
			try {
				response = await this.#transport.request(url, {
					method,
					headers,
					body: body === undefined ? undefined : JSON.stringify(body),
				});
			} catch (cause) {
				if (attempt < this.#maxRetries) {
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
			const requestId = response.headers.get("x-github-request-id") ?? undefined;
			this.#readRestRate(response.headers);
			if (response.status === 304 && cached)
				return { value: cached.value as T, headers: response.headers, status: 304, requestId };
			const raw = await response.text();
			const value = raw ? (accept.includes("json") ? safeJson(raw) : raw) : undefined;
			if (response.ok) {
				const etag = response.headers.get("etag");
				if (method === "GET" && useEtag && etag) this.#cache.set(cacheKey, { etag, value });
				if (method !== "GET") this.invalidate();
				return { value: value as T, headers: response.headers, status: response.status, requestId };
			}
			const classification = classify(response, value);
			if (response.status === 401 || response.status === 403) this.#onAuthenticationFailure?.();
			if (attempt < this.#maxRetries && classification.retryable) {
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
	const retryAfter = numberHeader(response.headers, "retry-after");
	if (
		(response.status === 403 || response.status === 429) &&
		(retryAfter !== undefined || message.includes("secondary rate limit") || message.includes("abuse detection"))
	)
		return {
			kind: "secondary-rate-limit",
			retryable: true,
			delayMs: retryAfter === undefined ? undefined : retryAfter * 1000,
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
