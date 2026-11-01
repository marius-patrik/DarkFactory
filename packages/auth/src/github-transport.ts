/** @packageDocumentation
 * Server-only GitHub App broker transport. Uses separate user and installation credentials,
 * scopes each minted installation token to exactly one repository, and never logs tokens.
 */
import { AppInstallationTokenProvider } from "../../keychain/src/github-app.ts";
import type { GitHubBrokerTransport, ScopedRepositoryAuthority, VerifiedCommentReceipt } from "./http.ts";

export interface GitHubBrokerTransportOptions {
	appId: string;
	privateKey: string;
	fetcher?: (url: string, init?: RequestInit) => Promise<Response>;
	/** Test-only JWT adapter; production signs JWT with App private key. */
	appJwtForRepository?: (owner: string, repo: string) => Promise<string>;
}

function parsedRepo(repository: string): { owner: string; repo: string; path: string } {
	const parts = repository.split("/");
	if (parts.length !== 2 || parts.some((part) => !/^[a-zA-Z0-9_.-]+$/u.test(part) || part.includes("..")))
		throw new Error("Invalid scoped GitHub repository");
	return {
		owner: parts[0]!,
		repo: parts[1]!,
		path: `repos/${encodeURIComponent(parts[0]!)}/${encodeURIComponent(parts[1]!)}`,
	};
}

function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("Invalid scoped GitHub API response");
	return value as Record<string, unknown>;
}

function permission(value: unknown): "read" | "write" | undefined {
	return value === "read" || value === "write" ? value : undefined;
}

/** Privileged GitHub operations always use a repo-specific installation token. */
export class ScopedGitHubAppTransport implements GitHubBrokerTransport {
	readonly #options: GitHubBrokerTransportOptions;
	readonly #fetch: (url: string, init?: RequestInit) => Promise<Response>;

	constructor(options: GitHubBrokerTransportOptions) {
		if (!options.appId || (!options.privateKey && !options.appJwtForRepository))
			throw new Error("GitHub App signer is not configured");
		this.#options = options;
		this.#fetch = options.fetcher ?? globalThis.fetch;
	}

	async #request(path: string, bearer: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<Response> {
		return this.#fetch(`https://api.github.com/${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${bearer}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
				...(body === undefined ? {} : { "Content-Type": "application/json" }),
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
			redirect: "error",
			cache: "no-store",
		});
	}

	async #appJwt(repository: string): Promise<string> {
		const { owner, repo } = parsedRepo(repository);
		if (this.#options.appJwtForRepository) return this.#options.appJwtForRepository(owner, repo);
		return new AppInstallationTokenProvider({
			appId: this.#options.appId,
			privateKey: this.#options.privateKey,
			owner,
			repo,
		}).getAppJwt();
	}

	async #installation(repository: string): Promise<{ id: number; permissions: Record<string, unknown> } | null> {
		const path = parsedRepo(repository).path;
		const jwt = await this.#appJwt(repository);
		const response = await this.#request(`${path}/installation`, jwt);
		if (response.status === 404) return null;
		if (!response.ok) throw new Error("GitHub App installation discovery unavailable");
		const payload = object(await response.json());
		if (!Number.isSafeInteger(payload.id) || (payload.id as number) <= 0)
			throw new Error("GitHub App installation identity invalid");
		return {
			id: payload.id as number,
			permissions: object(payload.permissions),
		};
	}

	async #repositoryToken(repository: string, write: boolean): Promise<string> {
		const installation = await this.#installation(repository);
		if (!installation) throw new Error("GitHub App repository installation unavailable");
		if (permission(installation.permissions.issues) !== "write" && write)
			throw new Error("GitHub App issue mutation permission unavailable");
		if (!permission(installation.permissions.issues)) throw new Error("GitHub App issue access unavailable");
		const jwt = await this.#appJwt(repository);
		const { repo } = parsedRepo(repository);
		const response = await this.#request(`app/installations/${installation.id}/access_tokens`, jwt, "POST", {
			repositories: [repo],
			permissions: { issues: write ? "write" : "read" },
		});
		if (!response.ok) throw new Error("Scoped GitHub installation token unavailable");
		const payload = object(await response.json());
		if (typeof payload.token !== "string" || !payload.token) throw new Error("GitHub installation token invalid");
		const repositories = Array.isArray(payload.repositories) ? payload.repositories : null;
		// GitHub returns scoped repositories when requested; when the field is omitted,
		// the token grant itself must be trusted to enforce the restricted request.
		if (repositories && (repositories.length !== 1 || object(repositories[0]).name !== repo))
			throw new Error("GitHub installation token is not repository-scoped");
		return payload.token;
	}

	async authority(input: {
		userToken: string;
		userId: string;
		repository: string;
	}): Promise<ScopedRepositoryAuthority> {
		const user = await this.#request("user", input.userToken);
		if (!user.ok) throw new Error("GitHub user credential is no longer valid");
		const identity = object(await user.json());
		if (typeof identity.login !== "string" || identity.login !== input.userId)
			throw new Error("GitHub user identity changed");
		const repo = await this.#request(parsedRepo(input.repository).path, input.userToken);
		if (!repo.ok) throw new Error("Authenticated GitHub user cannot access repository");
		const userRepository = object(await repo.json());
		const fullName = userRepository.full_name;
		if (typeof fullName !== "string" || fullName.toLowerCase() !== input.repository.toLowerCase())
			throw new Error("GitHub repository identity mismatch");
		const grants = object(userRepository.permissions);
		const installation = await this.#installation(input.repository);
		const issues = installation ? permission(installation.permissions.issues) : undefined;
		return {
			userId: input.userId,
			userPermissions: { admin: grants.admin === true, push: grants.push === true, pull: grants.pull === true },
			appAuthority: {
				installed: installation !== null,
				repositorySelected: installation !== null,
				canRead: issues === "read" || issues === "write",
				canWrite: issues === "write",
				canAdminister: false,
			},
		};
	}

	async issueUpdatedAt(input: { repository: string; issue: number; userId: string }): Promise<string> {
		const token = await this.#repositoryToken(input.repository, false);
		const response = await this.#request(`${parsedRepo(input.repository).path}/issues/${input.issue}`, token);
		if (!response.ok) throw new Error("GitHub issue revision read unavailable");
		const issue = object(await response.json());
		if (typeof issue.updated_at !== "string" || !Number.isFinite(Date.parse(issue.updated_at)))
			throw new Error("GitHub issue revision unavailable");
		return issue.updated_at;
	}

	async createComment(input: {
		repository: string;
		issue: number;
		body: string;
		userId: string;
	}): Promise<{ id: number }> {
		const token = await this.#repositoryToken(input.repository, true);
		const response = await this.#request(
			`${parsedRepo(input.repository).path}/issues/${input.issue}/comments`,
			token,
			"POST",
			{ body: input.body },
		);
		if (!response.ok) throw new Error("GitHub issue mutation unavailable");
		const created = object(await response.json());
		if (!Number.isSafeInteger(created.id) || (created.id as number) <= 0)
			throw new Error("GitHub mutation receipt unavailable");
		return { id: created.id as number };
	}

	async readComment(input: {
		repository: string;
		issue: number;
		commentId: number;
		userId: string;
	}): Promise<VerifiedCommentReceipt | undefined> {
		const token = await this.#repositoryToken(input.repository, false);
		const response = await this.#request(
			`${parsedRepo(input.repository).path}/issues/comments/${input.commentId}`,
			token,
		);
		if (response.status === 404) return undefined;
		if (!response.ok) throw new Error("GitHub mutation authoritative readback unavailable");
		const item = object(await response.json());
		const url = typeof item.issue_url === "string" ? item.issue_url : "";
		const parsed = new URL(url);
		const expected = `/${parsedRepo(input.repository).path}/issues/${input.issue}`;
		if (parsed.origin !== "https://api.github.com" || parsed.pathname.toLowerCase() !== expected.toLowerCase())
			return undefined;
		if (item.id !== input.commentId || typeof item.body !== "string") return undefined;
		return { repository: input.repository, issue: input.issue, id: input.commentId, body: item.body };
	}
}
