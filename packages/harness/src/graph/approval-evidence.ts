import { contextFingerprint } from "./review-loop.ts";

export interface MergeAuthorization {
	fingerprint: string;
	prNumber: number;
	headSha: string;
	actor: string;
	approvedAt: string;
}

/** Amendment authorization always binds the specific Planning and diff proposal. */
export function amendmentProposalFingerprint(outputs: Record<string, unknown>): string {
	if (!outputs.planning_context || !outputs.plan_artifact ||
		!outputs.implementation_context || !outputs.implementation_artifact)
		throw new Error("Amendment gate requires exact Planning and implementation artifacts");
	return contextFingerprint({
		planningContext: outputs.planning_context,
		plan: outputs.plan_artifact,
		implementationContext: outputs.implementation_context,
		implementation: outputs.implementation_artifact,
		commit: outputs.commit_sha,
		branch: outputs.branch,
		pr: outputs.pr_number,
	});
}

/** Exact local proposal bound by the final human merge authorization. */
export function mergeProposalFingerprint(outputs: Record<string, unknown>): string {
	const pr = outputs.pr_number;
	const sha = outputs.commit_sha;
	if (!Number.isSafeInteger(pr) || (pr as number) <= 0) throw new Error("Merge requires an observed pull request number");
	if (typeof sha !== "string" || !/^[a-f0-9]{40}$/iu.test(sha))
		throw new Error("Merge requires an observed immutable commit SHA");
	if (outputs.aligned !== true) throw new Error("Merge requires positive final alignment");
	if (!outputs.plan_artifact || !outputs.planning_context || !outputs.implementation_artifact)
		throw new Error("Merge requires reviewed Planning and implementation evidence");
	return contextFingerprint({
		request: outputs.planning_context,
		plan: outputs.plan_artifact,
		implementation: outputs.implementation_artifact,
		commit: sha,
		pr,
		alignment: outputs.aligned,
		closingIssues: outputs.closing_issues ?? [],
		verifiedActions: outputs.verification ?? null,
		externalChecksHead: outputs.external_checks_head_sha ?? null,
	});
}

/** An approval never authorizes another PR, head SHA, or proposal revision. */
export function assertMergeAuthorization(outputs: Record<string, unknown>): MergeAuthorization {
	const approval = outputs.merge_authorization as Partial<MergeAuthorization> | undefined;
	if (!approval || typeof approval.actor !== "string" || !approval.actor ||
		typeof approval.approvedAt !== "string" || approval.prNumber !== outputs.pr_number ||
		approval.headSha !== outputs.commit_sha ||
		approval.fingerprint !== mergeProposalFingerprint(outputs)) {
		throw new Error("Missing or stale exact-head final merge authorization");
	}
	if (outputs.external_checks_head_sha !== approval.headSha) {
		throw new Error("Required external check evidence does not bind to approved head SHA");
	}
	return approval as MergeAuthorization;
}
