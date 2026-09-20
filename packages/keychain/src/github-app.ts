import { importPKCS8, SignJWT } from "jose";
export type GitHubFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
import { z } from "zod";

export interface GitHubAppIdentity { appId: string; privateKey: string; owner: string; repo: string; installationId?: number; permissions?: Record<string, "read" | "write">; botLogin?: string; privateKeySecret?: string; }
interface ProviderOptions { fetch?: GitHubFetch; now?: () => Date; }
interface CachedToken { token: string; expiresAt: number; }

export class AppInstallationTokenProvider {
  readonly #identity: GitHubAppIdentity;
  readonly #fetch: GitHubFetch;
  readonly #now: () => Date;
  #cached?: CachedToken;
  #pending?: Promise<string>;
  #installationId?: number;

  constructor(identity: GitHubAppIdentity, options: ProviderOptions = {}) { this.#identity = identity; this.#fetch = options.fetch ?? globalThis.fetch; this.#now = options.now ?? (() => new Date()); this.#installationId = identity.installationId; }
  async getToken(): Promise<string> {
    if (this.#cached && this.#cached.expiresAt - 60_000 > this.#now().getTime()) return this.#cached.token;
    if (!this.#pending) this.#pending = this.#mint().finally(() => { this.#pending = undefined; });
    return this.#pending;
  }
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

export async function appIdentityFromManifest(manifest: unknown, repository: string, readSecret: (name: string) => string | Promise<string>): Promise<GitHubAppIdentity> {
  const root = z.object({ app: manifestAppSchema }).passthrough().parse(manifest);
  const slash = repository.indexOf("/");
  if (slash < 1 || slash === repository.length - 1) throw new Error("repository must be owner/name");
  return { appId: String(root.app.app_id), privateKey: await readSecret(root.app.private_key_secret), privateKeySecret: root.app.private_key_secret, owner: repository.slice(0, slash), repo: repository.slice(slash + 1), installationId: root.app.installation_id, permissions: root.app.permissions, botLogin: root.app.bot_login ?? (root.app.slug ? `${root.app.slug}[bot]` : undefined) };
}

export async function resolveGitHubCredential(input: { token?: string; app?: GitHubAppIdentity }, env: Record<string, string | undefined> = process.env): Promise<{ token: string | (() => Promise<string>); provider?: AppInstallationTokenProvider; onAuthenticationFailure?: () => void }> {
  if (input.token) return { token: input.token };
  if (input.app) { const provider = new AppInstallationTokenProvider(input.app); return { token: () => provider.getToken(), provider, onAuthenticationFailure: () => provider.evict() }; }
  const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
  if (!token) throw new Error("GitHub credentials are not configured");
  return { token };
}
