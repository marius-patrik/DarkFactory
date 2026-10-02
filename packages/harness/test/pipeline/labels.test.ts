import { describe, expect, test } from "bun:test";
import { type AreaTaxonomy, classifyTypeAndArea, TYPE_LABELS, type TypeLabel } from "../../src/pipeline/labels.ts";
import { formatConventionalCommit } from "../../src/pipeline/pr-body.ts";

/**
 * The taxonomy this repository declares in `repo.dfconfig`, in declaration order: the first area
 * whose keywords hit wins, so the specific areas come before the general ones.
 */
const DARKFACTORY: AreaTaxonomy = {
	defaultArea: "ci",
	areaKeywords: {
		agents: ["agent", "harness", "persona", "provider", "llm", "prompt", "approval", "model", "quota"],
		governance: ["governance", "rule", "protection", "policy", "board", "taxonomy", "label", "permission"],
		release: ["release", "version", "versioning", "tag", "semver", "changelog", "package", "artifact"],
		docs: ["doc", "docs", "documentation", "tsdoc", "typedoc", "content", "readme", "site"],
		ci: ["ci", "action", "workflow", "pipeline", "docker", "runner", "automation", "container"],
	},
};

describe("classifyTypeAndArea: area", () => {
	test.each([
		["Define the provider adapter contract for the agent harness", "area:agents"],
		["The quota fallback picks the wrong model", "area:agents"],
		["Tighten branch protection and the board taxonomy", "area:governance"],
		["Every label should come from one declaration", "area:governance"],
		["Pick the versioning mode per repository", "area:release"],
		["Attach build artifacts to the tag", "area:release"],
		["Fix the typedoc build", "area:docs"],
		["The content graph fails on documentation pages", "area:docs"],
		["Harden the docker runner workflow", "area:ci"],
		["Something entirely unclassifiable", "area:ci"],
	])("routes %j to %j", (text: string, expected: string) => {
		expect(classifyTypeAndArea(text, DARKFACTORY).area).toBe(expected);
	});
});

describe("classifyTypeAndArea: type", () => {
	/** Typed as the label union so `.toBe` compares against a label, not against any string. */
	const CASES: [string, TypeLabel][] = [
		["Fix the crash on startup", "bug"],
		["Document the substrate bus", "docs"],
		["Refactor the palette resolver", "refactor"],
		["Bump the pinned dependencies", "chore"],
		["Add a new brand preset", "feat"],
		["Add retry when the upload fails", "feat"],
		["Improve error handling in the upload path", "feat"],
		["A regression in auth breaks login", "bug"],
		["The login form is broken", "bug"],
	];

	test.each(CASES)("classifies %j as %j", (text: string, expected: TypeLabel) => {
		expect(classifyTypeAndArea(text, DARKFACTORY).type).toBe(expected);
	});

	test("the issue form's Request Type declaration wins over prose keywords", () => {
		const body =
			"### Verbatim User Request\n\nAdd failover when the upload fails and improve error handling.\n\n" +
			"### Request Type\n\nfeat (new feature)\n\n### Additional Context\n\nA crash was mentioned only as prior art.\n";
		expect(classifyTypeAndArea(body, DARKFACTORY).type).toBe("feat");
	});

	test("a declared bug stays a bug even when the prose reads like a feature", () => {
		const body =
			"### Request Type\n\nbug (bug fix)\n\n### Verbatim User Request\n\nAdd clearer messages when retries succeed.\n";
		expect(classifyTypeAndArea(body, DARKFACTORY).type).toBe("bug");
	});

	test("an undeclared Request Type falls back to the keywords", () => {
		const body = "### Request Type\n\nspike\n\n### Verbatim User Request\n\nThe login form is broken.\n";
		expect(classifyTypeAndArea(body, DARKFACTORY).type).toBe("bug");
	});
});

test("a classifier that invents a label produces an unlabelable issue", () => {
	const samples = [
		"add a thing",
		"fix a crash in the daemon",
		"refactor the palette resolver",
		"document the bus",
		"bump dependencies",
		"add tests for the codec",
		"wire up a workflow",
	];
	for (const sample of samples) {
		const { type, area } = classifyTypeAndArea(sample, DARKFACTORY);
		expect(TYPE_LABELS).toContain(type);
		expect(DARKFACTORY.areaKeywords[area.replace("area:", "")]).toBeDefined();
	}
});

describe("formatConventionalCommit", () => {
	test("bug is a label; fix is the commit type, and the mapping must not leak", () => {
		expect(formatConventionalCommit("bug", "area:governance", "Correct the codec")).toBe(
			"fix(governance): correct the codec",
		);
		expect(formatConventionalCommit("feat", "area:agents", "Add cell buffer")).toBe("feat(agents): add cell buffer");
	});

	test("every occurrence of the area prefix is stripped, not just the first", () => {
		expect(formatConventionalCommit("feat", "area:area:agents", "Add cell buffer")).toBe(
			"feat(agents): add cell buffer",
		);
	});

	test("a description that is already lowercase is left alone", () => {
		expect(formatConventionalCommit("docs", "docs", "document the bus")).toBe("docs(docs): document the bus");
	});
});
