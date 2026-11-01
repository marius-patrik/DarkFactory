import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { RELEASE_TARGETS, releaseAssetNames } from "../../../packages/harness/scripts/release-targets.ts";
import { assertTechnicalCandidate } from "../../../packages/harness/src/release/promotion-evidence.ts";
import {
	verifyLivePromotion,
	type PromotionContext,
} from "../../../packages/harness/src/release/promotion-preflight.ts";

const sha = (s: string) => s.repeat(40);
const digest = (v: Uint8Array | string) => createHash("sha256").update(v).digest("hex");
const oldFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = oldFetch;
});

function candidate() {
	const names = releaseAssetNames();
	return assertTechnicalCandidate({
		schema: 2,
		kind: "technical-candidate",
		repository: "marius-patrik/DarkFactory",
		candidate_id: "df19-valid-candidate",
		version: "1.0.0",
		capability_abi: "1",
		source: { sha: sha("a"), tree: sha("c"), lock_sha256: digest(readFileSync("bun.lock")) },
		build: { run_id: 401, run_attempt: 1, workflow: ".github/workflows/candidate-release.yml" },
		targets: RELEASE_TARGETS.map((t) => t.name),
		artifacts: names.flatMap((n, i) =>
			[n, n + ".tar.gz"].map((name) => ({
				name,
				sha256: digest(name),
				bundle: "candidate-" + RELEASE_TARGETS[i]!.name,
			})),
		),
		acceptance: ["source-free", "security", "fleet", "web-ux", "supply-chain", "governed-e2e"].map((name, i) => ({
			name,
			run_id: i === 0 ? 401 : i + 500,
			head_sha: sha("a"),
			conclusion: "success",
		})),
		provenance: { provider: "github-actions", repository: "marius-patrik/DarkFactory", source_sha: sha("a") },
	});
}
const context: PromotionContext = {
	token: "fake-mock-token",
	sourceSha: sha("b"),
	actor: "marius-patrik",
	event: "workflow_dispatch",
	version: "1.0.0",
	runId: 701,
	phase: "resolve",
};
type Override = Record<string, any>;
function mockLive(a = candidate(), change: Override = {}, published = false): string[] {
	const visited: string[] = [];
	const runIds = new Map(a.acceptance.map((r) => [r.run_id, r.name]));
	globalThis.fetch = (async (input: string | URL | Request) => {
		const path =
			new URL(String(input)).pathname.replace("/repos/marius-patrik/DarkFactory/", "") + new URL(String(input)).search;
		visited.push(path);
		const release = { id: 33, tag_name: "v1.0.0", draft: true, target_commitish: sha("b") };
		const pr = {
			number: 77,
			merged: true,
			merged_at: "2026-11-01T00:00:00Z",
			base: { ref: "main" },
			head: { sha: sha("a"), repo: { full_name: "marius-patrik/DarkFactory" } },
			merge_commit_sha: sha("b"),
			user: { login: "author" },
		};
		let value: any;
		let code = 200;
		if (path === "branches/main") value = { protected: true, commit: { sha: sha("b") } };
		else if (path === "git/commits/" + sha("a") || path === "git/commits/" + sha("b"))
			value = { tree: { sha: sha("c") } };
		else if (path === "rulesets?per_page=100")
			value = [
				{ id: 1, target: "branch", enforcement: "active" },
				{ id: 2, target: "tag", enforcement: "active" },
			];
		else if (path === "rulesets/1")
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
							required_status_checks: ["quality", "verify-bound-issue", "candidate"].map((context) => ({ context })),
						},
					},
				],
				bypass_actors: [],
			};
		else if (path === "rulesets/2")
			value = {
				conditions: { ref_name: { include: ["refs/tags/v*"] } },
				rules: [{ type: "update" }, { type: "deletion" }],
				bypass_actors: [],
			};
		else if (path === "environments/production-release")
			value = {
				protection_rules: [{ type: "required_reviewers", prevent_self_review: true, reviewers: [{ id: 10 }] }],
			};
		else if (/^actions\/runs\/\d+$/.test(path)) {
			const id = Number(path.split("/")[2]);
			value = {
				id,
				conclusion: "success",
				status: "completed",
				head_sha: sha("a"),
				run_attempt: 1,
				path: id === 401 ? ".github/workflows/candidate-release.yml@refs/heads/agent" : "ci.yml",
				repository: { full_name: "marius-patrik/DarkFactory" },
			};
		} else if (/^actions\/runs\/\d+\/jobs\?per_page=100$/.test(path)) {
			const id = Number(path.split("/")[2]);
			value = {
				jobs: [
					{
						name: runIds.get(id) === "source-free" ? "candidate" : runIds.get(id),
						conclusion: "success",
						status: "completed",
						head_sha: sha("a"),
						run_attempt: 1,
					},
				],
			};
		} else if (path === "actions/runs/401/artifacts?per_page=100") {
			const names = ["technical-candidate", ...RELEASE_TARGETS.map((t) => "candidate-" + t.name)];
			value = {
				total_count: names.length,
				artifacts: names.map((name, i) => ({
					id: i + 1,
					name,
					expired: false,
					size_in_bytes: 100,
					workflow_run: { id: 401 },
				})),
			};
		} else if (path === "commits/" + sha("b") + "/pulls?per_page=100") value = [pr];
		else if (path === "pulls/77") value = pr;
		else if (path === "pulls/77/reviews?per_page=100")
			value = [{ id: 90, state: "APPROVED", commit_id: sha("a"), user: { login: "human-reviewer", type: "User" } }];
		else if (path === "commits/" + sha("b") + "/check-runs?per_page=100")
			value = {
				total_count: 3,
				check_runs: ["quality", "verify-bound-issue", "candidate"].map((name) => ({
					name,
					head_sha: sha("b"),
					status: "completed",
					conclusion: "success",
				})),
			};
		else if (path === "actions/runs/701/approvals")
			value = [
				{
					state: "approved",
					user: { type: "User", login: "external-approver" },
					environments: [{ name: "production-release" }],
				},
			];
		else if (path === "git/ref/tags/v1.0.0") {
			if (published) value = { ref: "refs/tags/v1.0.0", object: { type: "commit", sha: sha("b") } };
			else code = 404;
		} else if (path === "releases/tags/v1.0.0") {
			if (published) value = release;
			else code = 404;
		} else throw new Error("Unexpected mocked endpoint: " + path);
		if (path in change) {
			const override = change[path];
			if (override === "HTTP 503") code = 503;
			else {
				value = override;
				code = 200;
			}
		}
		return new Response(JSON.stringify(value ?? { message: "missing" }), { status: code });
	}) as typeof fetch;
	return visited;
}
describe("DF-19 live GitHub governance transitions (fully mocked REST, never publishes)", () => {
	test("legitimate merge-equivalent candidate: resolve, human seal, publish and finalize", async () => {
		const a = candidate();
		const calls = mockLive(a);
		expect(await verifyLivePromotion(a, context)).toBeUndefined();
		const b = await verifyLivePromotion(a, { ...context, phase: "seal" }, undefined, "d".repeat(64));
		expect(b?.source.final_sha).toBe(sha("b"));
		expect(b?.authorization.approver).toBe("external-approver");
		expect(await verifyLivePromotion(a, { ...context, phase: "publish" }, b, "d".repeat(64))).toEqual(b);
		mockLive(a, {}, true);
		expect(await verifyLivePromotion(a, { ...context, phase: "finalize" }, b, "d".repeat(64))).toEqual(b);
		expect(calls).toContain("actions/runs/401/artifacts?per_page=100");
	});
	test("rejects unmerged PR, premerge dispatch and unrelated final merge", async () => {
		const a = candidate();
		mockLive(a, { ["commits/" + sha("b") + "/pulls?per_page=100"]: [] });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("merged PR");
		mockLive(a, { "pulls/77": { merged: false } });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("unmerged");
		mockLive(a, { "branches/main": { protected: true, commit: { sha: sha("f") } } });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("protected main");
	});
	test("rejects stale review or rejected review without trusting sealed JSON", async () => {
		const a = candidate();
		mockLive(a, {
			"pulls/77/reviews?per_page=100": [
				{ id: 90, state: "APPROVED", commit_id: sha("f"), user: { login: "human-reviewer", type: "User" } },
			],
		});
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("independent human");
	});
	test("rejects different merged tree, changed lockfile and unauthorized actor", async () => {
		const a = candidate();
		mockLive(a, { ["git/commits/" + sha("b")]: { tree: { sha: sha("f") } } });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("trees differ");
		const x = candidate();
		x.source.lock_sha256 = "e".repeat(64);
		await expect(verifyLivePromotion(x, context)).rejects.toThrow("lockfile");
		await expect(verifyLivePromotion(a, { ...context, actor: "bad-actor" })).rejects.toThrow("unauthorized");
		await expect(verifyLivePromotion(a, { ...context, event: "push" })).rejects.toThrow("automatic");
	});
	test("rejects failed, pending, skipped acceptance and replaced candidate artifacts", async () => {
		const a = candidate();
		for (const conclusion of ["failure", null, "skipped"]) {
			mockLive(a, {
				"actions/runs/501": {
					conclusion,
					status: "completed",
					head_sha: sha("a"),
					repository: { full_name: "marius-patrik/DarkFactory" },
				},
			});
			await expect(verifyLivePromotion(a, context)).rejects.toThrow("run 501");
		}
		mockLive(a, { "actions/runs/401/artifacts?per_page=100": { total_count: 0, artifacts: [] } });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("candidate run artifacts");
	});
	test("rejects pending final-head check, missing environment, unauthorized approval and tag reuse", async () => {
		const a = candidate();
		mockLive(a, {
			["commits/" + sha("b") + "/check-runs?per_page=100"]: {
				total_count: 1,
				check_runs: [{ name: "quality", status: "in_progress", conclusion: null, head_sha: sha("b") }],
			},
		});
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("final-head check");
		mockLive(a, { "environments/production-release": { protection_rules: [] } });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("protected publication environment");
		mockLive(a, { "environments/production-release": { protection_rules: [{ type: "required_reviewers", prevent_self_review: false, reviewers: [{ id: 10 }] }] } });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("protected publication environment");
		mockLive(a, { "actions/runs/701/approvals": [] });
		await expect(verifyLivePromotion(a, { ...context, phase: "seal" }, undefined, "d".repeat(64))).rejects.toThrow(
			"independent protected-environment",
		);
		mockLive(a, { "git/ref/tags/v1.0.0": { ref: "refs/tags/v1.0.0" } });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("duplicate immutable tag");
	});
	test("ambiguous/failed API response must fail closed", async () => {
		const a = candidate();
		mockLive(a, { "branches/main": "HTTP 503" });
		await expect(verifyLivePromotion(a, context)).rejects.toThrow("HTTP 503");
	});
});
