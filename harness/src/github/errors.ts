export type GitHubErrorKind = "authentication" | "permission" | "not-found" | "validation" | "primary-rate-limit" | "secondary-rate-limit" | "transport" | "protocol" | "graphql";

export interface GitHubErrorOptions {
  kind: GitHubErrorKind;
  message: string;
  method: string;
  path: string;
  status?: number;
  requestId?: string;
  retryAt?: Date;
}

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly method: string;
  readonly path: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly retryAt?: Date;

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

export function redact(value: string, secrets: readonly string[] = []): string {
  let result = value.replace(/-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----/g, "[REDACTED PRIVATE KEY]");
  result = result.replace(/("?(?:authorization|token|encrypted_value)"?\s*[:=]\s*"?)[^"\s,}]+/gi, "$1[REDACTED]");
  for (const secret of secrets) if (secret) result = result.split(secret).join("[REDACTED]");
  return result;
}
