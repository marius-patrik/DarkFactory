/**
 * What the App is installed on.
 *
 * Actions cannot receive `installation` or `installation_repositories` events - those are delivered
 * to the App, and this pipeline has no webhook receiver - so the sweep that makes "installing the App
 * is enough" work has to ask GitHub who it is installed on instead. That is this module: it turns an
 * App JWT into the list of repositories an installation covers.
 *
 * Two credential types are involved and they are not interchangeable. `GET /app/installations` is
 * only reachable with a **JWT** ("you must use a JWT to access this endpoint"), which is why the App
 * JWT minted by `keychain/src/github-app.ts` is required here rather than an installation token. Only
 * once an installation is known can a token be minted for it, and only that token can list the
 * installation's repositories.
 *
 * `actions/create-github-app-token` cannot do any of this: it resolves one installation and exposes
 * no way to enumerate them, which is the concrete reason this exists as code rather than as a
 * workflow step.
 */

import { z } from "zod";
import type { GitHubClient } from "./client.ts";

/** One installation of the App, as `GET /app/installations` reports it. */
const installationSchema = z.object({
	id: z.number(),
	account: z.object({ login: z.string() }).passthrough().nullable(),
	repository_selection: z.enum(["all", "selected"]).optional(),
	/** Only present on the single-installation endpoint, not on the list. */
	target_type: z.string().optional(),
	app_id: z.number().optional(),
	suspended_at: z.string().nullable().optional(),
});

/** The documented shape of `GET /installation/repositories`. */
const installationRepositoriesEnvelope = z
	.object({ total_count: z.number().optional(), repositories: z.array(z.unknown()) })
	.passthrough();

/** One repository reachable through an installation. */
const installationRepositorySchema = z.object({
	full_name: z.string(),
	private: z.boolean().optional(),
	archived: z.boolean().optional(),
	fork: z.boolean().optional(),
	/** `GET /installation/repositories` omits it; `GET /repos/{owner}/{repo}` supplies it. */
	default_branch: z.string().optional(),
});

/** An installation of the App and the account it was installed into. */
export interface AppInstallation {
	id: number;
	/** Account login, or undefined for an installation with no account attached. */
	account?: string;
	/** `all` means every repository in the account; `selected` means the list below. */
	repositorySelection: "all" | "selected";
	suspendedAt?: string;
}

/** A repository the App can act on through one installation. */
export interface InstallationRepository {
	/** `owner/name`. */
	fullName: string;
	private?: boolean;
	archived?: boolean;
	fork?: boolean;
	defaultBranch?: string;
}

/**
 * Enumerates the App's installations and the repositories they cover.
 *
 * Constructed with a {@link GitHubClient} whose token resolves to an App **JWT**. The mint-and-cache
 * side is `AppInstallationTokenProvider` in the keychain package; this class holds no key material and
 * signs nothing, so it is safe to construct from configuration alone.
 */
export class GitHubAppInstallations {
	readonly #client: GitHubClient;

	constructor(client: GitHubClient) {
		this.#client = client;
	}

	/**
	 * Every installation of the App.
	 *
	 * @returns Installations, newest page order as GitHub returns them.
	 * @throws When a page does not match GitHub's documented shape.
	 */
	async list(): Promise<AppInstallation[]> {
		const pages = await this.#client.collectRest<unknown>("/app/installations?per_page=100");
		return pages.map((page, index) => {
			const parsed = installationSchema.safeParse(page);
			if (!parsed.success) {
				throw new Error(
					`installation ${index} of /app/installations is not the documented shape: ${parsed.error.issues
						.map((issue) => `${issue.path.join(".") || "<root>"} ${issue.message}`)
						.join("; ")}`,
				);
			}
			const { id, account, repository_selection, suspended_at: suspendedAt } = parsed.data;
			return {
				id,
				...(account?.login ? { account: account.login } : {}),
				// Defaulted rather than required: an installation that omits it covers only the
				// repositories listed, which is the narrower and safer reading.
				repositorySelection: repository_selection ?? "selected",
				...(suspendedAt ? { suspendedAt } : {}),
			};
		});
	}

	/**
	 * The repositories one installation can reach.
	 *
	 * Needs an installation **token**, not a JWT: the App JWT is scoped to the App, and this endpoint
	 * is scoped to an installation. Minting that token is `AppInstallationTokenProvider`; passing the
	 * wrong credential here fails with a 403 that reads like a permissions problem.
	 *
	 * @param installationClient A client authenticated as a token for `installationId`.
	 * @returns Repositories reachable through the installation.
	 * @throws When a page does not match GitHub's documented shape.
	 */
	async repositoriesFor(installationClient: GitHubClient): Promise<InstallationRepository[]> {
		// GitHub documents this endpoint as `{total_count, repositories}` rather than a bare array, so
		// the list is unwrapped per page. Pagination is in the `Link` header either way, which is why
		// the extractor is the parameter that makes this pageable at all.
		const pages = await installationClient.collectRest<unknown>(
			"/installation/repositories?per_page=100",
			10_000,
			(page) => {
				const wrapped = installationRepositoriesEnvelope.safeParse(page);
				// A bare array is accepted as well: an installation with nothing reachable answers with one,
				// and neither shape is an error worth failing a sweep over. Returning undefined for anything
				// else lets `collectRest` raise the "expected an array page" protocol error, which names the
				// endpoint - a bare `[]` would read as "no repositories", which is the wrong answer to give.
				if (wrapped.success) return wrapped.data.repositories;
				return Array.isArray(page) ? page : undefined;
			},
		);
		return pages.map((page, index) => {
			const parsed = installationRepositorySchema.safeParse(page);
			if (!parsed.success) {
				throw new Error(
					`repository ${index} of /installation/repositories is not the documented shape: ${parsed.error.issues
						.map((issue) => `${issue.path.join(".") || "<root>"} ${issue.message}`)
						.join("; ")}`,
				);
			}
			const { full_name, private: isPrivate, archived, fork, default_branch: defaultBranch } = parsed.data;
			return {
				fullName: full_name,
				...(isPrivate === undefined ? {} : { private: isPrivate }),
				...(archived === undefined ? {} : { archived }),
				...(fork === undefined ? {} : { fork }),
				...(defaultBranch === undefined ? {} : { defaultBranch }),
			};
		});
	}
}
