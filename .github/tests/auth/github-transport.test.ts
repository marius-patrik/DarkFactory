import { describe, expect, test } from "bun:test";
import { ScopedGitHubAppTransport } from "../../../packages/auth/src/github-transport.ts";

function json(value: unknown, status = 200): Response {
	return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function transport(requests: { url: string; init?: RequestInit }[], selected = true) {
	return new ScopedGitHubAppTransport({
		appId: "app", privateKey: "TEST-ONLY-NOT-AN-ACTUAL-KEY",
		appJwtForRepository: async () => "TEST-JWT",
		fetcher: async (url, init) => {
			requests.push({ url, init });
			if (url.endsWith("/user")) return json({ login: "octocat", id: 1 });
			if (url.endsWith("/repos/org/repo")) return json({
				full_name: "org/repo", permissions: { admin: false, push: true, pull: true },
			});
			if (url.endsWith("/installation")) return selected
				? json({ id: 123, permissions: { issues: "write", contents: "read" } })
				: json({}, 404);
			if (url.endsWith("/access_tokens")) return json({ token: "SCOPED-TEST-TOKEN", repositories: [{ name: "repo" }] });
			if (url.endsWith("/issues/3")) return json({ updated_at: "2026-10-31T00:00:00Z" });
			if (url.endsWith("/issues/3/comments")) return json({ id: 19 });
			if (url.endsWith("/issues/comments/19")) return json({
				id: 19, issue_url: "https://api.github.com/repos/org/repo/issues/3", body: "hello",
			});
			throw new Error("Unexpected GitHub fixture endpoint");
		},
	});
}
describe("scoped GitHub App broker transport", () => {
	test("intersects GitHub user access with exact repository App installation", async () => {
		const requests: { url: string; init?: RequestInit }[] = [];
		const service = transport(requests);
		const authority = await service.authority({ userToken: "USER-TEST-TOKEN", userId: "octocat", repository: "org/repo" });
		expect(authority.appAuthority.canWrite).toBe(true);
		expect(authority.userPermissions.push).toBe(true);
		const created = await service.createComment({ repository: "org/repo", issue: 3, body: "hello", userId: "octocat" });
		expect(created.id).toBe(19);
		const mint = requests.find((request) => request.url.endsWith("/access_tokens"));
		expect(JSON.parse(String(mint?.init?.body))).toEqual({ repositories: ["repo"], permissions: { issues: "write" } });
		const readback = await service.readComment({ repository: "org/repo", issue: 3, commentId: 19, userId: "octocat" });
		expect(readback?.body).toBe("hello");
	});
	test("cross-tenant GitHub user identity cannot inherit an existing browser session", async () => {
		const service = transport([]);
		await expect(service.authority({ userToken: "USER", userId: "another-user", repository: "org/repo" }))
			.rejects.toThrow("identity changed");
	});
	test("authoritative readback rejects a comment bound to a different repository", async () => {
		const service = new ScopedGitHubAppTransport({
			appId: "app", privateKey: "TEST-ONLY",
			appJwtForRepository: async () => "TEST-JWT",
			fetcher: async (url) => {
				if (url.endsWith("/installation")) return json({ id: 123, permissions: { issues: "read" } });
				if (url.endsWith("/access_tokens")) return json({ token: "SCOPED-TEST", repositories: [{ name: "repo" }] });
				if (url.endsWith("/issues/comments/19")) return json({
					id: 19, body: "hello", issue_url: "https://api.github.com/repos/other/repo/issues/3",
				});
				throw new Error("Unknown GitHub API fixture");
			},
		});
		expect(await service.readComment({ repository: "org/repo", issue: 3, commentId: 19, userId: "octocat" }))
			.toBeUndefined();
	});
	test("missing installation fails closed instead of granting mutations", async () => {
		const service = transport([], false);
		const authority = await service.authority({ userToken: "USER", userId: "octocat", repository: "org/repo" });
		expect(authority.appAuthority.canWrite).toBe(false);
		await expect(service.createComment({ repository: "org/repo", issue: 3, body: "hello", userId: "octocat" }))
			.rejects.toThrow("installation unavailable");
	});
});
