import { describe, expect, it } from "bun:test";
import { renderWorkflowTemplate, parseManagedHeader, verifyWorkflowHash, computeContentHash } from "../../src/ci/templates.ts";

describe("Workflow templates & managed headers", () => {
	it("renders template with variables and prepends managed header", () => {
		const rendered = renderWorkflowTemplate("ci.yml", {
			pipeline_repo: "marius-patrik/DarkFactory",
			pipeline_ref: "abc1234def5678",
		});

		expect(rendered).toContain("# managed-by: darkfactory ci.yml@");
		expect(rendered).toContain("sha256:");
		expect(rendered).toContain("uses: marius-patrik/DarkFactory/.github/workflows/ci.yml@abc1234def5678");

		const parsed = parseManagedHeader(rendered);
		expect(parsed).not.toBeNull();
		expect(parsed?.template).toBe("ci.yml");
		expect(parsed?.hash.length).toBe(64);

		const verification = verifyWorkflowHash(rendered);
		expect(verification.status).toBe("valid");
		expect(verification.hashMatches).toBe(true);
	});

	it("detects user-edited file with hash mismatch", () => {
		const rendered = renderWorkflowTemplate("verify-bound-issue.yml", {
			pipeline_repo: "marius-patrik/DarkFactory",
			pipeline_ref: "main",
		});

		// Simulate user editing the workflow body
		const tampered = rendered + "\n# user added comment\n";
		const verification = verifyWorkflowHash(tampered);
		expect(verification.status).toBe("modified");
		expect(verification.hashMatches).toBe(false);
	});

	it("identifies unmanaged workflow without managed header", () => {
		const unmanagedContent = "name: Custom Workflow\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n";
		const parsed = parseManagedHeader(unmanagedContent);
		expect(parsed).toBeNull();

		const verification = verifyWorkflowHash(unmanagedContent);
		expect(verification.status).toBe("unmanaged");
	});
});
