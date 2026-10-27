import { describe, expect, test } from "bun:test";
import {
	assertMergeAuthorization,
	mergeProposalFingerprint,
} from "../../../../packages/harness/src/graph/approval-evidence.ts";

const SHA = "c".repeat(40);

function approved() {
	const outputs: Record<string, unknown> = {
		plan_artifact: { behavioralContract: ["single-owner graph"], scope: ["packages/harness/**"] },
		planning_context: { request: { id: 2698, version: "immutable" }, base: SHA },
		implementation_artifact: { branch: "agent/2698", observedCommit: SHA },
		commit_sha: SHA,
		pr_number: 901,
		closing_issues: [2698],
		aligned: true,
		verification: [{ action: "unit", verified: true, head: SHA }],
		external_checks_head_sha: SHA,
	};
	const fingerprint = mergeProposalFingerprint(outputs);
	outputs.merge_authorization = {
		fingerprint,
		prNumber: 901,
		headSha: SHA,
		actor: "maintainer",
		approvedAt: "2026-10-27T10:00:00.000Z",
	};
	return outputs;
}

describe("exact-state final merge approval", () => {
	test("accepts checked and attributed authorization for the immutable proposal", () => {
		expect(assertMergeAuthorization(approved())).toMatchObject({
			prNumber: 901, headSha: SHA, actor: "maintainer",
		});
	});

	test("changing approved issue-closure targets requires a fresh owner authorization", () => {
		const evidence = approved();
		evidence.closing_issues = [2698, 2070];
		expect(() => assertMergeAuthorization(evidence)).toThrow("stale");
	});

	test("changing verification evidence invalidates the original merge authorization", () => {
		const evidence = approved();
		evidence.verification = [{ action: "unit", verified: false, head: SHA }];
		expect(() => assertMergeAuthorization(evidence)).toThrow("stale");
	});

	test("a new PR head, base, plan or implementation artifact cannot reuse approval", () => {
		for (const key of ["pr_number", "commit_sha", "planning_context", "plan_artifact", "implementation_artifact"]) {
			const evidence = approved();
			evidence[key] = key === "pr_number" ? 902 : { replaced: true };
			expect(() => assertMergeAuthorization(evidence)).toThrow();
		}
	});

	test("an approving actor alone is not check evidence", () => {
		const evidence = approved();
		evidence.external_checks_head_sha = "b".repeat(40);
		expect(() => assertMergeAuthorization(evidence)).toThrow();
	});

	test("rejects unaligned or incomplete implementation even with a forged approval record", () => {
		const evidence = approved();
		evidence.aligned = false;
		expect(() => assertMergeAuthorization(evidence)).toThrow("alignment");
	});
});
