/**
 * Production workflow adapter for the authoritative GitHub transport.
 * It never invokes gh, trusts event text for approval, or handles Projects
 * credentials: the existing BoardTarget owns its own user-token boundary.
 */
import { GitHubClient } from "../client.ts";
import { GovernedPullRequests } from "../governance.ts";
import { GitHubRepository } from "../repository.ts";
import { isAllowedApprover } from "./commands.ts";
import {
  detectApproval,
  type PrApprovalEnvironment,
  type PrApprovalLogger,
  type PrApprovalOutcome,
  type ProjectBoardClient,
} from "./pr-approval.ts";

interface WorkflowContext {
  github: GitHubRepository;
  board: ProjectBoardClient;
  env: PrApprovalEnvironment;
  logger: PrApprovalLogger;
}

function outcome(entered: boolean, reason: string | null, merged = false): PrApprovalOutcome {
  return { entered, reason, merged };
}

function numberFromEvent(env: PrApprovalEnvironment): number {
  const value = env.PR_NUMBER ?? "";
  const number = Number(value);
  if (!/^[1-9]\d*$/u.test(value) || !Number.isSafeInteger(number))
    throw new Error("Missing or malformed repository-local pull request number");
  return number;
}

function isBot(login: string): boolean {
  return /\[bot\]$/iu.test(login);
}

/**
 * Reconciliation performs no writes until the exact PR is demonstrably
 * merged and its merge commit is reachable from the protected default branch.
 */
async function reconcileMerged(
  context: WorkflowContext,
  number: number,
  reviewedHeadSha: string,
): Promise<void> {
  const { github, env, board, logger } = context;
  const branch = env.DEFAULT_BRANCH;
  if (!branch) throw new Error("No trusted default branch available");
  const governance = new GovernedPullRequests(github);
  const confirmed = await governance.confirmMerged({
    number, baseBranch: branch, reviewedHeadSha,
  });
  if (!confirmed.merged)
    throw new Error("Cannot reconcile PR: GitHub has not confirmed its merge");

  // GitHub's link graph is authoritative. A PR body regex cannot authorize
  // closing an unrelated issue or an issue in a different repository.
  const query =
    "query($owner:String!,$repo:String!,$number:Int!,$cursor:String){" +
    "repository(owner:$owner,name:$repo){pullRequest(number:$number){" +
    "closingIssuesReferences(first:100,after:$cursor){" +
    "nodes{number repository{nameWithOwner}} pageInfo{hasNextPage endCursor}" +
    "}}}}";
  type Ref = { number: number; repository?: { nameWithOwner?: string } };
  type Data = {
    repository?: {
      pullRequest?: {
        closingIssuesReferences?: {
          nodes: Ref[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    };
  };
  const linked = await github.client.collectGraphQL<Ref>(
    query,
    { owner: github.owner, repo: github.repo, number },
    (data) => {
      const result = (data as Data).repository?.pullRequest?.closingIssuesReferences;
      if (!result) throw new Error("GitHub did not return authoritative closing-issue references");
      return result;
    },
    101,
  );
  if (linked.length > 20)
    throw new Error("Too many closing issue references to safely reconcile");
  const issues = [...new Set(linked
    .filter((item) =>
      Number.isSafeInteger(item.number) &&
      item.number > 0 &&
      item.repository?.nameWithOwner?.toLowerCase() === github.slug.toLowerCase())
    .map((item) => item.number))];
  const prUrl = "https://github.com/" + github.slug + "/pull/" + number;
  await board.track(prUrl, "Done", { fastPath: true });
  await board.setStatusLabel(github.slug, number, "Done");

  for (const issueNumber of issues) {
    const issue = await github.getIssue(issueNumber);
    if (issue.state === "open") await github.closeIssue(issueNumber);
    else if (issue.state !== "closed") throw new Error("Unexpected linked issue state");
    if ((await github.getIssue(issueNumber)).state !== "closed")
      throw new Error("Issue closure not confirmed by GitHub");
    await board.setStatusLabel(github.slug, issueNumber, "Done");
    await board.track(
      "https://github.com/" + github.slug + "/issues/" + issueNumber,
      "Done",
      { fastPath: true },
    );
    logger.out("Verified scoped issue closure #" + issueNumber);
  }
}

/** API-only implementation for the privileged default-branch approval workflow. */
export async function handleProductionApproval(context: WorkflowContext): Promise<PrApprovalOutcome> {
  const { github, env, logger } = context;
  const event = env.GITHUB_EVENT_NAME ?? "";
  if (event !== "pull_request_review" && event !== "issue_comment" && event !== "pull_request_target")
    return outcome(false, "unrelated GitHub event");

  // Native merge events, never issue comments claiming that a PR merged.
  if (event === "pull_request_target") {
    if (env.PR_MERGED !== "true") return outcome(false, "not a merged PR");
    if (!env.PR_BASE_BRANCH || env.PR_BASE_BRANCH !== env.DEFAULT_BRANCH)
      return outcome(false, "merged outside verified default branch");
    const number = numberFromEvent(env);
    const pr = await github.client.rest<{
      head?: { sha?: string }; user?: { login?: string };
    }>("GET", "/repos/" + github.slug + "/pulls/" + number);
    if (!pr.user?.login || !isBot(pr.user.login))
      return outcome(false, "not a bot-authored PR");
    if (!pr.head?.sha) throw new Error("Merged event lacks a current PR head");
    await reconcileMerged(context, number, pr.head.sha);
    return outcome(true, null, true);
  }

  const actor = env.GITHUB_ACTOR ?? "";
  if (!isAllowedApprover(actor, {
    authorAssociation: env.APPROVER_ASSOCIATION,
    issueAuthor: env.ISSUE_AUTHOR,
    userType: env.APPROVER_TYPE,
  })) return outcome(false, "event actor is not authorized");

  const detection = detectApproval(env);
  if (!detection.approved || !detection.prNumber)
    return outcome(false, "not an approval event");
  const number = numberFromEvent(env);
  const expectedBase = env.PR_BASE_BRANCH || env.DEFAULT_BRANCH;
  if (!env.DEFAULT_BRANCH || expectedBase !== env.DEFAULT_BRANCH)
    return outcome(false, "default-branch approval required");

  const reviewedHeadSha = event === "pull_request_review"
    ? env.REVIEW_HEAD_SHA
    : await github.getPullRequestHeadSha(number);
  if (!reviewedHeadSha) throw new Error("No verifiable reviewed SHA");
  const response = await new GovernedPullRequests(github).requestMerge({
    number,
    approvedBy: actor,
    reviewedHeadSha,
    baseBranch: expectedBase,
  });
  if (response.merged) {
    await reconcileMerged(context, number, reviewedHeadSha);
    return outcome(true, null, true);
  }
  logger.out("PR #" + number + " not merged: " + response.state);
  return outcome(true, "merge " + response.state, false);
}

/**
 * Workflow entry constructor: only a server-side App token may issue GitHub
 * mutations; GH_PROJECT_TOKEN remains owned by the separately injected board.
 */
export async function handleProductionEnvironment(
  env: PrApprovalEnvironment,
  board: ProjectBoardClient,
  logger: PrApprovalLogger,
): Promise<PrApprovalOutcome> {
  const slug = env.GITHUB_REPOSITORY ?? "";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(slug))
    throw new Error("Missing or malformed GITHUB_REPOSITORY");
  const token = env.GH_TOKEN;
  if (!token) throw new Error("GitHub App installation credential is required");
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) throw new Error("Invalid repository identity");
  const github = new GitHubRepository(new GitHubClient({ token }), owner, repo);
  return handleProductionApproval({ github, board, env, logger });
}
