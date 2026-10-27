import { describe, expect, test } from "bun:test";
import {
	classifyReadFailure, createGitHubOperatorSource, OperatorHttpError, repositoryIdentity,
} from "../../../packages/web/src/operator-data.ts";
import { safeGitHubLink } from "../../../packages/web/src/operator-views.tsx";

describe("browser-safe GitHub reads", () => {
	test("rejects cross-repository and URL-like slugs", () => {
		expect(() => repositoryIdentity("alice/repo")).not.toThrow();
		for (const value of ["https://github.com/a/b", "alice/repo/secret", "../repo", "a/..", "a/b?x=1"]) {
			expect(() => repositoryIdentity(value)).toThrow();
		}
	});
	test("requests live repository metadata without placing a token on the wire", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(url), init });
			return new Response(JSON.stringify({
				full_name: "alice/product", description: "Real repository",
				default_branch: "main", private: false, html_url: "https://github.com/alice/product",
				open_issues_count: 7, updated_at: "2026-10-27T00:00:00Z",
			}), { status: 200, headers: { "Content-Type": "application/json" } });
		}) as typeof fetch;
		const source = createGitHubOperatorSource("alice/product", { fetch: fetcher });
		const state = await source.read("repository");
		expect(state.status).toBe("live");
		if (state.status !== "live") throw new Error("expected live");
		expect(state.data).toMatchObject({ fullName: "alice/product", defaultBranch: "main" });
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe("https://api.github.com/repos/alice/product");
		expect(JSON.stringify(calls)).not.toContain("Bearer");
		expect(calls[0]?.init?.method).toBe("GET");
	});
	test("filters pull requests from the GitHub issues endpoint and discloses incomplete paging", async () => {
		const payload = [
			{ number: 1, title: "Real request", html_url: "https://github.com/a/b/issues/1", state: "open", labels: [{ name: "Request" }] },
			{ number: 2, title: "PR masquerading as issue", pull_request: {}, labels: [{ name: "Request" }] },
		];
		const source = createGitHubOperatorSource("a/b", {
			fetch: (async () => new Response(JSON.stringify(payload), { status: 200 })) as typeof fetch,
		});
		const state = await source.read("requests");
		expect(state.status).toBe("live");
		if (state.status !== "live" || !("items" in state.data)) throw new Error("expected collection");
		expect(state.data.items.map((x) => x.title)).toEqual(["Real request"]);
		expect(state.data.note).toContain("not authoritative workflow approvals");
	});
	test("distinguishes authorization, throttling and unavailable integration", async () => {
		expect(classifyReadFailure(new OperatorHttpError(401))).toMatchObject({ status: "unauthorized" });
		expect(classifyReadFailure(new OperatorHttpError(403))).toMatchObject({ status: "unauthorized" });
		expect(classifyReadFailure(new OperatorHttpError(429))).toMatchObject({ status: "rate-limited" });
		expect(classifyReadFailure(new OperatorHttpError(503))).toMatchObject({ status: "failed" });
		const source = createGitHubOperatorSource("a/b");
		expect((await source.read("projects")).status).toBe("blocked");
		expect((await source.read("graph")).status).toBe("blocked");
		expect((await source.read("quota")).status).toBe("blocked");
	});
	test("does not allow malicious HTML/JS link values into operator links", () => {
		expect(safeGitHubLink("javascript:alert(1)")).toBeUndefined();
		expect(safeGitHubLink("https://github.com.evil.example/a")).toBeUndefined();
		expect(safeGitHubLink("https://github.com/a/b/issues/1")).toContain("github.com/a/b/issues/1");
	});
});
