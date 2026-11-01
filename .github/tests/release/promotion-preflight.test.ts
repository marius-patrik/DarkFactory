import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "bun:test";
import { releaseAssetNames } from "../../../packages/harness/scripts/release-targets.ts";
import { assertPromotionEvidence } from "../../../packages/harness/src/release/promotion-evidence.ts";
import { verifyLivePromotion } from "../../../packages/harness/src/release/promotion-preflight.ts";

const sha = (a: string) => a.repeat(40);
const digest = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function evidence() {
	const names = releaseAssetNames();
	return assertPromotionEvidence(
		{
			schema: 1,
			repository: "marius-patrik/DarkFactory",
			candidate_id: "candidate-live-preflight",
			version: "1.0.0",
			capability_abi: "1",
			source: {
				reviewed_sha: sha("a"),
				reviewed_tree: sha("c"),
				final_sha: sha("b"),
				final_tree: sha("c"),
				lock_sha256: digest(readFileSync("bun.lock")),
				pull_request: 2709,
			},
			candidate: { run_id: 401, head_sha: sha("a"), conclusion: "success" },
			targets: names.map((name) => name.replace(/^df-/u, "").replace(/\.exe$/u, "")),
			artifacts: names.flatMap((name) => [name, name + ".tar.gz"]).map((name) => ({ name, sha256: "0".repeat(64) })),
			acceptance: ["source-free", "security", "fleet", "web-ux", "supply-chain", "governed-e2e"].map((name, i) => ({
				name,
				run_id: 500 + i,
				head_sha: sha("a"),
				conclusion: "success",
			})),
			independent_review: { reviewer: "human-reviewer", reviewed_sha: sha("a"), state: "APPROVED" },
			publication_authorization: { state: "pending", actor: null },
		},
		"candidate",
	);
}

const context = {
	token: "mock-token-not-a-secret",
	sourceSha: sha("b"),
	actor: "marius-patrik",
	event: "workflow_dispatch",
	version: "1.0.0",
	runId: 701,
	phase: "candidate" as const,
};

describe("DF-16 live GitHub release promotion negative paths", () => {
	test("automatic execution and non-owner actor cannot promote before network access", async () => {
		const e = evidence();
		await expect(verifyLivePromotion(e, { ...context, event: "push" })).rejects.toThrow("no automatic");
		await expect(verifyLivePromotion(e, { ...context, actor: "github-actions[bot]" })).rejects.toThrow(
			"repository owner",
		);
		await expect(verifyLivePromotion(e, { ...context, sourceSha: sha("f") })).rejects.toThrow("protected final SHA");
	});

	test("remote duplicate version tag blocks even with valid local metadata, rulesets and environment", async () => {
		const e = evidence();
		const paths: string[] = [];
		globalThis.fetch = (async (input: string | URL | Request) => {
			const path = new URL(String(input)).pathname.replace("/repos/marius-patrik/DarkFactory/", "");
			paths.push(path);
			let value: unknown = {};
			switch (path) {
				case "branches/main":
					value = { protected: true, commit: { sha: e.source.final_sha } };
					break;
				case "git/commits/" + e.source.final_sha:
				case "git/commits/" + e.source.reviewed_sha:
					value = { tree: { sha: e.source.reviewed_tree } };
					break;
				case "rulesets":
					value = [
						{ id: 1, target: "branch", enforcement: "active" },
						{ id: 2, target: "tag", enforcement: "active" },
					];
					break;
				case "rulesets/1":
					value = {
						conditions: { ref_name: { include: ["refs/heads/main"] } },
						rules: [
							{
								type: "pull_request",
								parameters: { required_approving_review_count: 1, dismiss_stale_reviews_on_push: true },
							},
							{
								type: "required_status_checks",
								parameters: {
									required_status_checks: ["quality", "verify-bound-issue", "candidate"].map((context) => ({
									context,
								})),
								},
							},
						],
					};
					break;
				case "rulesets/2":
					value = {
						conditions: { ref_name: { include: ["refs/tags/v*"] } },
						rules: [{ type: "update" }, { type: "deletion" }],
						bypass_actors: [],
					};
					break;
				case "environments/production-release":
					value = {
						prevent_self_review: true,
						protection_rules: [{ type: "required_reviewers", reviewers: [{ id: 1 }] }],
					};
					break;
				case "git/ref/tags/v1.0.0":
					value = { ref: "refs/tags/v1.0.0" };
					break;
				default:
					throw new Error("Unexpected mock GitHub path " + path);
			}
			return new Response(JSON.stringify(value), { status: 200 });
		}) as typeof fetch;

		await expect(verifyLivePromotion(e, context)).rejects.toThrow("duplicate immutable tag");
		expect(paths).toContain("git/ref/tags/v1.0.0");
	});
});
