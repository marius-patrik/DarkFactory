/**
 * Enumeration of error categories returned by the GitHub client.
 */
export type GitHubErrorKind = "authentication" | "permission" | "not-found" | "validation" | "primary-rate-limit" | "secondary-rate-limit" | "transport" | "protocol" | "graphql";

/**
 * Options used to construct a {@link GitHubError}.
 *
 * @property kind - Category of the error.
 * @property message - Human‑readable error message.
 * @property method - HTTP method that was used.
 * @property path - Request path.
 * @property status - Optional HTTP status code.
 * @property requestId - Optional GitHub request identifier.
 * @property retryAt - Optional date indicating when a retry should be attempted.
 */
export interface GitHubErrorOptions {
/**
   * Category of the error.
   */
  kind: GitHubErrorKind;
/**
   * Human‑readable error message.
   */
  message: string;
/**
   * HTTP method that was used.
   */
  method: string;
/**
   * Request path.
   */
  path: string;
/**
   * Optional HTTP status code.
   */
  status?: number;
/**
   * Optional GitHub request identifier.
   */
  requestId?: string;
/**
   * Optional date indicating when a retry should be attempted.
   */
  retryAt?: Date;
}

/**
 * Represents an error returned from GitHub APIs.
 *
 * Extends the built‑in Error with additional metadata such as error kind,
 * HTTP method, request path, status code, request identifier and optional retry time.
 */
export class GitHubError extends Error {
/**
 * Category of the error.
 */
  readonly kind: GitHubErrorKind;
/**
 * HTTP method that was used for the request that caused the error.
 */
  readonly method: string;
/**
 * Request path (URL) that triggered the error.
 */
  readonly path: string;
/**
 * Optional HTTP status code returned by GitHub.
 */
  readonly status?: number;
/**
 * Optional GitHub request identifier for tracing.
 */
  readonly requestId?: string;
/**
 * Optional date indicating when a retry should be attempted (for rate‑limit errors).
 */
  readonly retryAt?: Date;

/**
   * Constructs a {@link GitHubError} from the given options.
   *
   * @param options - Configuration options describing the error.
   */
  constructor(options: GitHubErrorOptions) {
    const suffix = options.requestId ? ` (GitHub request ${options.requestId})` : "";
    super(`${options.message}${suffix}`);
    this.name = "GitHubError";
    this.kind = options.kind;
    this.method = options.method;
    this.path = options.path;
    this.status = options.status;
    this.requestId = options.requestId;
    this.retryAt = options.retryAt;
  }
}

/**
 * Redacts sensitive information from error messages.
 *
 * Replaces private keys, authorization tokens and any supplied secret values with
 * placeholders to avoid leaking credentials.
 *
 * @param value - The string to redact.
 * @param secrets - Optional list of secret values to replace.
 * @returns Redacted string.
 */
export function redact(value: string, secrets: readonly string[] = []): string {
  let result = value.replace(/-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----/g, "[REDACTED PRIVATE KEY]");
  result = result.replace(/("?(?:authorization|token|encrypted_value)"?\s*[:=]\s*"?)[^"\s,}]+/gi, "$1[REDACTED]");
  for (const secret of secrets) if (secret) result = result.split(secret).join("[REDACTED]");
  return result;
}
