import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CAPABILITY_ABI_VERSION } from "../../../capability/src/abi.ts";
import { releaseAssetNames } from "../../scripts/release-targets.ts";

/**
 * DF-16/DF-17 immutable handoff. A producer may state evidence, but the release
 * gate independently checks GitHub's authoritative runs, reviews and branch head.
 */
const SHA = /^[0-9a-f]{40}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const REQUIRED = ["source-free", "security", "fleet", "web-ux", "supply-chain", "governed-e2e"] as const;

interface EvidenceRun {
	name: string;
	run_id: number;
	head_sha: string;
	conclusion: string;
}

interface EvidenceAsset {
	name: string;
	sha256: string;
}

export interface PromotionEvidence {
	schema: 1;
	repository: string;
	candidate_id: string;
	version: string;
	capability_abi: string;
	source: {
		reviewed_sha: string;
		reviewed_tree: string;
		final_sha: string;
		final_tree: string;
		lock_sha256: string;
		pull_request: number;
	};
	candidate: {
		run_id: number;
		head_sha: string;
		conclusion: string;
	};
	targets: string[];
	artifacts: EvidenceAsset[];
	acceptance: EvidenceRun[];
	independent_review: {
		reviewer: string;
		reviewed_sha: string;
		state: string;
	};
	publication_authorization: { state: "pending" | "approved"; actor: string | null };
}

function requireCondition(ok: unknown, message: string): asserts ok {
	if (!ok) throw new Error("Release promotion blocked: " + message);
}

function isRecord(data: unknown): data is Record<string, unknown> {
	return data !== null && typeof data === "object" && !Array.isArray(data);
}

function sha(value: unknown): value is string {
	return typeof value === "string" && SHA.test(value);
}

function runId(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function safeAsset(name: unknown): name is string {
	return typeof name === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/u.test(name);
}

/** Validates all non-forgeable structural constraints before contacting GitHub. */
export function assertPromotionEvidence(value: unknown, phase: "candidate" | "publish"): PromotionEvidence {
	requireCondition(isRecord(value) && value.schema === 1, "unsupported evidence schema");
	const e = value as unknown as PromotionEvidence;
	requireCondition(e.repository === "marius-patrik/DarkFactory", "wrong repository");
	requireCondition(typeof e.candidate_id === "string" && /^[a-zA-Z0-9._-]{8,128}$/u.test(e.candidate_id), "invalid candidate identity");
	requireCondition(typeof e.version === "string" && STABLE.test(e.version), "invalid stable SemVer");
	requireCondition(e.version !== "0.0.0" && !e.version.startsWith("0."), "production must be stable SemVer");
	requireCondition(e.capability_abi === CAPABILITY_ABI_VERSION, "unsupported capability ABI");
	requireCondition(isRecord(e.source), "missing source identity");
	requireCondition(sha(e.source.reviewed_sha) && sha(e.source.reviewed_tree), "missing reviewed source/tree");
	requireCondition(sha(e.source.final_sha) && sha(e.source.final_tree), "missing final protected source/tree");
	requireCondition(e.source.reviewed_tree === e.source.final_tree, "reviewed and final trees differ; no content-equivalence proof");
	requireCondition(typeof e.source.lock_sha256 === "string" && DIGEST.test(e.source.lock_sha256), "missing lockfile digest");
	requireCondition(runId(e.source.pull_request), "missing reviewed PR");
	requireCondition(isRecord(e.candidate) && runId(e.candidate.run_id), "missing candidate run");
	requireCondition(e.candidate.head_sha === e.source.reviewed_sha && e.candidate.conclusion === "success", "candidate not successful on reviewed SHA");
	requireCondition(isRecord(e.independent_review) && e.independent_review.state === "APPROVED", "independent review missing");
	requireCondition(e.independent_review.reviewed_sha === e.source.reviewed_sha, "stale reviewer identity");
	requireCondition(typeof e.independent_review.reviewer === "string" && !e.independent_review.reviewer.endsWith("[bot]"), "reviewer must be human");
	requireCondition(isRecord(e.publication_authorization), "missing authorization record");
	requireCondition(["pending", "approved"].includes(e.publication_authorization.state), "invalid authorization state");
	if (phase === "publish") {
		requireCondition(e.publication_authorization.state === "approved", "human authorization pending");
		requireCondition(typeof e.publication_authorization.actor === "string" && !e.publication_authorization.actor.endsWith("[bot]"), "unauthorized actor");
	}
	requireCondition(Array.isArray(e.acceptance), "missing acceptance records");
	for (const name of REQUIRED) {
		const matches = e.acceptance.filter((run) => run?.name === name);
		requireCondition(matches.length === 1, "missing/duplicated acceptance: " + name);
		const run = matches[0]!;
		requireCondition(runId(run.run_id) && run.conclusion === "success" && run.head_sha === e.source.reviewed_sha, "failed, skipped or stale acceptance: " + name);
	}
	requireCondition(e.acceptance.length === REQUIRED.length, "unknown acceptance run");
	const names = releaseAssetNames();
	const targets = names.map((name) => name.replace(/^df-/u, "").replace(/\.exe$/u, ""));
	requireCondition(Array.isArray(e.targets) && e.targets.length === targets.length && new Set(e.targets).size === targets.length, "invalid official target set");
	requireCondition(targets.every((target) => e.targets.includes(target)), "missing official release target");
	requireCondition(Array.isArray(e.artifacts), "missing artifact digest inventory");
	const got = new Set<string>();
	for (const item of e.artifacts) {
		requireCondition(item && safeAsset(item.name) && typeof item.sha256 === "string" && DIGEST.test(item.sha256), "invalid artifact name/digest");
		requireCondition(!got.has(item.name), "duplicate artifact: " + item.name);
		got.add(item.name);
	}
	for (const name of names) {
		requireCondition(got.has(name) && got.has(name + ".tar.gz"), "missing native artifact or archive: " + name);
	}
	return e;
}

/** Compare every prepared distribution byte with the reviewed candidate inventory. */
export function assertArtifactBytes(e: PromotionEvidence, files: readonly { name: string; bytes: Uint8Array }[]): void {
	const recorded = new Map(e.artifacts.map((asset) => [asset.name, asset.sha256]));
	requireCondition(files.length === recorded.size, "partial publication or extra unreviewed asset");
	const seen = new Set<string>();
	for (const file of files) {
		requireCondition(!seen.has(file.name), "duplicate upload: " + file.name);
		seen.add(file.name);
		const expected = recorded.get(file.name);
		requireCondition(expected, "unreviewed upload asset: " + file.name);
		requireCondition(createHash("sha256").update(file.bytes).digest("hex") === expected, "artifact digest mismatch: " + file.name);
	}
}

/** Validate a saved artifact without executing any scripts from its producer. */
export function readPromotionEvidence(path: string, digest: string): PromotionEvidence {
	requireCondition(DIGEST.test(digest), "missing/invalid evidence SHA-256");
	const bytes = readFileSync(path);
	requireCondition(createHash("sha256").update(bytes).digest("hex") === digest, "evidence digest mismatch");
	return assertPromotionEvidence(JSON.parse(bytes.toString("utf8")), "candidate");
}
