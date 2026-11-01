import { readFileSync, writeFileSync } from "node:fs";
import { CAPABILITY_ABI_VERSION } from "../../../capability/src/abi.ts";
import {
 assertPromotionEvidence, assertTechnicalCandidate, fileDigest, releaseAssetBundles,
 REPOSITORY, REQUIRED_FINAL_CHECKS, requireCondition,
 type PromotionEvidence, type TechnicalCandidate,
} from "./promotion-evidence.ts";

const FINAL = [...REQUIRED_FINAL_CHECKS];
type Phase = "resolve" | "seal" | "publish" | "finalize";
export interface PromotionContext {
 token: string;
 sourceSha: string;
 actor: string;
 event: string;
 version: string;
 runId: number;
 phase: Phase;
}
async function github(path: string, token: string): Promise<any> {
 const response = await fetch("https://api.github.com/repos/" + REPOSITORY + "/" + path, {
  headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
 });
 requireCondition(response.ok, "GitHub " + path + " HTTP " + response.status);
 return response.json();
}
async function absent(path: string, token: string): Promise<boolean> {
 const response = await fetch("https://api.github.com/repos/" + REPOSITORY + "/" + path, {
  headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
 });
 if (response.status === 404) return true;
 requireCondition(response.ok, "cannot establish uniqueness: " + path + " HTTP " + response.status);
 return false;
}
async function governance(token: string): Promise<void> {
 const branch = await github("branches/main", token);
 requireCondition(branch.protected === true, "main is not protected");
 const rulesets = await github("rulesets?per_page=100", token);
 requireCondition(Array.isArray(rulesets), "ruleset inventory missing");
 let mainProtected = false;
 let tagsImmutable = false;
 for (const item of rulesets) {
  if (item.enforcement !== "active") continue;
  const rule = await github("rulesets/" + item.id, token);
  const includes = rule.conditions?.ref_name?.include ?? [];
  const types = new Set((rule.rules ?? []).map((r: any) => r.type));
  if (item.target === "branch" && includes.includes("refs/heads/main")) {
   const pr = rule.rules?.find((r: any) => r.type === "pull_request");
   const checks = rule.rules?.find((r: any) => r.type === "required_status_checks");
   if (pr?.parameters?.required_approving_review_count >= 1 &&
    pr.parameters.dismiss_stale_reviews_on_push === true &&
    FINAL.every((name) => checks?.parameters?.required_status_checks?.some((c: any) => c.context === name)) &&
    !(rule.bypass_actors?.length > 0)) mainProtected = true;
  }
  if (item.target === "tag" && includes.includes("refs/tags/v*") &&
   types.has("update") && types.has("deletion") && !rule.bypass_actors?.length) tagsImmutable = true;
 }
 requireCondition(mainProtected, "no enforced protected-main PR/review/final-head ruleset");
 requireCondition(tagsImmutable, "no immutable v* tag ruleset");
 const env = await github("environments/production-release", token);
 requireCondition(env.prevent_self_review === true &&
  env.protection_rules?.some((r: any) => r.type === "required_reviewers" && r.reviewers?.length > 0),
  "missing protected publication environment");
}
function localVersion(a: TechnicalCandidate, ctx: PromotionContext): void {
 const config = JSON.parse(readFileSync("repo.dfconfig", "utf8"));
 const root = JSON.parse(readFileSync("package.json", "utf8"));
 const plugins = JSON.parse(readFileSync("packages/plugins/package.json", "utf8"));
 requireCondition(readFileSync("VERSION", "utf8").trim() === a.version &&
  root.version === a.version && plugins.version === a.version &&
  config.repo?.versioning?.mode === "semver" && config.repo?.versioning?.tag_prefix === "v" &&
  config.repo?.versioning?.initial === "1.0.0" && ctx.version === a.version,
  "stable version authorities drifted");
 requireCondition(fileDigest("bun.lock") === a.source.lock_sha256, "changed dependency lockfile");
 requireCondition(a.capability_abi === CAPABILITY_ABI_VERSION, "unsupported capability ABI");
}
async function githubRun(runId: number, sha: string, token: string, jobName: string, attempt?: number): Promise<void> {
 const run = await github("actions/runs/" + runId, token);
 requireCondition(run.conclusion === "success" && run.status === "completed" &&
  run.head_sha === sha && run.repository?.full_name === REPOSITORY &&
  (attempt === undefined || run.run_attempt === attempt), "stale/failed/pending run " + runId);
 const jobs = await github("actions/runs/" + runId + "/jobs?per_page=100", token);
 requireCondition(Array.isArray(jobs.jobs) &&
  jobs.jobs.some((j: any) => j.name === jobName && j.conclusion === "success" &&
   j.status === "completed" && j.head_sha === sha &&
   (attempt === undefined || j.run_attempt === undefined || j.run_attempt === attempt)),
  "missing successful job " + jobName + " in run " + runId);
}
/** Verify complete immutable artifact bundles belong to this candidate run, never to the sealing run. */
export async function verifyCandidateRun(a: TechnicalCandidate, token: string): Promise<void> {
 const run = await github("actions/runs/" + a.build.run_id, token);
 requireCondition(run.path?.split("@")[0] === a.build.workflow, "wrong candidate-producing workflow");
 await githubRun(a.build.run_id, a.source.sha, token, "candidate", a.build.run_attempt);
 const artifactList = await github("actions/runs/" + a.build.run_id + "/artifacts?per_page=100", token);
 const expected = ["technical-candidate", ...releaseAssetBundles(a)].sort();
 const artifacts = artifactList.artifacts;
 requireCondition(Array.isArray(artifacts) && artifactList.total_count === expected.length &&
  artifacts.length === expected.length && artifacts.every((v: any) =>
   expected.includes(v.name) && v.expired === false && v.size_in_bytes > 0 &&
   v.workflow_run?.id === a.build.run_id) &&
  new Set(artifacts.map((v: any) => v.name)).size === expected.length,
  "missing/replaced/extra candidate run artifacts");
 for (const required of a.acceptance) {
  await githubRun(required.run_id, a.source.sha, token, required.name === "source-free" ? "candidate" : required.name);
 }
}
async function reviewedPR(a: TechnicalCandidate, sha: string, token: string): Promise<{ number: number; review: any }> {
 // The merge commit must be exactly the current protected-main head, not an unrelated later commit.
 const prs = await github("commits/" + sha + "/pulls?per_page=100", token);
 const matches = (Array.isArray(prs) ? prs : []).filter((p: any) =>
  p.merged_at && p.base?.ref === "main" && p.head?.sha === a.source.sha && p.merge_commit_sha === sha);
 requireCondition(matches.length === 1, "no uniquely merged PR binding this exact final commit");
 const pr = await github("pulls/" + matches[0].number, token);
 requireCondition(pr.merged === true && pr.merged_at && pr.base?.ref === "main" &&
  pr.head?.sha === a.source.sha && pr.merge_commit_sha === sha && pr.head?.repo?.full_name === REPOSITORY,
  "premerge/unmerged/wrong-target PR");
 const reviews = await github("pulls/" + pr.number + "/reviews?per_page=100", token);
 requireCondition(Array.isArray(reviews) && reviews.length < 100, "unverifiable paginated review history");
 const latest = new Map<string, any>();
 for (const r of reviews) if (r.user?.login) latest.set(r.user.login, r);
 const independent = [...latest.values()].filter((r: any) =>
  r.state === "APPROVED" && r.commit_id === a.source.sha && r.user?.type === "User" &&
  r.user.login !== pr.user?.login && r.user.login !== "marius-patrik");
 requireCondition(independent.length > 0, "stale/missing independent human approval");
 return { number: pr.number, review: independent[0] };
}
async function environmentApproval(ctx: PromotionContext): Promise<string> {
 const approvals = await github("actions/runs/" + ctx.runId + "/approvals", ctx.token);
 const match = Array.isArray(approvals) ? approvals.find((v: any) =>
  v.state === "approved" && v.user?.type === "User" && v.user.login !== ctx.actor &&
  v.environments?.some((e: any) => e.name === "production-release")) : undefined;
 requireCondition(match, "missing independent protected-environment approval for sealing run");
 return match.user.login;
}
async function finalChecks(sha: string, token: string): Promise<void> {
 const checks = await github("commits/" + sha + "/check-runs?per_page=100", token);
 requireCondition(Array.isArray(checks.check_runs) && checks.total_count <= 100, "incomplete final-head check pagination");
 for (const name of FINAL) requireCondition(checks.check_runs.some((c: any) =>
  c.name === name && c.head_sha === sha && c.status === "completed" && c.conclusion === "success"),
  "missing/failed/pending final-head check " + name);
}
async function remoteRelease(ctx: PromotionContext, b: PromotionEvidence): Promise<void> {
 const release = await github("releases/tags/v" + ctx.version, ctx.token);
 requireCondition(release.draft === true && release.tag_name === "v" + ctx.version &&
  release.target_commitish === b.source.final_sha, "missing/altered draft release");
 const tag = await github("git/ref/tags/v" + ctx.version, ctx.token);
 requireCondition(tag.ref === "refs/tags/v" + ctx.version && tag.object?.type === "commit" &&
  tag.object.sha === b.source.final_sha, "draft tag does not resolve to protected final commit");
}

/** Read-only final-head verification. Seal only after authorization; never trust JSON for permission. */
export async function verifyLivePromotion(
 aValue: TechnicalCandidate,
 ctx: PromotionContext,
 bValue?: PromotionEvidence,
 technicalDigest?: string,
): Promise<PromotionEvidence | undefined> {
 const a = assertTechnicalCandidate(aValue);
 requireCondition(ctx.event === "workflow_dispatch", "automatic/workflow_call publication forbidden");
 requireCondition(ctx.actor === "marius-patrik", "unauthorized publication actor");
 requireCondition(/^[a-f0-9]{40}$/u.test(ctx.sourceSha), "invalid final SHA");
 localVersion(a, ctx);
 const main = await github("branches/main", ctx.token);
 requireCondition(main.protected === true && main.commit?.sha === ctx.sourceSha, "protected main moved/unprotected");
 const final = await github("git/commits/" + ctx.sourceSha, ctx.token);
 const reviewed = await github("git/commits/" + a.source.sha, ctx.token);
 requireCondition(final.tree?.sha === a.source.tree && reviewed.tree?.sha === a.source.tree,
  "reviewed and final trees differ");
 await governance(ctx.token);
 await verifyCandidateRun(a, ctx.token);
 const bound = await reviewedPR(a, ctx.sourceSha, ctx.token);
 await finalChecks(ctx.sourceSha, ctx.token);
 if (ctx.phase === "resolve" || ctx.phase === "seal") {
  requireCondition(await absent("git/ref/tags/v" + ctx.version, ctx.token), "duplicate immutable tag");
  requireCondition(await absent("releases/tags/v" + ctx.version, ctx.token), "duplicate release/draft");
 }
 if (ctx.phase === "resolve") return undefined;
 const approver = await environmentApproval(ctx);
 const created: PromotionEvidence = {
  schema: 2, kind: "promotion-evidence", repository: REPOSITORY,
  candidate_id: a.candidate_id, technical_sha256: technicalDigest ?? "",
  source: { reviewed_sha: a.source.sha, reviewed_tree: a.source.tree, final_sha: ctx.sourceSha,
   final_tree: final.tree.sha, pull_request: bound.number },
  review: { id: bound.review.id, reviewer: bound.review.user.login, commit_sha: bound.review.commit_id },
  final_checks: [...FINAL],
  authorization: { run_id: ctx.runId, approver, environment: "production-release" },
 };
 if (ctx.phase === "seal") {
  requireCondition(typeof technicalDigest === "string", "missing immutable technical candidate digest");
  return assertPromotionEvidence(created, a, technicalDigest);
 }
 const b = assertPromotionEvidence(bValue, a, technicalDigest ?? "");
 requireCondition(JSON.stringify(b) === JSON.stringify(created), "stale/replaced postmerge seal");
 if (ctx.phase === "finalize") await remoteRelease(ctx, b);
 return b;
}
if (import.meta.main) {
 const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.split("="); return [key, value.join("=")];
 }));
 try {
  const phase = args.get("--phase");
  requireCondition(["resolve", "seal", "publish", "finalize"].includes(phase ?? ""), "invalid promotion phase");
  const file = args.get("--technical") ?? "";
  const hash = args.get("--digest") ?? "";
  const a = assertTechnicalCandidate(JSON.parse(readFileSync(file, "utf8")));
  requireCondition(fileDigest(file) === hash, "technical candidate file digest mismatch");
  requireCondition(String(a.build.run_id) === process.env.EXPECTED_CANDIDATE_RUN, "wrong candidate run ID");
  const ctx: PromotionContext = {
   token: process.env.GITHUB_TOKEN ?? "", sourceSha: process.env.GITHUB_SHA ?? "",
   actor: process.env.GITHUB_ACTOR ?? "", event: process.env.GITHUB_EVENT_NAME ?? "",
   version: process.env.RELEASE_VERSION ?? "", runId: Number(process.env.GITHUB_RUN_ID ?? "0"),
   phase: phase as Phase,
  };
  const promotionFile = args.get("--sealed") ?? "";
  const b = promotionFile ? JSON.parse(readFileSync(promotionFile, "utf8")) : undefined;
  const result = await verifyLivePromotion(a, ctx, b, hash);
  if (phase === "seal") {
   const out = args.get("--out") ?? "";
   requireCondition(out.length > 0, "missing output seal path");
   writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  }
  console.log("Verified promotion lifecycle stage " + phase);
 } catch (error) {
  console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
 }
}
