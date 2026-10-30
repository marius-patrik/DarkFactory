import { describe, expect, test } from "bun:test";
import {
	classifyReadFailure,
	createGitHubOperatorSource,
	OperatorHttpError,
	repositoryIdentity,
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
			return new Response(
				JSON.stringify({
					full_name: "alice/product",
					description: "Real repository",
					default_branch: "main",
					private: false,
					html_url: "https://github.com/alice/product",
					open_issues_count: 7,
					updated_at: "2026-10-27T00:00:00Z",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}) as unknown as typeof fetch;
		const source = createGitHubOperatorSource("alice/product", { fetch: fetcher });
		const state = await source.read("repository");
		expect(state.status).toBe("live");
		if (state.status !== "live"¶»§q«^