/**
 * Function signature for performing HTTP requests to GitHub.
 *
 * @param input - The request URL or Request object.
 * @param init - Optional fetch init options.
 * @returns A promise that resolves to a Response.
 */
export type GitHubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/**
 * Configuration options for the transport layer.
 *
 * @property fetch - Optional custom fetch implementation.
 * @property timeoutMs - Request timeout in milliseconds (default 30 000 ms).
 */
export interface TransportOptions {
  fetch?: GitHubFetch;
  timeoutMs?: number;
}

/**
 * Transport implementation using the Fetch API.
 *
 * Provides a simple wrapper that applies a timeout to each request.
 */
export class FetchTransport {
  readonly #fetch: GitHubFetch;
  readonly #timeoutMs: number;

  /**
   * Creates a new FetchTransport instance.
   *
   * @param options - Optional transport configuration.
   */
  constructor(options: TransportOptions = {}) {
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#timeoutMs = options.timeoutMs ?? 30_000;
  }

  /**
   * Sends an HTTP request using the configured fetch implementation.
   *
   * @param url - The request URL.
   * @param init - Optional fetch init options.
   * @returns A promise resolving to the response.
   */
  request(url: string, init: RequestInit = {}): Promise<Response> {
    return this.#fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(this.#timeoutMs) });
  }
}
