import { describe, expect, test } from "bun:test";
import {
	classifyReadFailure,
	createGitHubOperatorSource,
	OperatorHttpError,
	repositoryIdentity,
} from "../../../packages/web/src/operator-data.ts";
import { safeGitHubLink } from "../../../packages/web/src/operator-views.tsx";

describe("browser-safe GitHub reads", () => {
	test("rejects malformed and cross-origin identities", () => {
		expect(repositoryIdentity("alice/repo").slug).toBe("alice/repo");
		for (const value of ["https://github.com/a/b", "alice/repo/secret", "../repo", "a/..", "a/b?x=1"])
			expect(() => repositoryIdentity(value)).toThrow();
		expect(safeGitHubLink("https://github.com/alice/repo/issues/1", "alice/repo")).toContain("github.com");
		expect(safeGitHubLink("https://github.com/other/repo", "alice/repo")).toBeUndefined();
		expect(safeGitHubLink("javascript:alert(1)", "alice/repo")).toBeUndefined();
	});
	test("requests real metadata without token, cookie, or cross-origin credential", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(url), init });
			return new Response(
				JSON.stringify({
					full_name: "alice/product",
					default_branch: "main",
					private: false,
					html_url: "https://github.com/alice/product",
					open_issues_count: 7,
					updated_at: "2026-10-27T00:00:00Z",
				}),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;
		const source = createGitHubOperatorSource("alice/product", { fetch: fetcher });
		const state = await source.read("repository");
		expect(state.status).toBe("live");
		if (state.status === "live") {
			expect(state.data).toHaveProperty("fullName", "alice/product");
			expect(state.limited).toBe(false);
		}
		expect(calls[0]?.url).toBe("https://api.github.com/repos/alice/product/");
		expect(calls[0]?.init?.credentials).toBe("omit");
		expect(JSON.stringify(calls)).not.toContain("Authorization");
	});
	test("never invents durable graph or quota snapshots", async () => {
		const source = createGitHubOperatorSource("alice/product", {
			fetch: (async () => {
				throw new Error("must not fetch");
			}) as unknown as typeof fetch,
		});
		for (const id of ["graph", "recovery", "projects", "quota", "docs"] as const)
			expect((await source.read(id)).status).toBe("blocked");
	});
	test("labels filter only observed first-page GitHub issues", async () => {
		const source = createGitHubOperatorSource("alice/product", {
			fetch: (async () =>
				new Response(
					JSON.stringify([
						{
							number: 1,
							title: "Request one",
							labels: [{ name: "Request" }],
							html_url: "https://github.com/alice/product/issues/1",
						},
						{
							number: 2,
							title: "Non-request",
							labels: [{ name: "bug" }],
							html_url: "https://github.com/alice/product/issues/2",
						},
					]),
				)) as unknown as typeof fetch,
		});
		const result = await source.read("requests");
		expect(result.status).toBe("live");
		if (result.status === "live" && "items" in result.data) expect(result.data.items.map((x) => x.id)).toEqual([1]);
	});
	test("paginates tokenless GitHub collections and never treats a filtered empty page as complete", async () => {
		const urls: string[] = [];
		const source = createGitHubOperatorSource("alice/product", {
			fetch: (async (url: string | URL | Request) => {
				urls.push(String(url));
				const page = new URL(String(url)).searchParams.get("page");
				const rows =
					page === "2"
						? Array.from({ length: 50 }, (_, index) => ({
								id: index + 101,
								number: index + 101,
								title: `Issue ${index + 101}`,
								labels: [{ name: "bug" }],
								html_url: `https://github.com/alice/product/issues/${index + 101}`,
							}))
						: [];
				return new Response(JSON.stringify(rows));
			}) as unknown as typeof fetch,
		});
		const second = await source.read("requests", undefined, 2);
		expect(second.status).toBe("live");
		if (second.status === "live" && "items" in second.data) {
			expect(second.data.items).toHaveLength(0);
			expect(second.data.page).toBe(2);
			expect(second.data.morePossible).toBe(true);
			expect(second.limited).toBe(true);
		}
		const third = await source.read("requests", undefined, 3);
		expect(third.status).toBe("live");
		if (third.status === "live" && "items" in third.data) {
			expect(third.data.morePossible).toBe(false);
			expect(third.data.page).toBe(3);
		}
		expect(urls).toEqual([
			"https://api.github.com/repos/alice/product/issues?state=all&per_page=50&page=2",
			"https://api.github.com/repos/alice/product/issues?state=all&per_page=50&page=3",
		]);
		expect((await source.read("requests", undefined, 0)).status).toBe("blocked");
		expect(urls).toHaveLength(2);
	});
	test("maps permission and rate limits to explicit non-success states", () => {
		expect(classifyReadFailure(new OperatorHttpError(401)).status).toBe("unauthorized");
		expect(classifyReadFailure(new OperatorHttpError(404)).status).toBe("blocked");
		expect(classifyReadFailure(new OperatorHttpError(403, "retry-later")).status).toBe("rate-limited");
		expect(classifyReadFailure(new Error("token=secret")).status).toBe("failed");
		expect(JSON.stringify(classifyReadFailure(new Error("token=secret")))).not.toContain("secret");
	});
});
