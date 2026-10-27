import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
/** Fetch-compatible transport used for GitHub App token operations. */
export type GitHubFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

import { z } from "zod";

/** Machine GitHub App identity and installation metadata. */
interface GitHubAppIdentity {
	appId: string;
	privateKey: string;
	owner: string;
	repo: string;
	installationId?: number;
	permissions?: Record<string, "read" | "write">;
	permissionsByLevel?: Record<string, Record<string, "read" | "write">>;
	botLogin?: string;
	privateKeySecret?: string;
}
interface ProviderOptions {
	fetch?: GitHubFetch;
	now?: () => Date;
}
interface CachedToken {
	token: string;
	expiresAt: number;
}

/**
 * Puts a private key into the form `importPKCS8` accepts.
 *
 * Two differences between what GitHub issues and what `jose` wants, both of which produced
 * `"pkcs8" must be PKCS#8 formatted string` - a message that names neither the format nor the escaping.
 *
 * **Escaped newlines.** GitHub's guidance for storing an App key is to keep the `\n` sequences
 * *escaped* so the secret survives a copy-paste, and every workflow here reads the key that way - which
 * is why `actions/create-github-app-token` works and this did not. That action unescapes before signing;
 * `jose` does not.
 *
 * **PKCS#1.** GitHub's UI downloads a key in PKCS#1 (`BEGIN RSA PRIVATE KEY`). `jose`'s `importPKCS8`
 * accepts only PKCS#8 (`BEGIN PRIVATE KEY`) and rejects PKCS#1 outright, whether or not the newlines are
 * escaped. `node:crypto` reads both, so the key is converted rather than refused.
 *
 * Only the escaped sequence `\n` is replaced, so a real PEM round-trips byte for byte unless it contains
 * an escaped one; and the conversion is attempted only for a PKCS#1 header, so a PKCS#8 key never goes
 * through `node:crypto` at all. Anything unusable is passed on unchanged for the signer to reject -
 * deciding what a key *is* is this function's job, deciding whether it works is the signer's.
 *
 * @param pem A private key, in either PEM format, possibly with escaped newlines.
 * @returns A PKCS#8 PEM with real newlines.
 */
export function normalisePrivateKey(pem: string): string {
	const unescaped = /\\n/u.test(pem) ? pem.replace(/\\n/gu, "\n") : pem;
	if (!/^-----BEGIN RSA PRIVATE KEY-----/mu.test(unescaped)) return unescaped;

	// `createPrivateKey` throws on anything it cannot parse, and that throw is the answer: a key this
	// cannot read is one the signer should be asked about, not something to reshape into looking valid.
	return createPrivateKey(unescaped).export({ type: "pkcs8", format: "pem" }).toString();
}

/** Mints and refreshes GitHub App installation access tokens. */
export class AppInstallationTokenProvider {
	readonly #identity: GitHubAppIdentity;
	readonly #fetch: GitHubFetch;
	readonly #now: () => Date;
	#cached?: CachedToken;
	#pending?: Promise<string>;
	#installationId?: number;

	constructor(identity: GitHubAppIdentity, options: ProviderOptions = {}) {
		this.#identity = identity;
		this.#fetch = options.fetch ?? globalThis.fetch;
		this.#now = options.now ?? (() => new Date());
		this.#installationId = identity.installationId;
	}
	async getToken(): Promise<string> {
		if (this.#cached && this.#cached.expiresAt - 60_000 > this.#now().getTime()) return this.#cached.token;
		if (!this.#pending)
			this.#pending = this.#mint().finally(() => {
				this.#pending = undefined;
			});
		return this.#pending;
	}
	evict(): void {
		this.#cached = undefined;
	}
	/**
	 * The signed App JWT itself, for the endpoints that accept nothing else.
	 *
	 * `GET /app/installations` is JWT-only - GitHub rejects an installation token with "a JSON web
	 * token could not be decoded" - so enumerating where the App is installed needs this rather than
	 * {@link getToken}. The two are different credentials for different scopes and neither works in the
	 * other's place, which is why this exists instead of `getToken` being widened.
	 *
	 * Signed fresh each call and never cached: GitHub caps a JWT at ten minutes, and a cached one that
	 * outlived its window would fail as an opaque authentication error. The signing itself is cheap
	 * next to the round trip it accompanies.
	 *
	 * @returns A JWT asserting the App's identity.
	 */
	async getAppJwt(): Promise<string> {
		const now = Math.floor(this.#now().getTime() / 1000);
		const key = await importPKCS8(normalisePrivateKey(this.#identity.privateKey), "RS256");
		return new SignJWT({})
			.setProtectedHeader({ alg: "RS256" })
			.setIssuer(this.#identity.appId)
			.setIssuedAt(now - 60)
			.setExpirationTime(now + 9 * 60)
			.sign(key);
	}
	async #mint(): Promise<string> {
		const jwt = await this.getAppJwt();
		const common = {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${jwt}`,
			"X-GitHub-Api-Version": "2022-11-28",
			"Content-Type": "application/json",
		};
		let installationId = this.#installationId;
		if (installationId === undefined) {
			const response = await this.#fetch(
				`https://api.github.com/repos/${encodeURIComponent(this.#identity.owner)}/${encodeURIComponent(this.#identity.repo)}/installation`,
				{ headers: common },
			);
			if (!response.ok) throw new Error(`GitHub App installation lookup failed (${response.status})`);
			const payload = (await response.json()) as { id?: unknown };
			if (typeof payload.id !== "number") throw new Error("invalid GitHub App installation response");
			installationId = payload.id;
			this.#installationId = installationId;
		}
		const response = await this.#fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
			method: "POST",
			headers: common,
			// GitHub accepts permissions two ways and this sends both correctly. A flat record is the
			// narrow form: it applies the same level to every named permission, which is what a caller
			// that only ever wants repository scope is asking for. `permissions_by_level` is the
			// explicit form, and it is the only one that can express "issues write, pages read"
			// because those sit at different levels.
			body: JSON.stringify({
				permissions: this.#identity.permissions ?? {},
				...(this.#identity.permissionsByLevel ? { permissions_by_level: this.#identity.permissionsByLevel } : {}),
			}),
		});
		if (!response.ok) throw new Error(`GitHub App token mint failed (${response.status})`);
		const payload = (await response.json()) as { token?: unknown; expires_at?: unknown };
		if (typeof payload.token !== "string" || typeof payload.expires_at !== "string")
			throw new Error("invalid GitHub App token response");
		this.#cached = { token: payload.token, expiresAt: new Date(payload.expires_at).getTime() };
		return payload.token;
	}
}

const manifestAppSchema = z
	.object({
		app_id: z.union([z.string(), z.number()]),
		slug: z.string().optional(),
		bot_login: z.string().optional(),
		private_key_secret: z.string(),
		installation_id: z.number().optional(),
		// Permissions are declared nested, matching the shape of a GitHub App manifest:
		// {repository: {contents: "write"}, organization: {projects: "write"}}. The flat form is
		// still accepted, because a caller may narrow deliberately - "issues write" on its own is a
		// legitimate thing to ask for and rejecting it would leave them with no way to express it.
		permissions: z
			.union([
				z.record(z.string(), z.enum(["read", "write"])),
				z.record(z.string(), z.record(z.string(), z.enum(["read", "write"]))),
			])
			.optional(),
	})
	.passthrough();

/**
 * The levels a token request may name.
 *
 * GitHub rejects a request naming a level it does not recognise, so the declaration is filtered to
 * these rather than passed through. An unknown level is dropped rather than refused, because a
 * declaration may legitimately carry more than one token can express - the App's own settings list
 * levels this pipeline has no business asking a token to widen.
 */
const PERMISSION_LEVELS = ["repository", "organization", "enterprise", "single_repo"] as const;

/**
 * Reads a permission declaration into the flat and per-level forms a token request understands.
 *
 * A nested declaration becomes both: the flat form carries the `repository` level, which is what the
 * pipeline's work is scoped to, and the per-level form carries every level so a declaration that
 * relies on an organisation-level grant is not silently dropped. A flat declaration passes through
 * unchanged, since it already says what it means.
 *
 * @param declared Whatever `repo.dfconfig` declares under `app.permissions`.
 * @returns Flat and per-level permissions, or undefined when nothing usable was declared.
 */
export function permissionsForTokenRequest(declared: Record<string, unknown> | undefined):
	| {
			permissions?: Record<string, "read" | "write">;
			permissionsByLevel?: Record<string, Record<string, "read" | "write">>;
	  }
	| undefined {
	if (!declared) return undefined;

	const level = (value: unknown): value is Record<string, "read" | "write"> =>
		typeof value === "object" && value !== null && !Array.isArray(value);

	const flat = Object.fromEntries(
		Object.entries(declared).filter(
			(entry): entry is [string, "read" | "write"] => entry[1] === "read" || entry[1] === "write",
		),
	);
	const byLevel = Object.fromEntries(
		Object.entries(declared).filter(
			(entry): entry is [string, Record<string, "read" | "write">] =>
				(PERMISSION_LEVELS as readonly string[]).includes(entry[0]) && level(entry[1]),
		),
	);

	if (Object.keys(byLevel).length === 0) {
		return Object.keys(flat).length > 0 ? { permissions: flat } : undefined;
	}
	return { permissions: Object.keys(flat).length > 0 ? flat : undefined, permissionsByLevel: byLevel };
}

/** Resolves a GitHub App machine identity from repository declaration plus secret storage. */
export async function appIdentityFromManifest(
	manifest: unknown,
	repository: string,
	readSecret: (name: string) => string | Promise<string>,
): Promise<GitHubAppIdentity> {
	// The App block is reached by walking, not by a union of wrappers. `repo.dfconfig` nests it at
	// `repo.app`, a caller holding only the `repo` block is one level shallower, and a caller holding
	// the App block itself is two. A `z.union` of the three shapes looks equivalent and is not: the
	// schema is `.passthrough()`, so the bare-App branch accepts almost anything and whichever branch
	// the union reaches first reports a failure that names a path the caller never used. Walking
	// until an `app` block appears says plainly which depth was found, and names both otherwise.
	let app: unknown = manifest;
	for (let depth = 0; depth < 3; depth++) {
		if (typeof app !== "object" || app === null || Array.isArray(app)) break;
		const record = app as Record<string, unknown>;
		if (record.app !== undefined) {
			app = record.app;
			break;
		}
		// Descend only through the document's own spine, not through arbitrary keys: a caller passing
		// some unrelated object should be told which key was missing rather than searched exhaustively.
		const next = record.repo;
		if (typeof next !== "object" || next === null) break;
		app = next;
	}
	const parsed = manifestAppSchema.safeParse(app);
	if (!parsed.success) {
		throw new Error(
			`no usable repo.app block (looked at ${app === manifest ? "the document" : "repo.app"}): ${parsed.error.issues
				.map((issue) => `${issue.path.join(".") || "<root>"} ${issue.message}`)
				.join("; ")}`,
		);
	}
	const slash = repository.indexOf("/");
	if (slash < 1 || slash === repository.length - 1) throw new Error("repository must be owner/name");
	const { permissions, permissionsByLevel } = permissionsForTokenRequest(parsed.data.permissions) ?? {};
	return {
		appId: String(parsed.data.app_id),
		privateKey: await readSecret(parsed.data.private_key_secret),
		privateKeySecret: parsed.data.private_key_secret,
		owner: repository.slice(0, slash),
		repo: repository.slice(slash + 1),
		installationId: parsed.data.installation_id,
		permissions,
		permissionsByLevel,
		botLogin: parsed.data.bot_login ?? (parsed.data.slug ? `${parsed.data.slug}[bot]` : undefined),
	};
}

/** Resolves the GitHub credential source used by machine/runtime API clients. */
export async function resolveGitHubCredential(
	input: { token?: string; app?: GitHubAppIdentity },
	env: Record<string, string | undefined> = process.env,
): Promise<{
	token: string | (() => Promise<string>);
	provider?: AppInstallationTokenProvider;
	onAuthenticationFailure?: () => void;
}> {
	if (input.token) return { token: input.token };
	if (input.app) {
		const provider = new AppInstallationTokenProvider(input.app);
		return { token: () => provider.getToken(), provider, onAuthenticationFailure: () => provider.evict() };
	}
	const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
	if (!token) throw new Error("GitHub credentials are not configured");
	return { token };
}
