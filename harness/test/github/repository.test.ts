import { expect, test } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository, isAuthorizedAssociation, isBotLogin } from "../../src/github/repository.ts";
import { json, scripted } from "./helpers.ts";

test("issues/comments/labels/sub-issues are typed and encoded", async () => {
  const issue = { number: 4, id: 40, node_id: "I", title: "T", body: null, state: "open", labels: [], user: { login: "u" }, author_association: "MEMBER", html_url: "u" };
  const mock = scripted([json(issue), json([{ id: 1, body: "a", user: { login: "u" }, author_association: "MEMBER" }], 200, { link: '<https://api.github.com/repos/o/r/issues/4/comments?page=2>; rel="next"' }), json([{ id: 2, body: "b", user: { login: "bot[bot]" }, author_association: "NONE" }]), json({ id: 3, body: "c", user: { login: "u" }, author_association: "OWNER" }), json({}), json({ ...issue, state: "closed" }), json({})]);
  const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
  expect((await repo.getIssue(4)).number).toBe(4);
  expect((await repo.listComments(4)).map(c => c.id)).toEqual([1, 2]);
  await repo.createComment(4, "c"); await repo.addLabels(4, ["In Progress"]); await repo.closeIssue(4, "completed"); await repo.addSubIssue(4, 9);
  expect(isAuthorizedAssociation("COLLABORATOR")).toBeTrue(); expect(isAuthorizedAssociation("CONTRIBUTOR")).toBeFalse();
  expect(isBotLogin("darkfactory-pipeline[bot]")).toBeTrue(); expect(isBotLogin("robotics-user")).toBeFalse();
});

test("malformed consumed payloads fail at the boundary", async () => {
  const mock = scripted([json({ number: "wrong" })]);
  const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
  expect(repo.getIssue(1)).rejects.toThrow("invalid GitHub issue response");
});
