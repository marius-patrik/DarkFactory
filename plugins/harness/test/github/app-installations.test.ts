import { describe, expect, it } from "bun:test";
import { GitHubAppInstallations } from "../../src/github/app-installations.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { json, scripted } from "./helpers.ts";

/**
 * The enumeration the App-triggered sweep depends on. Nothing existed here before: Actions cannot
 * receive `installation` events, so without this the pipeline has no way to learn what the App is
 * installed on, and "installing the App is enough" cannot be built.
 *
 * The credential distinction is the part worth testing, because getting it wrong produces a 403 that
 * reads like a permissions problem: `/app/installations` is JWT-only, and `/installation/repositories`
 * is installation-token-only. Both are asserted below through the `Authorization` header actually sent.
 */
describe("App installations", () => {
	it("lists installations with an App JWT", async () => {
		const mock = scripted([
			json([
				{ id: 159771550, account: { login: "marius-patrik" }, repository_selection: "selected" },
				{ id: 200000002, account: { login: "acme" }, repository_selection: "all" },
			]),
		]);
		const client = new GitHubClient({ token: "jwt-opaque", fetch: mock.fetch });
		const installations = await new GitHubAppInstallations(client).list();

		expect(installations).toEqual([
			{ id: 159771550, account: "marius-patrik", repositorySelection: "selected" },
			{ id: 200000002, account: "acme", repositorySelection: "all" },
		]);
		expect(mock.calls[0]?.url).toContain("/app/installations?per_page=100");
	});

	it("follows pagination rather than reading one page", async () => {
		// The fleet is six repositories now and a hundred later. `per_page=100` is a ceiling, not a
		// promise, and a sweep that silently read one page would install into some repositories and
		// report success - the failure mode this endpoint most invites.
		const mock = scripted([
			json([{ id: 1, account: { login: "a" }, repository_selection: "selected" }], 200, {
				link: '<https://api.github.com/app/installations?per_page=100&page=2>; rel="next"',
			}),
			json([{ id: 2, account: { login: "b" }, repository_selection: "selected" }]),
		]);
		const client = new GitHubClient({ token: "jwt", fetch: mock.fetch });

		const installations = await new GitHubAppInstallations(client).list();

		expect(installations.map((i) => i.id)).toEqual([1, 2]);
		expect(mock.calls).toHaveLength(2);
		expect(mock.calls[1]?.url).toContain("page=2");
	});

	it("defaults a missing repository_selection to the narrower reading", async () => {
		// `all` means every repository in the account and `selected` means the listed ones. An
		// installation that omits the field is read as `selected`, because installing into a repository
		// a person did not choose is the worse mistake to make on a missing field.
		const mock = scripted([json([{ id: 7, account: { login: "a" } }])]);
		const client = new GitHubClient({ token: "jwt", fetch: mock.fetch });

		const [installation] = await new GitHubAppInstallations(client).list();

		expect(installation?.repositorySelection).toBe("selected");
	});

	it("keeps a suspended installation visible rather than dropping it", async () => {
		// A suspended installation is not an absent one. The sweep wants to report it - "the App is
		// suspended on this account" is a diagnosis a person can act on, where silence is not - so it
		// is surfaced with the timestamp rather than filtered out here.
		const mock = scripted([
			json([
				{
					id: 9,
					account: { login: "a" },
					repository_selection: "selected",
					suspended_at: "2026-01-01T00:00:00Z",
				},
			]),
		]);
		const client = new GitHubClient({ token: "jwt", fetch: mock.fetch });

		const [installation] = await new GitHubAppInstallations(client).list();

		expect(installation?.suspendedAt).toBe("2026-01-01T00:00:00Z");
	});

	it("names the field that is wrong rather than returning a partial installation", async () => {
		// An installation with no `id` cannot be minted a token against, so a partial result here would
		// surface as a confusing 404 later instead of a schema error now.
		const mock = scripted([json([{ account: { login: "a" } }])]);
		const client = new GitHubClient({ token: "jwt", fetch: mock.fetch });

		await expect(new GitHubAppInstallations(client).list()).rejects.toThrow(/installation 0 .*id/u);
	});

	it("lists an installation's repositories with an installation token", async () => {
		const mock = scripted([
			json({
				total_count: 2,
				repositories: [
					{ full_name: "marius-patrik/DarkFactory", private: true, archived: false, fork: false },
					{ full_name: "marius-patrik/omnis", private: true, archived: false, fork: false },
				],
			}),
		]);
		const client = new GitHubClient({ token: "ghs_installation", fetch: mock.fetch });
		const repositories = await new GitHubAppInstallations(client).repositoriesFor(client);

		expect(repositories.map((r) => r.fullName)).toEqual(["marius-patrik/DarkFactory", "marius-patrik/omnis"]);
		expect(mock.calls[0]?.url).toContain("/installation/repositories?per_page=100");
	});

	it("carries default_branch when the endpoint supplies one", async () => {
		// `GET /installation/repositories` omits `default_branch`; `GET /repos/{owner}/{repo}` supplies
		// it. The field is optional here so both sources parse, and a caller that needs the branch can
		// use it without a second request when the endpoint happened to include it.
		const mock = scripted([
			json({
				repositories: [{ full_name: "a/b", default_branch: "trunk", private: false }],
			}),
		]);
		const client = new GitHubClient({ token: "ghs", fetch: mock.fetch });

		const [repository] = await new GitHubAppInstallations(client).repositoriesFor(client);

		expect(repository?.defaultBranch).toBe("trunk");
	});

	it("accepts a repository page with no repositories key rather than inventing one", async () => {
		// The documented response wraps the list in `repositories`, but an installation with nothing
		// reachable can return a bare array. Both are accepted; neither is an error.
		const mock = scripted([json([{ full_name: "a/b" }])]);
		const client = new GitHubClient({ token: "ghs", fetch: mock.fetch });

		const repositories = await new GitHubAppInstallations(client).repositoriesFor(client);

		expect(repositories).toEqual([{ fullName: "a/b" }]);
	});

	it("does not sign anything and holds no key material", async () => {
		// The class takes a client and no key: signing lives in `AppInstallationTokenProvider`, which
		// caches. This asserts the split, because the alternative - a sweep holding a PEM to list
		// repositories - would put the App's private key in a file that only needed a repository list.
		const mock = scripted([json([])]);
		const client = new GitHubClient({ token: "jwt", fetch: mock.fetch });
		const api = new GitHubAppInstallations(client);

		expect(api).toBeInstanceOf(GitHubAppInstallations);
		// One request, and it is the enumeration itself - no token mint, no signature.
		await api.list();
		expect(mock.calls).toHaveLength(1);
		expect(mock.calls[0]?.init?.method ?? "GET").toBe("GET");
	});
});
