import { importPKCS8, SignJWT } from "jose";
import type { GitHubFetch } from "./transport.ts";
import { z } from "zod";

/**
 * Represents the identity of a GitHub App installation.
 *
 * @property appId - The GitHub App identifier.
 * @property privateKey - PEM encoded private key for signing JWTs.
 * @property owner - Owner of the repository (user or organization).
 * @property repo - Repository name.
 * @property installationId - Optional installation ID if known.
 * @property permissions - Optional map of permission names to "read" or "write".
 * @property botLogin - Optional bot login name for the app.
 * @property privateKeySecret - Name of the secret storing the private key.
 */
export interface GitHubAppIdentity {
  /** GitHub App identifier. */
  appId: string;
  /** PEM encoded private key for signing JWTs. */
  privateKey: string;
  /** Owner of the repository (user or organization). */
  owner: string;
  /** Repository name. */
  repo: string;
  /** Optional installation ID if known. */
  installationId?: number;
  /** Optional map of permission names to "read" or "write". */
  permissions?: Record<string, "read" | "write">;
  /** Optional bot login name for the app. */
  botLogin?: string;
  /** Name of the secret storing the private key. */
  privateKeySecret?: string;
}
/**
 * Options for the token provider.
 *
 * @property fetch - Optional fetch implementation.
 * @property now - Optional function returning the current date.
 */
interface ProviderOptions { fetch?: GitHubFetch; now?: () => Date; }
/**
 * Cached JWT token.
 *
 * @property token - The JWT token string.
 * @property expiresAt - Expiration timestamp in milliseconds.
 */
interface CachedToken { token: string; expiresAt: number; }

/**
 * Provides JWT‑based access tokens for a GitHub App installation.
 *
 * The provider caches a token until it is close to expiration, then mints a new one.
 * It also caches the installation ID after the first lookup.
 */
export class AppInstallationTokenProvider {
  readonly #identity: GitHubAppIdentity;
  readonly #fetch: GitHubFetch;
  readonly #now: () => Date;
  #cached?: CachedToken;
  #pending?: Promise<string>;
  #installationId?: number;

  /**
   * Creates a new {@link AppInstallationTokenProvider}.
   *
   * @param identity - The GitHub App identity.
   * @param options - Provider options.
   */
  constructor(identity: GitHubAppIdentity, options: ProviderOptions = {}) { this.#identity = identity; this.#fetch = options.fetch ?? globalThis.fetch; this.#now = options.now ?? (() => new Date()); this.#installationId = identity.installationId; }
/**
 * Retrieves a valid access token, minting a new one if necessary.
 *
 * @returns A JWT token string.
 */
  async getToken(): Promise<string> {
    if (this.#cached && this.#cached.expiresAt - 60_000 > this.#now().getTime()) return this.#cached.token;
    if (!this.#pending) this.#pending = this.#mint().finally(() => { this.#pending = undefined; });
    return this.#pending;
  }
/**
 * Clears the cached token, forcing a fresh token to be minted on next request.
 */
  evict(): void { this.#cached = undefined; }
  async #mint(): Promise<string> {
    const now = Math.floor(this.#now().getTime() / 1000);
    const key = await importPKCS8(this.#identity.privateKey, "RS256");
    const jwt = await new SignJWT({}).setProtectedHeader({ alg: "RS256" }).setIssuer(this.#identity.appId).setIssuedAt(now - 60).setExpirationTime(now + 9 * 60).sign(key);
    const common = { Accept: "application/vnd.github+json", Authorization: `Bearer ${jwt}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };
    let installationId = this.#installationId;
    if (installationId === undefined) { const response = await this.#fetch(`https://api.github.com/repos/${encodeURIComponent(this.#identity.owner)}/${encodeURIComponent(this.#identity.repo)}/installation`, { headers: common }); if (!response.ok) throw new Error(`GitHub App installation lookup failed (${response.status})`); const payload = await response.json() as { id?: unknown }; if (typeof payload.id !== "number") throw new Error("invalid GitHub App installation response"); installationId = payload.id; this.#installationId = installationId; }
    const response = await this.#fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, { method: "POST", headers: common, body: JSON.stringify({ permissions: this.#identity.permissions ?? {} }) });
    if (!response.ok) throw new Error(`GitHub App token mint failed (${response.status})`);
    const payload = await response.json() as { token?: unknown; expires_at?: unknown };
    if (typeof payload.token !== "string" || typeof payload.expires_at !== "string") throw new Error("invalid GitHub App token response");
    this.#cached = { token: payload.token, expiresAt: new Date(payload.expires_at).getTime() };
    return payload.token;
  }
}

const manifestAppSchema = z.object({ app_id: z.union([z.string(), z.number()]), slug: z.string().optional(), bot_login: z.string().optional(), private_key_secret: z.string(), installation_id: z.number().optional(), permissions: z.record(z.string(), z.enum(["read", "write"])).optional() }).passthrough();

/**
 * Derives a {@link GitHubAppIdentity} from a GitHub App manifest.
 *
 * @param manifest - Parsed JSON manifest object.
 * @param repository - Repository identifier in the form "owner/name".
 * @param readSecret - Function to read a secret by name; may return a promise.
 * @returns The assembled {@link GitHubAppIdentity}.
 * @throws If the repository string is malformed or required fields are missing.
 */
export async function appIdentityFromManifest(manifest: unknown, repository: string, readSecret: (name: string) => string | Promise<string>): Promise<GitHubAppIdentity> {
  const root = z.object({ app: manifestAppSchema }).passthrough().parse(manifest);
  const slash = repository.indexOf("/");
  if (slash < 1 || slash === repository.length - 1) throw new Error("repository must be owner/name");
  return { appId: String(root.app.app_id), privateKey: await readSecret(root.app.private_key_secret), privateKeySecret: root.app.private_key_secret, owner: repository.slice(0, slash), repo: repository.slice(slash + 1), installationId: root.app.installation_id, permissions: root.app.permissions, botLogin: root.app.bot_login ?? (root.app.slug ? `${root.app.slug}[bot]` : undefined) };
}



/**
 * Resolves GitHub authentication credentials from various inputs.
 *
 * The function prefers an explicit token, then an app identity (which yields a token provider), and finally environment variables.
 *
 * @param input - Object containing either a raw token or an app identity.
 * @param env - Optional environment mapping; defaults to process.env.
 * @returns An object providing a token string or a function returning a token, optionally with a provider for token refresh and a failure callback.
 * @property token - The token string or a function returning a token.
 * @property provider - Optional {@link AppInstallationTokenProvider} for token refresh.
 * @property onAuthenticationFailure - Optional callback invoked when authentication fails.
 * @throws If no token can be resolved from the inputs.
 */
export interface GitHubCredential {
  /**
   * Token string or a function returning a token.
   */
  token: string | (() => Promise<string>);
  /**
   * Optional {@link AppInstallationTokenProvider} for token refresh.
   */
  provider?: AppInstallationTokenProvider;
  /**
   * Optional callback invoked when authentication fails.
   */
  onAuthenticationFailure?: () => void;
}

/**
 * Picks the GitHub credential for a client: an explicit token first, then a GitHub App identity (installation tokens
 * minted and refreshed on demand, evicted after an authentication failure), then `GH_TOKEN` or `GITHUB_TOKEN`.
 *
 * @param input - An explicit token or App identity; both absent means the environment is used.
 * @param env - Environment to read `GH_TOKEN` / `GITHUB_TOKEN` from; defaults to `process.env`.
 * @returns The token (or token supplier) plus, for an App, its token provider and failure callback.
 * @throws Error when no token, App identity or environment token is available.
 */
export async function resolveGitHubCredential(input: { token?: string; app?: GitHubAppIdentity }, env: Record<string, string | undefined> = process.env): Promise<GitHubCredential> {
  if (input.token) return { token: input.token };
  if (input.app) { const provider = new AppInstallationTokenProvider(input.app); return { token: () => provider.getToken(), provider, onAuthenticationFailure: () => provider.evict() }; }
  const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
  if (!token) throw new Error("GitHub credentials are not configured");
  return { token };
}
