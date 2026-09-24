import { describe, expect, test } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubError } from "../../src/github/errors.ts";
import { json, scripted } from "./helpers.ts";

describe("GitHubClient", () => {
  test("sets safe headers, retries 5xx with full jitter, and captures rate state", async () => {
    const mock = scripted([
      json({ message: "busy" }, 503, { "x-github-request-id": "R1" }),
      json({ ok: true }, 200, { "x-ratelimit-resource": "core", "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "42", "x-ratelimit-reset": "200" }),
    ]);
    const sleeps: number[] = [];
    const client = new GitHubClient({ token: "ghs_" + "x".repeat(520), fetch: mock.fetch, random: () => 0.5, sleep: async ms => { sleeps.push(ms); } });
    expect(await client.rest<{ ok: boolean }>("GET", "/repos/o/r")).toEqual({ ok: true });
    expect(sleeps).toEqual([250]);
    expect(new Headers(mock.calls[0]!.init?.headers).get("authorization")).toHaveLength(531);
    expect(new Headers(mock.calls[0]!.init?.headers).get("x-github-api-version")).toBe("2022-11-28");
    expect(client.rateLimit?.remaining).toBe(42);
  });

  test("honors secondary Retry-After and reports request ids without leaking tokens", async () => {
    const mock = scripted([json({ message: "secondary rate limit" }, 403, { "retry-after": "2", "x-github-request-id": "RATE" }), json({ ok: true })]);
    const sleeps: number[] = [];
    const client = new GitHubClient({ token: "top-secret-token", fetch: mock.fetch, sleep: async ms => { sleeps.push(ms); } });
    await client.rest("GET", "/rate");
    expect(sleeps).toEqual([2000]);
    const failed = scripted([json({ message: "nope top-secret-token" }, 404, { "x-github-request-id": "REQ404" })]);
    try { await new GitHubClient({ token: "top-secret-token", fetch: failed.fetch }).rest("GET", "/missing"); throw new Error("expected failure"); }
    catch (error) { expect(error).toBeInstanceOf(GitHubError); expect(String(error)).toContain("REQ404"); expect(String(error)).not.toContain("top-secret-token"); }
  });

  test("revalidates ETags and follows Link pages", async () => {
    const mock = scripted([
      json([{ id: 1 }], 200, { etag: '"v1"' }),
      new Response(null, { status: 304 }),
      json([{ id: 1 }], 200, { link: '<https://api.github.com/items?page=2>; rel="next"' }),
      json([{ id: 2 }]),
    ]);
    const client = new GitHubClient({ token: "t", fetch: mock.fetch });
    expect(await client.rest<Array<{ id: number }>>("GET", "/cached")).toEqual([{ id: 1 }]);
    expect(await client.rest<Array<{ id: number }>>("GET", "/cached")).toEqual([{ id: 1 }]);
    expect(new Headers(mock.calls[1]!.init?.headers).get("if-none-match")).toBe('"v1"');
    expect(await client.collectRest<{ id: number }>("/items")).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test("invalidates ETags after writes", async () => {
    const mock = scripted([json({ version: 1 }, 200, { etag: '"old"' }), json({}, 200), json({ version: 2 }, 200, { etag: '"new"' })]);
    const client = new GitHubClient({ token: "t", fetch: mock.fetch });
    await client.rest("GET", "/resource");
    await client.rest("PATCH", "/resource", { changed: true });
    expect(await client.rest<{ version: number }>("GET", "/resource")).toEqual({ version: 2 });
    expect(new Headers(mock.calls[2]!.init?.headers).has("if-none-match")).toBeFalse();
  });

  test("classifies exhausted primary rate limits with reset awareness", async () => {
    const mock = scripted([json({ message: "API rate limit exceeded" }, 403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "200", "x-github-request-id": "PRIMARY" })]);
    try { await new GitHubClient({ token: "t", fetch: mock.fetch }).rest("GET", "/limited"); throw new Error("expected failure"); }
    catch (error) { expect(error).toBeInstanceOf(GitHubError); expect((error as GitHubError).kind).toBe("primary-rate-limit"); expect((error as GitHubError).retryAt).toEqual(new Date(200_000)); }
  });

  test("walks GraphQL cursors, records rateLimit, and rejects repeated cursors", async () => {
    const query = "query($cursor:String){viewer{repositories(first:1,after:$cursor){nodes{id} pageInfo{hasNextPage endCursor}}} rateLimit{cost remaining resetAt}}";
    const mock = scripted([json({ data: { viewer: { repositories: { nodes: [{ id: "1" }], pageInfo: { hasNextPage: true, endCursor: "next" } } }, rateLimit: { cost: 1, remaining: 99, resetAt: "2030-01-01T00:00:00Z" } } }), json({ data: { viewer: { repositories: { nodes: [{ id: "2" }], pageInfo: { hasNextPage: false, endCursor: null } } }, rateLimit: { cost: 1, remaining: 98, resetAt: "2030-01-01T00:00:00Z" } } })]);
    const client = new GitHubClient({ token: "t", fetch: mock.fetch });
    const nodes = await client.collectGraphQL(query, {}, data => (data as any).viewer.repositories);
    expect(nodes).toEqual([{ id: "1" }, { id: "2" }]);
    expect(client.rateLimit?.resource).toBe("graphql");
  });

  test("rejects a repeated GraphQL cursor", async () => {
    const page = { data: { connection: { nodes: [], pageInfo: { hasNextPage: true, endCursor: "same" } }, rateLimit: { cost: 1, remaining: 1, resetAt: "2030-01-01T00:00:00Z" } } };
    const mock = scripted([json(page), json(page)]);
    const client = new GitHubClient({ token: "t", fetch: mock.fetch });
    expect(client.collectGraphQL("query($cursor:String){connection{nodes pageInfo{hasNextPage endCursor}} rateLimit{cost remaining resetAt}}", {}, data => (data as any).connection)).rejects.toThrow("repeated GraphQL cursor");
  });
});
