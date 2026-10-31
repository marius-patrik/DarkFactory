/**
 * Server-side, fail-closed GitHub PR authorization and merge reconciliation.
 * This module is transport/governance only; the execution graph owns decisions
 * and the board owner owns Projects writes.
 */
import { GitHubRepository, isAuthorizedAssociation } from "./repository.ts";

const SHA = /^[a-f0-9]{40}$/iu;
const APPROVAL_DECISIONS = new Set(["APPROVED", "CHANGES_REQUESTED", "DISMISSED"]);

export interface GovernedMergeRequest {
  /** Repository-local PR number, never an event-supplied arbitrary URL. */
  number: number;
  /** Trusted human whose independent native review is being acted upon. */
  approvedBy: string;
  /** The exact commit that the human reviewed. */
  reviewedHeadSha: string;
  /** Expected protected target; never infer this from a webhook alone. */
  baseBranch: string;
}

export interface MergeReadback {
  number: number;
  reviewedHeadSha: string;
  merged: boolean;
  state: "pending" | "enqueued" | "merged";
  mergeCommitSha?: string;
}

interface PullSnapshot {
  number: number;
  state: string;
  draft: boolean;
  merged?: boolean;
  merged_at?: string | null;
  merge_commit_sha?: string | null;
  head: { sha: string; ref: string };
  base: { ref: string };
  user: { login: string; type?: string };
}

interface Protection {
  required_pull_request_reviews?: { required_approving_review_count?: number } | null;
  required_status_checks?: {
    contexts?: string[];
    checks?: Array<{ context: string }>;
  } | null;
}

interface AsyncMerge {
  status?: string;
  details?: {
    uuid?: string;
    expected_head_sha?: string;
    merge_action?: string;
    message?: string;
  };
}

function validSha(value: unknown): value is string {
  return typeof value === "string" && SHA.test(value);
}
function human(login: string, type?: string): boolean {
  return Boolean(login) && type?.toLowerCase() !== "bot" && !/\[bot\]$/iu.test(login);
}

/**
 * API-only PR gate, designed to be called by the graph and broker.
 *
 * Never accepts event-provided review state as proof of approval. Every attempt
 * re-reads the live PR, all reviews, protection rules, required checks and
 * downstack before issuing a SHA-conditional merge request.
 */
export class GovernedPullRequests {
  readonly #repo: GitHubRepository;
  readonly #basePath: string;

  constructor(repository: GitHubRepository) {
    this.#repo = repository;
    this.#basePath = "/repos/" +
      encodeURIComponent(repository.owner) + "/" + encodeURIComponent(repository.repo);
  }

  async #pull(number: number): Promise<PullSnapshot> {
    if (!Number.isSafeInteger(number) || number <= 0) throw new Error("Invalid PR number");
    const value = await this.#repo.client.rest<PullSnapshot>(
      "GET", this.#basePath + "/pulls/" + number,
    );
    if (value.number !== number || !validSha(value.head?.sha) ||
      !value.base?.ref || !value.user?.login) {
      throw new Error("GitHub returned a malformed or mismatched PR");
    }
    return value;
  }

  /**
   * Authorizes an exact SHA, independent human review, branch protection and
   * a green, complete required-check set. A missing policy is not permission.
   */
  async inspect(request: GovernedMergeRequest): Promise<void> {
    if (!validSha(request.reviewedHeadSha) || !request.baseBranch ||
      !human(request.approvedBy)) throw new Error("Invalid or automated approval identity");
    const pr = await this.#pull(request.number);
    if (pr.state !== "open" || pr.merged || pr.draft) throw new Error("PR is not open and ready");
    if (pr.head.sha !== request.reviewedHeadSha) throw new Error("PR head changed since review");
    if (pr.base.ref !== request.baseBranch) throw new Error("PR base changed since authorization");
    if (pr.user.type?.toLowerCase() !== "bot" && !/\[bot\]$/iu.test(pr.user.login))
      throw new Error("Only bot-authored PRs may enter the governed merge lifecycle");
    if (pr.user.login.toLowerCase() === request.approvedBy.toLowerCase())
      throw new Error("PR authors cannot approve themselves");

    // Failing to read branch protection (including a 404 or scope denial)
    // is a hard stop; an unprotected branch must not silently become eligible.
    const protection = await this.#repo.client.rest<Protection>(
      "GET", this.#basePath + "/branches/" +
        encodeURIComponent(pr.base.ref) + "/protection",
    );
    const minimumReviews =
      protection.required_pull_request_reviews?.required_approving_review_count ?? 0;
    if (!Number.isSafeInteger(minimumReviews) || minimumReviews < 1)
      throw new Error("Protected branch requires no verified human review");

    const currentByReviewer = new Map<string, {
      approved: boolean;
      sha: string | null;
      authorized: boolean;
    }>();
    for (const review of await this.#repo.listReviews(request.number)) {
      if (!APPROVAL_DECISIONS.has(review.state ?? "")) continue;
      const login = review.user.login.toLowerCase();
      const userType = typeof review.user["type"] === "string" ? review.user["type"] : undefined;
      const commitId = typeof review["commit_id"] === "string" ? review["commit_id"] : null;
      currentByReviewer.set(login, {
        approved: review.state === "APPROVED",
        sha: commitId,
        authorized: human(review.user.login, userType) &&
          review.user.login.toLowerCase() !== pr.user.login.toLowerCase() &&
          isAuthorizedAssociation(review.author_association),
      });
    }
    const validReviews = [...currentByReviewer.entries()].filter(([, review]) =>
      review.approved && review.authorized && review.sha === request.reviewedHeadSha
    );
    if (validReviews.length < minimumReviews ||
      !validReviews.some(([login]) => login === request.approvedBy.toLowerCase()))
      throw new Error("Missing independent, current-head human approval");

    const required = [...new Set([
      ...(protection.required_status_checks?.contexts ?? []),
      ...(protection.required_status_checks?.checks ?? []).map((check) => check.context),
    ])];
    if (required.length) {
      const result = await this.#repo.requiredCheckStatus(request.reviewedHeadSha, required);
      if (result.state !== "success")
        throw new Error("Required checks are not green on reviewed SHA");
    }

    // The async endpoint merges ALL open downstack PRs. Never authorize
    // their mutation as an implicit side effect of approving this PR.
    const parents = await this.#repo.listPullRequests({
      head: this.#repo.owner + ":" + pr.base.ref,
      state: "open",
    });
    if (parents.some((candidate) => candidate.number !== request.number))
      throw new Error("Open downstack PR requires its own authorization");
  }

  /**
   * Initiates an async SHA-bound merge. HTTP 202, pending and enqueued are
   * never treated as merge completion; only readback may produce merged=true.
   * Ambiguous PUT completion throws without replay and can be reconciled later.
   */
  async requestMerge(request: GovernedMergeRequest): Promise<MergeReadback> {
    await this.inspect(request);
    const result = await this.#repo.client.rest<AsyncMerge>(
      "PUT",
      this.#basePath + "/pulls/" + request.number + "/merge-async",
      {
        sha: request.reviewedHeadSha,
        merge_method: "merge",
        merge_action: "default",
        bypass_rules: false,
      },
      "application/vnd.github+json",
      { apiVersion: "2026-03-10" },
    );
    if (!["pending", "enqueued", "merged"].includes(result.status ?? ""))
      throw new Error("GitHub did not accept the SHA-bound async merge");

    if (result.status === "pending") {
      const uuid = result.details?.uuid;
      if (!uuid || !/^[a-f0-9-]{36}$/iu.test(uuid))
        throw new Error("Async merge accepted without a usable request UUID");
      if (result.details?.expected_head_sha &&
        result.details.expected_head_sha !== request.reviewedHeadSha)
        throw new Error("Async merge references a different head SHA");
      const status = await this.#repo.client.rest<AsyncMerge>(
        "GET", this.#basePath + "/pulls/" + request.number +
          "/merge-async/" + encodeURIComponent(uuid),
        undefined, "application/vnd.github+json", { apiVersion: "2026-03-10" },
      );
      if (status.status === "failed")
        throw new Error("GitHub async merge failed: " + (status.details?.message ?? "unknown"));
      if (!["pending", "enqueued", "merged"].includes(status.status ?? ""))
        throw new Error("Unknown async merge state");
      return this.confirmMerged(request, status.status === "enqueued" ? "enqueued" : "pending");
    }
    return this.confirmMerged(request, result.status === "enqueued" ? "enqueued" : "pending");
  }

  /**
   * Replays, webhook reordering and 409/conflicting requests should use this
   * read-only reconciler. Merge success requires a current PR and ancestry of
   * its merge commit in the present target-branch HEAD.
   */
  async confirmMerged(
    request: Pick<GovernedMergeRequest, "number" | "reviewedHeadSha" | "baseBranch">,
    pendingState: "pending" | "enqueued" = "pending",
  ): Promise<MergeReadback> {
    const pr = await this.#pull(request.number);
    if (pr.head.sha !== request.reviewedHeadSha || pr.base.ref !== request.baseBranch)
      throw new Error("PR identity changed during merge reconciliation");
    const pending: MergeReadback = {
      number: request.number,
      reviewedHeadSha: request.reviewedHeadSha,
      merged: false,
      state: pendingState,
    };
    if (!pr.merged || pr.state !== "closed" || !pr.merged_at) return pending;
    if (!validSha(pr.merge_commit_sha))
      throw new Error("Merged PR has no valid merge commit SHA");

    const branch = await this.#repo.client.rest<{ object?: { sha?: string } }>(
      "GET", this.#basePath + "/git/ref/heads/" + encodeURIComponent(pr.base.ref),
    );
    if (!validSha(branch.object?.sha)) throw new Error("Missing protected base HEAD");
    const comparison = await this.#repo.client.rest<{ status?: string }>(
      "GET", this.#basePath + "/compare/" + pr.merge_commit_sha +
        "..." + branch.object.sha,
    );
    if (comparison.status !== "identical" && comparison.status !== "ahead")
      throw new Error("Merge commit is not an ancestor of the protected branch");
    return {
      number: request.number,
      reviewedHeadSha: request.reviewedHeadSha,
      merged: true,
      state: "merged",
      mergeCommitSha: pr.merge_commit_sha,
    };
  }
}
