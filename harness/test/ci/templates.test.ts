import { describe, expect, it } from "bun:test";
import { parseManagedHeader, renderWorkflowTemplate, verifyWorkflowHash } from "../../src/ci/templates.ts";
import * as yaml from "yaml";

describe("Workflow templates & managed headers", () => {
	it("renders detector-driven CI with pinned runtime and stable aggregate quality", () => {
		const rendered = renderWorkflowTemplate("ci.yml", {
			pipeline_repo: "marius-patrik/DarkFactory",
			pipeline_ref: "abc1234def5678",
			default_branch: "trunk",
		});

		expect(rendered).toContain("# managed-by: darkfactory ci.yml@");
		expect(rendered).toContain('repository: "marius-patrik/DarkFactory"');
		expect(rendered).toContain('ref: "abc1234def5678"');
		expect(rendered).toContain("Resolve detected quality matrix");
		expect(rendered).toContain("fromJSON(needs.detect.outputs.matrix)");
		expect(rendered).toContain("Build native documentation");
		expect(rendered).toContain("name: quality");
		expect(rendered).not.toContain("uses: marius-patrik/DarkFactory/.github/workflows/ci.yml");

		const parsed = parseManagedHeader(rendered);
		expect(parsed?.template).toBe("ci.yml");
		expect(parsed?.hash.length).toBe(64);
		expect(verifyWorkflowHash(rendered)).toMatchObject({ status: "valid", hashMatches: true });

		// Assert parsed trigger structure instead of substring
		const workflow = yaml.parse(rendered);
		expect(workflow.on.push.branches).toEqual(["trunk", "refactor/*", "finish/*"]);
		expect(workflow.on.pull_request.types).toEqual(["opened", "synchronize", "reopened", "base_ref_changed"]);
		expect(workflow.on.merge_group).toBeNull();
	});

	it("generated bound-issue workflow accepts nonterminal Request bindings", () => {
		const rendered = renderWorkflowTemplate("verify-bound-issue.yml");
		expect(rendered).toContain("advance|advances|advanced");
		expect(rendered).toContain("Advances for partial delivery");
		expect(rendered).toContain("closing syntax for terminal delivery");
	});

	it("detects user-edited file with hash mismatch", () => {
		const rendered = renderWorkflowTemplate("verify-bound-issue.yml", {
			pipeline_repo: "marius-patrik/DarkFactory",
			pipeline_ref: "darkfactory",
		});
		const verification = verifyWorkflowHash(rendered + "\n# user added comment\n");
		expect(verification.status).toBe("modified");
		expect(verification.hashMatches).toBe(false);
	});

	it("identifies unmanaged workflow without managed header", () => {
		const unmanaged = "name: Custom Workflow\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n";
		expect(parseManagedHeader(unmanaged)).toBeNull();
		expect(verifyWorkflowHash(unmanaged).status).toBe("unmanaged");
	});
});
