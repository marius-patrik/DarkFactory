/** Produce DF-19's canonical, immutable Stage A manifest from real CI and candidate bytes. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { CAPABILITY_ABI_VERSION } from "../../capability/src/abi.ts";
import {
	assertTechnicalCandidate,
	REPOSITORY,
	REQUIRED_ACCEPTANCE,
	type EvidenceAsset,
	type EvidenceRun,
	type TechnicalCandidate,
} from "../src/release/promotion-evidence.ts";
import { collectReleaseChecksums } from "./release-checksums.ts";
import { RELEASE_TARGETS, releaseAssetName } from "./release-targets.ts";

const root = resolve(import.meta.dir, "../../..");
const workflow = ".github/workflows/candidate-release.yml";
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const integer = (value: string | undefined, label: string): number => {
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`Invalid ${label}`);
	return number;
};
const option = (flag: string, fallback: string): string => {
	const index = process.argv.indexOf(flag);
	return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};
function requireValue(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(`Candidate evidence rejected: ${message}`);
}
function git(arg: string): string {
	return execFileSync("git", ["rev-parse", arg], { cwd: root, encoding: "utf8" }).trim();
}
async function github(path: string, token: string): Promise<any> {
	const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/${path}`, {
		headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
	});
	requireValue(response.ok, `GitHub ${path} returned ${response.status}`);
	return response.json();
}
async function files(directory: string): Promise<string[]> {
	return (await readdir(directory, { withFileTypes: true }))
		.map((entry) => {
			requireValue(entry.isFile(), `Extra bundle must contain flat regular files: ${entry.name}`);
			requireValue(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/u.test(entry.name), "Unsafe release asset name");
			return entry.name;
		})
		.sort();
}
async function asset(directory: string, name: string, bundle: string): Promise<EvidenceAsset> {
	const bytes = await readFile(join(directory, name));
	requireValue(bytes.length > 0, `Empty asset: ${name}`);
	return { name, sha256: sha256(bytes), bundle };
}
async function verifiedJobs(runId: number, attempt: number, sourceSha: string, token: string): Promise<EvidenceRun[]> {
	const run = await github(`actions/runs/${runId}`, token);
	requireValue(
		run.head_sha === sourceSha &&
			run.run_attempt === attempt &&
			run.repository?.full_name === REPOSITORY &&
			run.path?.split("@")[0] === workflow &&
			run.status === "in_progress",
		"Producing run identity does not match source and workflow",
	);
	const result = await github(`actions/runs/${runId}/jobs?per_page=100`, token);
	requireValue(Array.isArray(result.jobs) && result.total_count <= 100, "Incomplete job provenance");
	const jobs = result.jobs as Array<{
		name: string;
		head_sha: string;
		run_attempt?: number;
		status: string;
		conclusion: string | null;
	}>;
	for (const target of RELEASE_TARGETS) {
		const name = `Native executable - ${target.name}`;
		requireValue(
			jobs.some((job) => job.name === name && job.head_sha === sourceSha && job.conclusion === "success"),
			`No passing actual-run native job for ${target.name}`,
		);
	}
	return REQUIRED_ACCEPTANCE.map((name) => {
		const jobName = name === "source-free" ? "candidate" : name;
		const matching = jobs.filter((job) => job.name === jobName && job.head_sha === sourceSha);
		requireValue(matching.length === 1, `Missing/nonunique CI job: ${jobName}`);
		const job = matching[0]!;
		requireValue(job.run_attempt === undefined || job.run_attempt === attempt, `Wrong attempt: ${jobName}`);
		requireValue(job.status === "completed" && job.conclusion === "success", `Failed CI job: ${jobName}`);
		return { name, run_id: runId, head_sha: sourceSha, conclusion: "success" as const };
	});
}
async function main(): Promise<void> {
	requireValue(process.env.GITHUB_ACTIONS === "true", "Stage A can only be produced by actual GitHub Actions");
	requireValue(process.env.GITHUB_REPOSITORY === REPOSITORY, "Unexpected repository");
	requireValue(process.env.GITHUB_WORKFLOW_REF?.includes(`/${workflow}@`), "Incorrect producing workflow ref");
	const sourceSha = git("HEAD");
	const tree = git("HEAD^{tree}");
	requireValue(process.env.GITHUB_SHA === sourceSha, "Checkout differs from GitHub Actions source SHA");
	const runId = integer(process.env.GITHUB_RUN_ID, "run ID");
	const attempt = integer(process.env.GITHUB_RUN_ATTEMPT, "run attempt");
	const token = process.env.GITHUB_TOKEN;
	requireValue(typeof token === "string" && token.length > 0, "Missing read-only GitHub Actions token");
	const version = (await readFile(join(root, "VERSION"), "utf8")).trim();
	requireValue(version === "1.0.0", "Unexpected release version");
	const source = { sha: sourceSha, tree, lock_sha256: sha256(await readFile(join(root, "bun.lock"))) };
	const acceptance = await verifiedJobs(runId, attempt, sourceSha, token);
	const nativeDirectory = resolve(option("--native", "candidate/native"));
	const extraDirectory = resolve(option("--extra", "candidate/extra"));
	const verified = await collectReleaseChecksums(nativeDirectory);
	const artifacts: EvidenceAsset[] = [];
	for (const target of RELEASE_TARGETS) {
		const executable = releaseAssetName(target.name);
		const bundle = `candidate-${target.name}`;
		for (const name of [executable, `${executable}.tar.gz`]) {
			requireValue(verified.assets.includes(name), `Missing attested native distribution: ${name}`);
			artifacts.push(await asset(nativeDirectory, name, bundle));
		}
	}
	const extraNames = await files(extraDirectory);
	requireValue(
		extraNames.some((name) => name.endsWith(".tgz")),
		"Missing npm package",
	);
	for (const name of ["unified-web-docs.tar.gz", "darkfactory-agent-df22.tar.gz", "sbom.cdx.json"]) {
		requireValue(extraNames.includes(name), `Missing audited distribution: ${name}`);
	}
	for (const name of extraNames) artifacts.push(await asset(extraDirectory, name, "candidate-extra"));
	requireValue(new Set(artifacts.map((item) => item.name)).size === artifacts.length, "Duplicate asset name");
	const evidence: TechnicalCandidate = {
		schema: 2,
		kind: "technical-candidate",
		repository: REPOSITORY,
		candidate_id: `df22-v1-run${runId}-attempt${attempt}`,
		version,
		capability_abi: CAPABILITY_ABI_VERSION,
		source,
		build: { run_id: runId, run_attempt: attempt, workflow },
		targets: RELEASE_TARGETS.map((target) => target.name),
		artifacts,
		acceptance,
		provenance: { provider: "github-actions", repository: REPOSITORY, source_sha: sourceSha },
	};
	assertTechnicalCandidate(evidence);
	const output = resolve(option("--out", "candidate/technical-candidate.json"));
	await writeFile(output, JSON.stringify(evidence, null, 2) + "\n");
	const readback = JSON.parse(await readFile(output, "utf8"));
	assertTechnicalCandidate(readback);
	console.log(
		JSON.stringify({
			stage: "A",
			run_id: runId,
			run_attempt: attempt,
			sha: sourceSha,
			tree,
			lock_sha256: source.lock_sha256,
			assets: artifacts.length,
			native: RELEASE_TARGETS.map((target) => target.name),
			evidence_sha256: sha256(await readFile(output)),
			filename: basename(output),
		}),
	);
}
await main();
