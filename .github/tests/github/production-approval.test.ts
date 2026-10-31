import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { GitHubClient } from "../../../packages/github/src/client.ts";
import { GitHubRepository } from "../../../packages/github/src/repository.ts";
import {
  handleProductionApproval,
  handleProductionEnvironment,
} from "../../../packages/github/src/approvals/production-approval.ts";
import type { ProjectBoardClient } from "../../../packages/github/src/approvals/pr-approval.ts";

const HEAD = "a".repeat(40);
const MERGE = "b".repeat(40);
const BASE = "c".repeat(40);
const ROOT = "https://api.github.com/repos/o/r";

function context() {
  const requests: Array<{ method: string; url: string }> = [];
  const mutations: string[] = [];
  const boardUpdates: string[] = [];
  let accepted = true;
  let closed = false;
  let ancestor = true;
  let author = "darkfactory[bot]";
  const fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? "GET";
    const path = String(url);
    requests.push({ method, url: path });
    const respond = (data: unknown) => new Response(JSON.stringify(data));
    if (path === ROOT + "/pulls/7") return respond({
      number: 7, state: "closed", draft: false, merged: accepted,
      merged_at: accepted ? "2026-10-31T00:00:00Z" : null,
      merge_commit_sha: MERGE,
      head: { sha: HEAD, ref: "bot/pr7" }, base: { ref: "main" },
      user: { login: author },
    });
    if (path === ROOT + "/git/ref/heads/main") return respond({ object: { sha: BASE } });
    if (path === ROOT + "/compare/" + MERGE + "..." + BASE)
      return respond({ status: ancestor ? "ahead" : "diverged" });
    if (path === "https://api.github.com/graphql") {
      return respond({
        data: { repository: { pullRequest: {
          closingIssuesReferences: {
            nodes: [
              { number: 5, repository: { nameWithOwner: "o/r" } },
              { number: 6, repository: { nameWithOwner: "other/r" } },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        } } },
      });
    }
    if (path === ROOT + "/issues/5" && method === "GET") return respond({
      number: 5, id: 5, node_id: "I_5", title: "request", body: null,
      state: closed ? "closed" : "open",
      labels: [], user: { login: "requester" },
      author_association: "OWNER", html_url: "https://github.com/o/r/issues/5",
    });
    if (path === ROOT + "/issues/5" && method === "PATCH") {
      mutations.push("issue-close-5");
      closed = true;
      return respond({
        number: 5, id: 5, node_id: "I_5", title: "request", body: null,
        state: "closed", labels: [], user: { login: "requester" },
        author_association: "OWNER", html_url: "https://github.com/o/r/issues/5",
      });
    }
    throw new Error("Unexpected request: " + method + " " + path);
  };
  const client = new GitHubClient({ token: "server-test-token", fetch, maxRetries: 0 });
  const github = new GitHubRepository(client, "o", "r");
  const board = {
    track: async (url: string) => { boardUpdates.push(url); },
    setStatusLabel: async (_repo: string, number: number) => {
      boardUpdates.push("label:" + number);
    },
    addIssueLabel: async () => undefined,
    closeIssue: async () => undefined,
  } as ProjectBoardClient;
  const env = {
    GITHUB_EVENT_NAME: "pull_request_target",
    PR_MERGED: "true", PR_NUMBER: "7", DEFAULT_BRANCH: "main",
    PR_BASE_BRANCH: "main", GITHUB_REPOSITORY: "o/r",
  };
  return {
    github, board, env, requests, mutations, boardUpdates,
    setAccepted: (value: boolean) => { accepted = value; },
    setAncestor: (value: boolean) => { ancestor = value; },
    setAuthor: (value: string) => { author = value; },
  };
}

const logger = { out: (_message: string) => undefined, err: (_message: string) => undefined };

describe("production GitHub approval event reconciliation", () => {
  test("merged-close verifies ancestry before closing only same-repo linked issues", async () => {
    const c = context();
    expect(await handleProductionApproval({
      github: c.github, board: c.board, env: c.env, logger,
    })).toEqual({ entered: true, reason: null, merged: true });
    expect(c.mutations).toEqual(["issue-close-5"]);
    expect(c.boardUpdates).toEqual([
      "https://github.com/o/r/pull/7", "label:7",
      "label:5", "https://github.com/o/r/issues/5",
    ]);
    expect(c.requests.some((r) => r.url.includes("/issues/6"))).toBe(false);
  });

  test("replay observes already-closed local issue and does not close again", async () => {
    const c = context();
    await handleProductionApproval({ github: c.github, board: c.board, env: c.env, logger });
    await handleProductionApproval({ github: c.github, board: c.board, env: c.env, logger });
    expect(c.mutations).toEqual(["issue-close-5"]);
  });

  test("no board or issue writes if merge readback is incomplete", async () => {
    const c = context();
    c.setAccepted(false);
    await expect(handleProductionApproval({
      github: c.github, board: c.board, env: c.env, logger,
    })).rejects.toThrow("not confirmed");
    expect(c.mutations).toHaveLength(0);
    expect(c.boardUpdates).toHaveLength(0);
  });

  test("cannot reconcile a merge absent from protected branch history", async () => {
    const c = context();
    c.setAncestor(false);
    await expect(handleProductionApproval({
      github: c.github, board: c.board, env: c.env, logger,
    })).rejects.toThrow("not an ancestor");
    expect(c.boardUpdates).toHaveLength(0);
  });

  test("human-authored PR cannot be reconciled by the privileged bot workflow", async () => {
    const c = context();
    c.setAuthor("user");
    expect(await handleProductionApproval({
      github: c.github, board: c.board, env: c.env, logger,
    })).toMatchObject({ entered: false, merged: false });
    expect(c.boardUpdates).toHaveLength(0);
  });

  test("invalid event identity or irrelevant event does not run GitHub mutations", async () => {
    const c = context();
    expect(await handleProductionApproval({
      github: c.github, board: c.board,
      env: { ...c.env, GITHUB_EVENT_NAME: "issue_comment", GITHUB_ACTOR: "unknown" },
      logger,
    })).toMatchObject({ entered: false });
    expect(c.requests).toHaveLength(0);
  });

  test("server-only workflow refuses missing App installation credentials", async () => {
    const c = context();
    await expect(handleProductionEnvironment(c.env, c.board, logger))
      .rejects.toThrow("installation credential");
  });

  test("privileged approval checkout remains trusted, unbounded bodies remain file-based", () => {
    const workflow = readFileSync(
      new URL("../../../.github/workflows/pr-approval-automerge.yml", import.meta.url), "utf8",
    );
    expect(workflow).toContain("Checkout trusted default branch");
    expect(workflow).toContain("git -C .darkfactory-pipeline merge-base --is-ancestor");
    expect(workflow).toContain("GH_TOKEN: \${{ steps.app-token.outputs.token }}");
    expect(workflow).not.toContain("steps.app-token.outputs.token || github.token");
    expect(workflow).not.toContain("github.event.review.body");
    expect(workflow).not.toContain("github.event.comment.body");
  });
});
