import { describe, expect, it } from "bun:test";
import { renderWorkflowTemplate } from "../../src/ci/templates.ts";
import { DEFAULT_PIPELINE_REF, DEFAULT_PIPELINE_REPO } from "../../src/install/pipeline-defaults.ts";
import { repoConfig } from "./pipeline-source.ts";

/**
 * These constants are the last-resort defaults for a consumer that named neither the pipeline
 * repository nor its ref. They are code constants rather than configuration because a consumer's
 * own `repo.dfconfig` declares its upstream, not the pipeline's identity — but they describe *this*
 * repository, so they are anchored to what `repo.dfconfig` declares. If the assertions below fail,
 * the constant is wrong, not the declaration.
 */
describe("Default pipeline source", () => {
	it("defaults the pipeline ref to the declared default branch", () => {
		expect(DEFAULT_PIPELINE_REF).toBe(repoConfig().identity.default_branch);
	});

	it("defaults the pipeline repository to the declared slug", () => {
		const { owner, repo } = repoConfig().identity;
		expect(DEFAULT_PIPELINE_REPO).toBe(`${owner}/${repo}`);
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
