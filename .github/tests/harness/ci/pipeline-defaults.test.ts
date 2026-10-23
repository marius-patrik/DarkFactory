import { describe, expect, it } from "bun:test";
import { renderWorkflowTemplate } from "../../src/ci/templates.ts";
import { DEFAULT_PIPELINE_REF, DEFAULT_PIPELINE_REPO } from "../../src/install/pipeline-defaults.ts";
import { repoConfig, repoRoot } from "./pipeline-source.ts";

/**
 * The `owner/name` this repository's `origin` points at, or undefined when it has none.
 *
 * Both HTTPS and SSH forms are accepted, and an optional `.git` suffix is trimmed, because a
 * developer may have either configured and neither says anything about the repository's name.
 *
 * @returns `owner/name`.
 * @throws When the remote cannot be read or carries no recognisable `owner/name`.
 */
function gitRemoteSlug(): string {
	const url = Bun.spawnSync(["git", "remote", "get-url", "origin"], { cwd: repoRoot }).stdout.toString().trim();

	// Split rather than pattern-match, because the two forms disagree about where the owner starts:
	// `https://github.com/owner/repo` puts it behind a host and a scheme, and
	// `git@github.com:owner/repo` puts it behind a colon. Taking the last two segments gives the same
	// answer for both, and a remote with no `/` in it is not a remote this can speak for.
	const segments = url.replace(/\.git$/u, "").split(/[:/]/u);
	if (segments.length < 2) {
		// Asserted rather than skipped: a remote this cannot read means the checks below cannot run,
		// and a check that quietly stops running is how the drift it exists to catch comes back.
		throw new Error(`could not read owner/name from the origin remote (got ${JSON.stringify(url)})`);
	}

	return `${segments[segments.length - 2]}/${segments[segments.length - 1]}`;
}

/**
 * These constants are the last-resort defaults for a consumer that named neither the pipeline
 * repository nor its ref. They are code constants rather than configuration because a consumer's
 * own `repo.dfconfig` declares its upstream, not the pipeline's identity — but they describe *this*
 * repository, so they are anchored to what `repo.dfconfig` declares. If the assertions below fail,
 * the constant is wrong, not the declaration.
 *
 * That anchoring has a limit worth naming: it compares two things this repository says about
 * itself. When the repository was renamed on GitHub and the rename did not take, both the
 * declaration and the constant were updated together and this suite stayed green, because agreement
 * between them is exactly what it checks. `the_declared_slug_is_the_repository_git_thinks_it_is`
 * closes that, by asking git rather than the declaration.
 */
describe("Default pipeline source", () => {
	it("defaults the pipeline ref to the declared default branch", () => {
		expect(DEFAULT_PIPELINE_REF).toBe(repoConfig().identity.default_branch);
	});

	it("defaults the pipeline repository to the declared slug", () => {
		const { owner, repo } = repoConfig().identity;
		expect(DEFAULT_PIPELINE_REPO).toBe(`${owner}/${repo}`);
	});

	// The guard that would have caught the rename drift. `repo.dfconfig` said `agent-DarkFactory`
	// while GitHub said `DarkFactory`, and every assertion above compared the declaration to a
	// constant derived from the declaration, so all of them passed. Reading the remote asks GitHub
	// what this repository is called instead of asking the repository what it says it is called.
	//
	// `remote.origin.url` is checked rather than `gh repo view` so this runs offline in CI and in a
	// fresh clone, and so a stale declaration is caught before anything is pushed. The remote is
	// normally updated alongside the rename, which is what makes it usable as the authority here.
	it("the declared slug is the repository git thinks it is", () => {
		const { owner, repo } = repoConfig().identity;
		expect(`${owner}/${repo}`).toBe(gitRemoteSlug());
	});

	it("the default pipeline repository is the repository git thinks it is", () => {
		// The other half: the constant is what a consumer that named no upstream is pinned to, so it
		// has to name the repository that actually exists rather than the one the declaration says.
		expect(DEFAULT_PIPELINE_REPO).toBe(gitRemoteSlug());
	});

	it("renders a dispatch ref that resolves when the caller names none", () => {
		const rendered = renderWorkflowTemplate("df-dispatch.yml", {});

		expect(rendered).toContain(`uses: ${DEFAULT_PIPELINE_REPO}/.github/workflows/agent.yml@${DEFAULT_PIPELINE_REF}`);
		// A `uses:` line with a dangling `@` is not a legal action reference.
		expect(rendered).not.toMatch(/\.github\/workflows\/agent\.yml@"$/m);
	});

	it("renders a pinned runtime checkout that resolves when the caller names none", () => {
		const rendered = renderWorkflowTemplate("ci.yml", {});

		expect(rendered).toContain(`ref: "${DEFAULT_PIPELINE_REF}"`);
	});

	// The regression that motivated anchoring these constants: `interpolateTemplate` used to fall
	// back to the literal "darkfactory", a branch that does not exist on the remote. Every consumer
	// that installed without naming a ref rendered workflows pinned to it, so the dispatch could not
	// find the reusable workflow and the runtime checkout failed.
	it("never renders the retired darkfactory branch", () => {
		for (const name of ["ci.yml", "df-dispatch.yml", "verify-bound-issue.yml"] as const) {
			const rendered = renderWorkflowTemplate(name, {});
			expect(rendered).not.toContain("@darkfactory");
			expect(rendered).not.toContain('ref: "darkfactory"');
		}
	});
});

describe("declared credential names", () => {
	// `AGENT_ENABLED` and `GH_PROJECT_TOKEN` were spelled as literals in the workflow that reads them, in
	// the configuration issue that tells a person to create them, and in this suite. The `AGENT_ENABLED`
	// comment in `callers.ts` argues that the *switch* belongs in a variable rather than a manifest key,
	// which is right and is not an argument about the *name*: a name is a fact about the repository, and
	// the reader, the issuer and the re-installer have to spell it the same way.
	it("declares the names rather than leaving them stranded", () => {
		expect(repoConfig().app.credentials?.agent_enabled_variable).toBe("AGENT_ENABLED");
		expect(repoConfig().app.credentials?.project_token_secret).toBe("GH_PROJECT_TOKEN");
	});

	// The App key already has a home - `app.private_key_secret` - so the credentials block must not become a
	// second place it is spelled. #2045 moved the reinstaller to read that declaration; this asserts the
	// duplication has not crept back.
	it("does not repeat the App key, which already has a home", () => {
		const credentials = repoConfig().app.credentials as Record<string, unknown>;
		const appKey = repoConfig().app.private_key_secret;

		for (const [key, value] of Object.entries(credentials)) {
			expect(String(value), `credentials.${key} repeats app.private_key_secret`).not.toBe(appKey);
		}
	});

	it("tells a person where the names are declared", () => {
		// The configuration issue is where someone goes to find out what to create. A name appearing there
		// with no pointer to its declaration is the duplication this whole change removes.
		expect(repoConfig().app.credentials?.project_token_secret).toBeTruthy();
	});
});
