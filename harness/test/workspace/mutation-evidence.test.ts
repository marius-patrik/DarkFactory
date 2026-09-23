import { describe, expect, test } from "bun:test";
import {
	enforceTruthfulAnswer,
	type MutationClaim,
	type MutationEvidence,
	mutationClaimSchema,
	validateMutationClaims,
} from "@darkfactory/core/mutation-evidence";

describe("mutation-evidence: typed claims and exact target validation", () => {
	test("rejects all mutation claims when run has no write path", () => {
		const claims: MutationClaim[] = [
			{ kind: "pushed", branch: "feat/example" },
			{ kind: "merged", pr: 123 },
			{ kind: "committed", sha: "abc1234" },
			{ kind: "resolved_conflicts", files: ["src/index.ts"] },
			{ kind: "modified_files", files: ["src/index.ts"] },
		];

		const result = validateMutationClaims(claims, { hasWritePath: false });
		expect(result.valid).toBe(false);
		expect(result.unsupportedClaims).toHaveLength(5);
	});

	test("accepts claims only when exact observed targets match", () => {
		const claims: MutationClaim[] = [
			{ kind: "committed", sha: "abc1234" },
			{ kind: "pushed", branch: "feat/my-branch" },
			{ kind: "merged", pr: 123 },
			{ kind: "resolved_conflicts", files: ["src/index.ts", "src/other.ts"] },
			{ kind: "modified_files", files: ["src/index.ts", "src/other.ts"] },
		];

		const evidence: MutationEvidence = {
			hasWritePath: true,
			committedSha: "abc1234",
			pushedBranch: "feat/my-branch",
			mergedPr: 123,
			resolvedConflicts: ["src/other.ts", "src/index.ts"],
			changedFiles: ["src/index.ts", "src/other.ts"],
		};

		const result = validateMutationClaims(claims, evidence);
		expect(result.valid).toBe(true);
		expect(result.unsupportedClaims).toHaveLength(0);
	});

	test("rejects mismatched branch, commit, PR and file targets", () => {
		const claims: MutationClaim[] = [
			{ kind: "pushed", branch: "feat/wrong" },
			{ kind: "committed", sha: "deadbeef" },
			{ kind: "merged", pr: 999 },
			{ kind: "resolved_conflicts", files: ["src/other.ts"] },
			{ kind: "modified_files", files: ["src/index.ts", "extra.ts"] },
		];

		const evidence: MutationEvidence = {
			hasWritePath: true,
			committedSha: "abc1234",
			pushedBranch: "feat/right",
			mergedPr: 123,
			resolvedConflicts: ["src/index.ts"],
			changedFiles: ["src/index.ts"],
		};

		const result = validateMutationClaims(claims, evidence);
		expect(result.valid).toBe(false);
		expect(result.unsupportedClaims).toHaveLength(5);
	});

	test("mutationClaimSchema requires typed mutation targets", () => {
		const valid = mutationClaimSchema.safeParse({
			claims: [
				{ kind: "pushed", branch: "feat/example" },
				{ kind: "merged", pr: 123 },
				{ kind: "committed", sha: "abc1234" },
				{ kind: "resolved_conflicts", files: ["src/index.ts"] },
			],
			summary: "Observed effects",
		});
		expect(valid.success).toBe(true);

		const invalid = mutationClaimSchema.safeParse({
			claims: [{ kind: "pushed" }],
			summary: "Missing target",
		});
		expect(invalid.success).toBe(false);
	});
});

describe("mutation-evidence: truthful answer enforcement", () => {
	test("rejects structured write claims when deterministic evidence is absent", () => {
		const answer = "The branch was pushed.";
		const payload = {
			claims: [{ kind: "pushed" as const, branch: "feat/example" }],
			summary: "Pushed branch",
		};

		const result = enforceTruthfulAnswer(answer, payload, { hasWritePath: false });
		expect(result.allowed).toBe(false);
		expect(result.unsupportedClaims).toHaveLength(1);
		expect(result.text).toContain("no repository write path");
	});

	test("allows prose when extracted payload makes no unsupported mutation claim", () => {
		const answer = "The branch has merge conflicts and requires the repair stage.";
		const payload = {
			claims: [],
			summary: "No completed mutation claimed",
		};

		const result = enforceTruthfulAnswer(answer, payload, { hasWritePath: false });
		expect(result.allowed).toBe(true);
		expect(result.unsupportedClaims).toHaveLength(0);
		expect(result.text).toBe(answer);
	});
});
