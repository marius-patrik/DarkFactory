import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { releaseAssetNames } from "../../../packages/harness/scripts/release-targets.ts";
import {
	assertArtifactBytes,
	assertPromotionEvidence,
} from "../../../packages/harness/src/release/promotion-evidence.ts";

const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const sha = (c: string) => c.repeat(40);
const targets = releaseAssetNames().map((name) => name.replace(/^df-/u, "").replace(/\.exe$/u, ""));
const fileNames = releaseAssetNames().flatMap((name) => [name, name + ".tar.gz"]);

function evidence() {
	return {
		schema: 1,
		repository: "marius-patrik/DarkFactory",
		candidate_id: "df17-candidate-001",
		version: "1.0.0",
		capability_abi: "1",
		source: {
			reviewed_sha: sha("a"),
			reviewed_tree: sha("c"),
			final_sha: sha("b"),
			final_tree: sha("c"),
			lock_sha256: "d".repeat(64),
			pull_request: 2709,
		},
		candidate: { run_id: 404, head_sha: sha("a"), conclusion: "success" },
		targets: [...targets],
		artifacts: fileNames.map((name) => ({ name, sha256: digest(name) })),
		acceptance: ["source-free", "security", "fleet", "web-ux", "supply-chain", "governed-e2e"].map((name, i) => ({
			name,
			run_id: i + 405,
			head_sha: sha("a"),
			conclusion: "success",
		})),
		independent_review: { reviewer: "independent-reviewer", reviewed_sha: sha("a"), state: "APPROVED" },
		publication_authorization: { state: "pending", actor: null as string | null },
	};
}

describe("DF-16 fail-closed release candidate evidence", () => {
	test("accepts complete pending candidate but not pending publication", () => {
		const e = evidence();
		expect(assertPromotionEvidence(e, "candidate").version).toBe("1.0.0");
		expect(() => assertPromotionEvidence(e, "publish")).toThrow("human authorization pending");
		// The candidate cannot foresee final human approval. Only a live GitHub
		// environment readback (not the manifest) may authorize the transition.
		expect(assertPromotionEvidence(e, "publish", true).version).toBe("1.0.0");
		e.publication_authorization = { state: "approved", actor: "marius-patrik" };
		expect(assertPromotionEvidence(e, "publish").version).toBe("1.0.0");
	});
	test("rejects missing mandatory security/fleet and skipped acceptance", () => {
		const e = evidence();
		e.acceptance = e.acceptance.filter((r) => r.name !== "fleet");
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("fleet");
		e.acceptance = evidence().acceptance;
		e.acceptance[1]!.conclusion = "skipped";
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("skipped");
	});
	test("rejects stale approval or mismatched reviewed SHA", () => {
		const e = evidence();
		e.independent_review.reviewed_sha = sha("f");
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("stale reviewer");
		e.independent_review.reviewed_sha = sha("a");
		e.source.final_tree = sha("b");
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("trees differ");
	});
	test("rejects unsupported ABI and nonstable production versions", () => {
		const e = evidence();
		e.capability_abi = "2";
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("ABI");
		e.capability_abi = "1";
		for (const v of ["0.292.5", "1.0.0-rc.1", "01.0.0", "1.0", "latest"]) {
			e.version = v;
			expect(() => assertPromotionEvidence(e, "candidate")).toThrow();
		}
	});
	test("rejects unknown targets, missing binary, duplicate or malformed digests", () => {
		const e = evidence();
		e.targets.splice(0, 1);
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("target");
		e.targets = [...targets];
		e.artifacts.pop();
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("archive");
		e.artifacts = evidence().artifacts;
		e.artifacts[0]!.sha256 = "invalid";
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("digest");
	});
	test("rejects changed bytes, unreviewed extras and partial uploads", () => {
		const e = assertPromotionEvidence(evidence(), "candidate");
		const files = fileNames.map((name) => ({ name, bytes: Buffer.from(name) }));
		expect(() => assertArtifactBytes(e, files)).not.toThrow();
		const altered = [...files];
		altered[0] = { name: files[0]!.name, bytes: Buffer.from("corrupted") };
		expect(() => assertArtifactBytes(e, altered)).toThrow("digest mismatch");
		expect(() => assertArtifactBytes(e, files.slice(1))).toThrow("partial publication");
		expect(() => assertArtifactBytes(e, [...files, { name: "malicious", bytes: Buffer.from("x") }])).toThrow();
	});
	test("rejects duplicate candidate asset names and stale source-free CI", () => {
		const e = evidence();
		e.artifacts[1]!.name = e.artifacts[0]!.name;
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("duplicate artifact");
		e.artifacts = evidence().artifacts;
		e.candidate.head_sha = sha("e");
		expect(() => assertPromotionEvidence(e, "candidate")).toThrow("candidate not successful");
	});
});
