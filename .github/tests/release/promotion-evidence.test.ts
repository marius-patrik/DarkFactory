import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { RELEASE_TARGETS, releaseAssetNames } from "../../../packages/harness/scripts/release-targets.ts";
import {
	assertArtifactBytes,
	assertPromotionEvidence,
	assertTechnicalCandidate,
	type PromotionEvidence,
} from "../../../packages/harness/src/release/promotion-evidence.ts";
import { assertRemoteDraft } from "../../../packages/harness/src/release/promotion-assets.ts";

export const sha = (c: string) => c.repeat(40);
export const digest = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");
export function technical() {
	const names = releaseAssetNames();
	return {
		schema: 2,
		kind: "technical-candidate",
		repository: "marius-patrik/DarkFactory",
		candidate_id: "df17-premerge-001",
		version: "1.0.0",
		capability_abi: "1",
		source: { sha: sha("a"), tree: sha("c"), lock_sha256: digest(readFileSync("bun.lock")) },
		build: { run_id: 401, run_attempt: 1, workflow: ".github/workflows/candidate-release.yml" },
		targets: RELEASE_TARGETS.map((t) => t.name),
		artifacts: names.flatMap((name, i) =>
			[name, name + ".tar.gz"].map((asset) => ({
				name: asset,
				sha256: digest(asset),
				bundle: "candidate-" + RELEASE_TARGETS[i]!.name,
			})),
		),
		acceptance: ["source-free", "security", "fleet", "web-ux", "supply-chain", "governed-e2e"].map((name, i) => ({
			name,
			run_id: i === 0 ? 401 : 500 + i,
			head_sha: sha("a"),
			conclusion: "success",
		})),
		provenance: { provider: "github-actions", repository: "marius-patrik/DarkFactory", source_sha: sha("a") },
	};
}
export function sealed(a = assertTechnicalCandidate(technical())): PromotionEvidence {
	return {
		schema: 2,
		kind: "promotion-evidence",
		repository: "marius-patrik/DarkFactory",
		candidate_id: a.candidate_id,
		technical_sha256: "d".repeat(64),
		source: {
			reviewed_sha: a.source.sha,
			reviewed_tree: a.source.tree,
			final_sha: sha("b"),
			final_tree: a.source.tree,
			pull_request: 77,
		},
		review: { id: 90, reviewer: "human-reviewer", commit_sha: a.source.sha },
		final_checks: ["quality", "verify-bound-issue", "candidate"],
		authorization: { run_id: 701, approver: "external-approver", environment: "production-release" },
	};
}
describe("DF-19 immutable Stage A / postmerge Stage B contract", () => {
	test("a valid candidate is possible before final commit, PR or human review exists", () => {
		const a = assertTechnicalCandidate(technical());
		expect(a.source.sha).toBe(sha("a"));
		expect("final_sha" in a.source).toBe(false);
		expect("publication_authorization" in a).toBe(false);
		expect("independent_review" in a).toBe(false);
	});
	test("no seal or replaced candidate cannot authorize publication", () => {
		const a = assertTechnicalCandidate(technical());
		expect(() => assertPromotionEvidence(undefined, a, "d".repeat(64))).toThrow("missing sealing");
		const b = sealed(a);
		expect(assertPromotionEvidence(b, a, "d".repeat(64))).toEqual(b);
		expect(() => assertPromotionEvidence(b, a, "e".repeat(64))).toThrow("replaced");
		b.source.final_tree = sha("f");
		expect(() => assertPromotionEvidence(b, a, "d".repeat(64))).toThrow("tree");
	});
	test("rejects missing native, unknown targets, wrong bundles and stale/failed or incomplete acceptance", () => {
		const fixture = technical();
		fixture.artifacts.pop();
		expect(() => assertTechnicalCandidate(fixture)).toThrow("binary/archive");
		fixture.artifacts = technical().artifacts;
		fixture.artifacts[0]!.bundle = "candidate-extra";
		expect(() => assertTechnicalCandidate(fixture)).toThrow("unauthorized bundle");
		fixture.artifacts = technical().artifacts;
		fixture.targets.pop();
		expect(() => assertTechnicalCandidate(fixture)).toThrow("target");
		fixture.targets = technical().targets;
		fixture.acceptance[0]!.head_sha = sha("f");
		expect(() => assertTechnicalCandidate(fixture)).toThrow("technical acceptance");
		fixture.acceptance = technical().acceptance;
		fixture.acceptance[0]!.conclusion = "skipped";
		expect(() => assertTechnicalCandidate(fixture)).toThrow("technical acceptance");
	});
	test("rejects changed lockfile identity, unsupported ABI and malformed version", () => {
		const fixture = technical();
		fixture.source.lock_sha256 = "bad";
		expect(() => assertTechnicalCandidate(fixture)).toThrow("lock");
		fixture.source = technical().source;
		fixture.capability_abi = "999";
		expect(() => assertTechnicalCandidate(fixture)).toThrow("ABI");
		fixture.capability_abi = "1";
		fixture.version = "1.0.0-rc1";
		expect(() => assertTechnicalCandidate(fixture)).toThrow("SemVer");
	});
	test("detects mutated bytes, duplicate local assets, missing or additional assets", () => {
		const a = assertTechnicalCandidate(technical());
		const files = a.artifacts.map((asset) => ({ name: asset.name, bytes: Buffer.from(asset.name) }));
		expect(() => assertArtifactBytes(a, files)).not.toThrow();
		expect(() => assertArtifactBytes(a, files.slice(1))).toThrow("partial");
		expect(() => assertArtifactBytes(a, [...files, files[0]!])).toThrow();
		expect(() =>
			assertArtifactBytes(a, [...files.slice(1), { name: files[0]!.name, bytes: Buffer.from("tampered") }]),
		).toThrow("digest");
		expect(() => assertArtifactBytes(a, [...files, { name: "unapproved", bytes: Buffer.from("x") }])).toThrow();
	});
	test("checks GitHub's uploaded remote asset digest, identity, cardinality and state", () => {
		const a = assertTechnicalCandidate(technical());
		const b = sealed(a);
		const release = { draft: true, tag_name: "v1.0.0", target_commitish: sha("b") };
		const assets = a.artifacts.map((asset, i) => ({
			id: i + 1,
			name: asset.name,
			state: "uploaded",
			size: 100,
			digest: "sha256:" + asset.sha256,
		}));
		expect(() => assertRemoteDraft(a, b, release, assets)).not.toThrow();
		expect(() => assertRemoteDraft(a, b, release, assets.slice(1))).toThrow("partial");
		const changed = structuredClone(assets);
		changed[0]!.digest = "sha256:" + "f".repeat(64);
		expect(() => assertRemoteDraft(a, b, release, changed)).toThrow("checksum");
		changed[0] = { ...assets[0]!, name: "evil" };
		expect(() => assertRemoteDraft(a, b, release, changed)).toThrow("unreviewed");
		expect(() => assertRemoteDraft(a, b, { ...release, draft: false }, assets)).toThrow("draft");
	});
});
