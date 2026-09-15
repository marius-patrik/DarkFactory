import type { GitHubRepository } from "../github/repository.ts";
import type { GitHubPullRequest } from "../github/types.ts";

/**
 * Opens a pull request, or returns an existing open pull request for the same head and base if one already exists.
 *
 * @param params - Pull request parameters.
 * @param params.repo - GitHub repository object supporting listPullRequests and createPullRequest.
 * @param params.head - The head branch or commit (can include owner prefix).
 * @param params.base - The base branch name.
 * @param params.title - The title of the pull request.
 * @param params.body - The body description of the pull request.
 * @param params.draft - Whether the pull request is a draft.
 * @returns The existing or newly created GitHub pull request object.
 */
export async function openPullRequest({
	repo,
	head,
	base,
	title,
	body,
	draft,
}: {
	repo: Pick<GitHubRepository, "createPullRequest" | "listPullRequests">;
	head: string;
	base: string;
	title: string;
	body: string;
	draft: boolean;
}): Promise<GitHubPullRequest> {
	const existing = await repo.listPullRequests({ head, base, state: "open" });
	const pr = existing[0];
	if (pr) {
		return pr;
	}
	return await repo.createPullRequest({ head, base, title, body, draft });
}
