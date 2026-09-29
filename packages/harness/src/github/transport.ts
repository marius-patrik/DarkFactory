export type GitHubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface TransportOptions {
	fetch?: GitHubFetch;
	timeoutMs?: number;
}

export class FetchTransport {
	readonly #fetch: GitHubFetch;
	readonly #timeoutMs: number;

	constructor(options: TransportOptions = {}) {
		this.#fetch = options.fetch ?? globalThis.fetch;
		this.#timeoutMs = options.timeoutMs ?? 30_000;
	}

	request(url: string, init: RequestInit = {}): Promise<Response> {
		return this.#fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(this.#timeoutMs) });
	}
}
