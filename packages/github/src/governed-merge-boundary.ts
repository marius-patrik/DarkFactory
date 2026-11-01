/**
 * The production graph's API-only, authoritative PR merge adapter.
 *
 * The graph supplies an exact PR/head/base and trusted human identity.
 * Governance re-reads all of those facts from GitHub before a conditional
 * request. Queued merges never become completed effects until readback
 * establishes protected-target ancestry.
 */
import { GovernedPullRequests } from "./governance.ts";
import type { GitHubRepository } from "./repository.ts";

export function createGovernedGitHubMergeBoundary(repository: GitHubRepository) {
	const governance = new GovernedPullRequests(repository);

	return {
		async read(number: number, expectedHeadSha: string, baseBranch: string) {
			const result = await governance.confirmMerged({
				number,
				reviewedHeadSha: expectedHeadSha,
				baseBranch,
			});
			return {
				number: result.number,
				headSha: result.reviewedHeadSha,
				merged: result.merged,
				...(result.mergeCommitSha ? { mergeSha: result.mergeCommitSha } : {}),
			};
		},

		async mergeIfHead(
			number: number,
			expectedHeadSha: string,
			authorization: { approvedBy: string; baseBranch: string },
		) {
			if (!authorization?.baseBranch || !authorization.approvedBy) {
				throw new Error("Conditional merge requires an exact target and independent reviewer");
			}
			const result = await governance.requestMerge({
				number,
				reviewedHeadSha: expectedHeadSha,
				baseBranch: authorization.baseBranch,
				approvedBy: authorization.approvedBy,
			});
			return {
				merged: result.merged,
				...(result.mergeCommitSha ? { mergeSha: result.mergeCommitSha } : {}),
			};
		},
	};
}
