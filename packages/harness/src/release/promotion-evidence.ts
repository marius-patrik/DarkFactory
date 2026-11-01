import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CAPABILITY_ABI_VERSION } from "../../../capability/src/abi.ts";
import { RELEASE_TARGETS, releaseAssetNames } from "../../scripts/release-targets.ts";

/** DF-19: Stage A is immutable pre-merge technical evidence. Stage B is a separate post-merge seal. */
export const REQUIRED_ACCEPTANCE = [
	"source-free",
	"security",
	"fleet",
	"web-ux",
	"supply-chain",
	"governed-e2e",
] as const;
export const REQUIRED_FINAL_CHECKS = ["quality", "verify-bound-issue", "candidate"] as const;
export const REPOSITORY = "marius-patrik/DarkFactory";
const SHA = /^[0-9a-f]{40}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const STABLE = /^[1-9]\d*\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/u;

export interface EvidenceRun {
	name: string;
	run_id: number;
	head_sha: string;
}
export interface EvidenceAsset {
	name: string;
	sha256: string;
	bundle: string;
}
export interface TechnicalCandidate {
	schema: 2;
	kind: "technical-candidate";
	repository: string;
	candidate_id: string;
	version: string;
	capability_abi: string;
	source: { sha: string; tree: string; lock_sha256: string };
	build: { run_id: number; run_attempt: number; workflow: string };
	targets: string[];
	artifacts: EvidenceAsset[];
	acceptance: EvidenceRun[];
	provenance: { provider: "github-actions"; repository: string; source_sha: string };
}
export interface PromotionEvidence {
	schema: 2;
	kind: "promotion-evidence";
	repository: string;
	candidate_id: string;
	technical_sha256: string;
	source: {
		reviewed_sha: string;
		reviewed_tree: string;
		final_sha: string;
		final_tree: string;
		pull_request: number;
	};
	review: { id: number; reviewer: string; commit_sha: string };
	final_checks: string[];
	authorization: { run_id: number; approver: string; environment: "production-release" };
}

export function requireCondition(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error("Release promotion blocked: " + message);
}
function record(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function sha(value: unknown): value is string {
	return typeof value === "string" && SHA.test(value);
}
export function runId(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
export function digestOf(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}
export function fileDigest(path: string): string {
	return digestOf(readFileSync(path));
}
export function releaseAssetBundles(e: TechnicalCandidate): string[] {
	return [...new Set(e.artifacts.map((asset) => asset.bundle))].sort();
}
/** A may be written while its own build run is still in progress. Conclusions are checked live later. */
export function assertTechnicalCandidate(value: unknown): TechnicalCandidate {
	requireCondition(
		record(value) && value.schema === 2 && value.kind === "technical-candidate",
		"invalid technical candidate schema",
	);
	const e = value as unknown as TechnicalCandidate;
	requireCondition(e.repository === REPOSITORY, "wrong repository");
	requireCondition(
		typeof e.candidate_id === "string" && /^[a-zA-Z0-9._-]{8,128}$/u.test(e.candidate_id),
		"invalid candidate ID",
	);
	requireCondition(typeof e.version === "string" && STABLE.test(e.version), "invalid stable SemVer");
	requireCondition(e.capability_abi === CAPABILITY_ABI_VERSION, "unsupported capability ABI");
	requireCondition(record(e.source) && sha(e.source.sha) && sha(e.source.tree), "missing source SHA/tree");
	requireCondition(
		typeof e.source.lock_sha256 === "string" && DIGEST.test(e.source.lock_sha256),
		"invalid dependency lock digest",
	);
	requireCondition(
		record(e.build) &&
			runId(e.build.run_id) &&
			runId(e.build.run_attempt) &&
			e.build.workflow === ".github/workflows/candidate-release.yml",
		"invalid candidate build identity",
	);
	requireCondition(
		record(e.provenance) &&
			e.provenance.provider === "github-actions" &&
			e.provenance.repository === REPOSITORY &&
			e.provenance.source_sha === e.source.sha,
		"invalid candidate provenance",
	);
	const targets = RELEASE_TARGETS.map((target) => target.name);
	requireCondition(
		Array.isArray(e.targets) &&
			e.targets.length === targets.length &&
			new Set(e.targets).size === targets.length &&
			targets.every((target) => e.targets.includes(target)),
		"missing or unsupported release target",
	);
	requireCondition(
		Array.isArray(e.acceptance) && e.acceptance.length === REQUIRED_ACCEPTANCE.length,
		"missing technical acceptance outcomes",
	);
	for (const name of REQUIRED_ACCEPTANCE) {
		const matching = e.acceptance.filter((r) => r?.name === name);
		requireCondition(
			matching.length === 1 && runId(matching[0]?.run_id) && matching[0]?.head_sha === e.source.sha,
			"missing/stale technical acceptance: " + name,
		);
	}
	requireCondition(Array.isArray(e.artifacts), "missing candidate artifact inventory");
	const seen = new Set<string>();
	for (const item of e.artifacts) {
		requireCondition(
			item &&
				typeof item.name === "string" &&
				SAFE_NAME.test(item.name) &&
				typeof item.sha256 === "string" &&
				DIGEST.test(item.sha256),
			"invalid asset name/digest",
		);
		requireCondition(!seen.has(item.name), "duplicate asset identity: " + item.name);
		seen.add(item.name);
		const expectedTarget = RELEASE_TARGETS.find(
			(t) =>
				item.name === releaseAssetNames()[targets.indexOf(t.name)] ||
				item.name === releaseAssetNames()[targets.indexOf(t.name)] + ".tar.gz",
		);
		requireCondition(
			item.bundle === (expectedTarget ? "candidate-" + expectedTarget.name : "candidate-extra"),
			"asset assigned to unauthorized bundle: " + item.name,
		);
	}
	for (const name of releaseAssetNames()) {
		requireCondition(seen.has(name) && seen.has(name + ".tar.gz"), "missing mandatory binary/archive: " + name);
	}
	return e;
}
/** B cannot change A. A's exact SHA-256 and verified GitHub events are the promotion inputs. */
export function assertPromotionEvidence(
	value: unknown,
	a: TechnicalCandidate,
	technicalDigest: string,
): PromotionEvidence {
	requireCondition(
		record(value) && value.schema === 2 && value.kind === "promotion-evidence",
		"missing sealing evidence",
	);
	const b = value as unknown as PromotionEvidence;
	requireCondition(
		b.repository === REPOSITORY &&
			b.candidate_id === a.candidate_id &&
			DIGEST.test(technicalDigest) &&
			b.technical_sha256 === technicalDigest,
		"replaced technical candidate",
	);
	requireCondition(
		record(b.source) &&
			b.source.reviewed_sha === a.source.sha &&
			b.source.reviewed_tree === a.source.tree &&
			sha(b.source.final_sha) &&
			sha(b.source.final_tree) &&
			b.source.reviewed_tree === b.source.final_tree &&
			runId(b.source.pull_request),
		"reviewed/final tree identity mismatch",
	);
	requireCondition(
		record(b.review) &&
			runId(b.review.id) &&
			b.review.commit_sha === a.source.sha &&
			typeof b.review.reviewer === "string" &&
			b.review.reviewer.length > 0 &&
			!b.review.reviewer.endsWith("[bot]"),
		"missing/stale independent reviewer",
	);
	requireCondition(
		Array.isArray(b.final_checks) &&
			b.final_checks.length === REQUIRED_FINAL_CHECKS.length &&
			REQUIRED_FINAL_CHECKS.every((name) => b.final_checks.includes(name)),
		"missing final-head checks",
	);
	requireCondition(
		record(b.authorization) &&
			runId(b.authorization.run_id) &&
			b.authorization.environment === "production-release" &&
			typeof b.authorization.approver === "string" &&
			b.authorization.approver.length > 0 &&
			!b.authorization.approver.endsWith("[bot]"),
		"invalid publication authorization seal",
	);
	return b;
}
export function assertArtifactBytes(
	a: TechnicalCandidate,
	files: readonly { name: string; bytes: Uint8Array }[],
): void {
	const expected = new Map(a.artifacts.map((asset) => [asset.name, asset.sha256]));
	requireCondition(files.length === expected.size, "partial publication or unreviewed assets");
	const seen = new Set<string>();
	for (const file of files) {
		requireCondition(!seen.has(file.name), "duplicate asset upload");
		seen.add(file.name);
		requireCondition(expected.has(file.name), "unreviewed additional asset: " + file.name);
		requireCondition(digestOf(file.bytes) === expected.get(file.name), "artifact digest mismatch: " + file.name);
	}
}
export function readTechnicalCandidate(path: string, digest: string): TechnicalCandidate {
	requireCondition(DIGEST.test(digest) && fileDigest(path) === digest, "technical candidate digest mismatch");
	return assertTechnicalCandidate(JSON.parse(readFileSync(path, "utf8")));
}
