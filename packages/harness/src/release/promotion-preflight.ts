import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CAPABILITY_ABI_VERSION } from "../../../capability/src/abi.ts";
import { assertPromotionEvidence, type PromotionEvidence } from "./promotion-evidence.ts";

const REPO = "marius-patrik/DarkFactory";
const REQUIRED_FINAL = ["quality", "verify-bound-issue", "candidate"];
const HEX = /^[0-9a-f]{40}$/u;

function block(message: string): never {
	throw new Error("Release promotion blocked: " + message);
}

async function api(path: string, token: string): Promise<any> {
	const response = await fetch("https://api.github.com/repos/" + REPO + "/" + path, {
		headers: {
			Authorization: "Bearer " + token,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});
	if (!response.ok) block("GitHub " + path + " HTTP " + response.status);
	return response.json();
}

async function missing(path: string, token: string): Promise<boolean> {
	const response = await fetch("https://api.github.com/repos/" + REPO + "/" + path, {
		headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
	});
	if (response.status === 404) return true;
	if (response.ok) return false;
	block("cannot establish tag/release uniqueness: HTTP " + response.status);
}

function digest(file: string): string {
	return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/**
 * Read-only preflight on exact protected source. All status assertions are checked
 * against GitHub, never trusted solely because an uploaded manifest says success.
 */
export async function verifyLivePromotion(
	e: PromotionEvidence,
	context: {
		token: string;
		sourceSha: string;
		actor: string;
		event: string;
		version: string;
		runId: number;
		phase: "candidate" | "publish" | "finalize";
	},
): Promise<void> {
	if (context.event !== "workflow_dispatch") block("no automatic/workflow_call publication");
	if (context.actor !== "marius-patrik") block("only repository owner may request producer publication");
	if (!HEX.test(context.sourceSha) || context.sourceSha !== e.source.final_sha)
		block("not the reviewed protected final SHA");
	if (context.version !== e.version) block("requested and evidenced versions differ");
	const config = JSON.parse(readFileSync("repo.dfconfig", "utf8"));
	const root = JSON.parse(readFileSync("package.json", "utf8"));
	const plugins = JSON.parse(readFileSync("packages/plugins/package.json", "utf8"));
	if (
		readFileSync("VERSION", "utf8").trim() !== e.version ||
		root.version !== e.version ||
		plugins.version !== e.version ||
		config.repo?.versioning?.mode !== "semver" ||
		config.repo?.versioning?.tag_prefix !== "v" ||
		config.repo?.versioning?.initial !== "1.0.0"
	) {
		block("VERSION, root/package metadata or declared stable SemVer authority drifted");
	}
	if (digest("bun.lock") !== e.source.lock_sha256) block("dependency lock digest mismatch");
	if (e.capability_abi !== CAPABILITY_ABI_VERSION) block("unsupported ABI");
	const branch = await api("branches/main", context.token);
	if (!branch.protected || branch.commit?.sha !== context.sourceSha) block("protected main moved or is unprotected");
	const commit = await api("git/commits/" + context.sourceSha, context.token);
	const reviewed = await api("git/commits/" + e.source.reviewed_sha, context.token);
	if (commit.tree?.sha !== e.source.final_tree || reviewed.tree?.sha !== e.source.reviewed_tree)
		block("unverified source tree");
	const rulesets = await api("rulesets", context.token);
	let governed = false;
	for (const item of rulesets) {
		if (item.enforcement !== "active") continue;
		const rules = await api("rulesets/" + item.id, context.token);
		if (!rules.conditions?.ref_name?.include?.includes("refs/heads/main")) continue;
		const pr = rules.rules?.find((rule: any) => rule.type === "pull_request");
		const statuses = rules.rules?.find((rule: any) => rule.type === "required_status_checks");
		if (
			pr?.parameters?.required_approving_review_count >= 1 &&
			pr.parameters.dismiss_stale_reviews_on_push === true &&
			REQUIRED_FINAL.every((name) => statuses?.parameters?.required_status_checks?.some((c: any) => c.context === name))
		)
			governed = true;
	}
	if (!governed) block("protected main must enforce one fresh reviewer and all final checks");
	let immutableTags = false;
	for (const item of rulesets) {
		if (item.enforcement !== "active" || item.target !== "tag") continue;
		const rules = await api("rulesets/" + item.id, context.token);
		const patterns = rules.conditions?.ref_name?.include ?? [];
		const types = new Set((rules.rules ?? []).map((r: any) => r.type));
		if (
			patterns.includes("refs/tags/v*") &&
			types.has("update") &&
			types.has("deletion") &&
			!rules.bypass_actors?.length
		)
			immutableTags = true;
	}
	if (!immutableTags) block("no enforced immutable public v* tag ruleset");
	const env = await api("environments/production-release", context.token);
	if (
		!env.prevent_self_review ||
		!env.protection_rules?.some((r: any) => r.type === "required_reviewers" && r.reviewers?.length > 0)
	) {
		block("production-release environment lacks external human approval protection");
	}
	if (context.phase !== "finalize") {
		if (!(await missing("git/ref/tags/v" + e.version, context.token))) block("duplicate immutable tag");
		if (!(await missing("releases/tags/v" + e.version, context.token))) block("duplicate immutable release");
	} else {
		const draft = await api("releases/tags/v" + e.version, context.token);
		if (!draft.draft || draft.target_commitish !== context.sourceSha) block("draft changed before promotion");
		const tag = await api("git/ref/tags/v" + e.version, context.token);
		if (
			tag.ref !== "refs/tags/v" + e.version ||
			tag.object?.type !== "commit" ||
			tag.object?.sha !== context.sourceSha
		) {
			block("public tag does not resolve to authorized final commit");
		}
	}
	const pr = await api("pulls/" + e.source.pull_request, context.token);
	if (!pr.merged || pr.base?.ref !== "main" || pr.head?.sha !== e.source.reviewed_sha)
		block("candidate has no merged protected PR");
	const reviews = await api("pulls/" + e.source.pull_request + "/reviews?per_page=100", context.token);
	const byReviewer = reviews.filter((r: any) => r.user?.login === e.independent_review.reviewer);
	const last = byReviewer.at(-1);
	if (
		!last ||
		last.state !== "APPROVED" ||
		last.commit_id !== e.source.reviewed_sha ||
		last.user?.type !== "User" ||
		last.user.login === pr.user?.login ||
		last.user.login === context.actor
	) {
		block("no current independent approved review on candidate SHA");
	}
	const runs = [e.candidate, ...e.acceptance];
	for (const run of runs) {
		const id = run.run_id;
		const record = await api("actions/runs/" + id, context.token);
		const sha = "head_sha" in run ? run.head_sha : "";
		if (record.conclusion !== "success" || record.head_sha !== sha || record.repository?.full_name !== REPO) {
			block("stale/failed evidence run " + id);
		}
		const expectedJob = "name" in run ? run.name : "candidate";
		const jobs = await api("actions/runs/" + id + "/jobs?per_page=100", context.token);
		if (
			!jobs.jobs?.some((job: any) => job.name === expectedJob && job.conclusion === "success" && job.head_sha === sha)
		) {
			block("successful run lacks exact accepted job: " + expectedJob);
		}
	}
	const checks = await api("commits/" + context.sourceSha + "/check-runs?per_page=100", context.token);
	for (const name of REQUIRED_FINAL) {
		if (
			!checks.check_runs?.some(
				(c: any) => c.name === name && c.head_sha === context.sourceSha && c.conclusion === "success",
			)
		) {
			block("missing exact-final-head check: " + name);
		}
	}
	if (context.phase === "publish" || context.phase === "finalize") {
		const approvals = await api("actions/runs/" + context.runId + "/approvals", context.token);
		if (
			!Array.isArray(approvals) ||
			!approvals.some(
				(a: any) =>
					a.state === "approved" &&
					a.user?.type === "User" &&
					a.user?.login !== context.actor &&
					a.environments?.some((v: any) => v.name === "production-release"),
			)
		)
			block("no independently approved environment deployment for this exact run");
		assertPromotionEvidence(e, "publish", true);
	}
}

/** Workflow entry; does not tag, publish, upload or mutate repository state. */
if (import.meta.main) {
	const args = new Map(
		process.argv.slice(2).map((arg) => {
			const [key, ...value] = arg.split("=");
			return [key, value.join("=")];
		}),
	);
	const phase =
		args.get("--phase") === "publish" ? "publish" : args.get("--phase") === "finalize" ? "finalize" : "candidate";
	const file = args.get("--evidence") ?? "";
	const hash = args.get("--digest") ?? "";
	try {
		const bytes = readFileSync(file);
		if (!/^[0-9a-f]{64}$/u.test(hash) || digest(file) !== hash) block("evidence digest changed");
		const input: unknown = JSON.parse(bytes.toString("utf8"));
		if (String((input as { candidate?: { run_id?: number } }).candidate?.run_id) !== process.env.EXPECTED_CANDIDATE_RUN)
			block("wrong requested candidate run");
		const evidence = assertPromotionEvidence(input, "candidate");
		await verifyLivePromotion(evidence, {
			token: process.env.GITHUB_TOKEN ?? "",
			sourceSha: process.env.GITHUB_SHA ?? "",
			actor: process.env.GITHUB_ACTOR ?? "",
			event: process.env.GITHUB_EVENT_NAME ?? "",
			version: process.env.RELEASE_VERSION ?? "",
			runId: Number(process.env.GITHUB_RUN_ID ?? "0"),
			phase,
		});
		console.log("Release evidence verified against live GitHub state.");
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
