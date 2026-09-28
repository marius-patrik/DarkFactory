import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_STATUSES } from "@darkfactory/protocol/workflow";
import {
	appliedStatusOptions,
	boardStatusOptions,
	customStatusOptions,
	LEGACY_TODO_OPTION,
	statusOptionPayload,
	statusOptionsMatch,
} from "../../src/settings/board.ts";
import { assessRequiredChecks, protectionPaths, requiredStatusChecksBody } from "../../src/settings/required-checks.ts";
import {
	CONVENTIONAL_COMMIT_LABELS,
	type LabelDefinition,
	labelTaxonomy,
	PIPELINE_ROLE_LABELS,
	REQUIRED_SECRETS,
	STATUS_OPTIONS,
	statusLabels,
	statusPresentation,
	TRIAGE_LABELS,
} from "../../src/settings/taxonomy.ts";
import { APP_CAPABLE_PATHS, appCanAuthenticate, ghEnvironment } from "../../src/settings/token.ts";

/** The repository root, derived from this file rather than from the working directory. */
const REPO_ROOT = join(import.meta.dir, "..", "..", "..", "..");

/** The areas this repository declares, read the way the pipeline reads them. */
function declaredAreas(): Record<string, string> {
	const document = JSON.parse(readFileSync(join(REPO_ROOT, "repo.dfconfig"), "utf8")) as {
		repo: { areas?: Record<string, string | { description?: string }> };
	};
	const areas: Record<string, string> = {};
	for (const [name, value] of Object.entries(document.repo.areas ?? {})) {
		if (name.startsWith("$")) continue;
		areas[name] = typeof value === "string" ? value : (value?.description ?? "");
	}
	return areas;
}

/** The `area:`-prefixed labels the manifest derives, in the order the manifest derives them. */
function areaLabels(): LabelDefinition[] {
	return Object.entries(declaredAreas()).map(([area, description]) => ({
		name: `area:${area}`,
		colour: "000000",
		description,
	}));
}

describe("the status taxonomy is declared once", () => {
	it("takes the column order from the canonical list rather than restating it", () => {
		expect(STATUS_OPTIONS).toEqual([...CANONICAL_STATUSES]);
	});

	it("covers every canonical status, in order", () => {
		expect(statusLabels().map((entry) => entry.name)).toEqual([...CANONICAL_STATUSES]);
	});

	it("names every board option in the same order as the statuses", () => {
		expect(boardStatusOptions().map((entry) => entry.name)).toEqual([...CANONICAL_STATUSES]);
	});

	it("gives every status a hex label colour, a board colour and one description", () => {
		for (const status of CANONICAL_STATUSES) {
			const presentation = statusPresentation(status);
			expect(presentation.labelColour, `${status} label colour`).toMatch(/^[0-9a-f]{6}$/u);
			expect(presentation.boardColour, `${status} board colour`).toMatch(/^[A-Z]+$/u);
			expect(presentation.description.length, `${status} description`).toBeGreaterThan(0);
		}
	});

	it("gives the label and the board the same description, so the two cannot drift", () => {
		// The Python declared `Superseded` twice with two different sentences and nothing compared
		// them: "Outranked or superseded by a newer request or plan" on the label, "Outranked by a
		// newer request or plan" on the board. One description, read by both surfaces.
		for (const status of CANONICAL_STATUSES) {
			const label = statusLabels().find((entry) => entry.name === status);
			const option = boardStatusOptions().find((entry) => entry.name === status);
			expect(option?.description, `${status}`).toBe(label?.description);
		}
	});
});

describe("the label taxonomy", () => {
	const labels = labelTaxonomy(areaLabels());

	it("covers every canonical status, pipeline role, commit type and declared area", () => {
		const names = labels.map((entry) => entry.name);
		for (const status of CANONICAL_STATUSES) expect(names).toContain(status);
		for (const role of PIPELINE_ROLE_LABELS) expect(names).toContain(role.name);
		for (const type of CONVENTIONAL_COMMIT_LABELS) expect(names).toContain(type.name);
		for (const area of Object.keys(declaredAreas())) expect(names).toContain(`area:${area}`);
	});

	it("is exactly these four groups, with nothing declared twice", () => {
		const names = labels.map((entry) => entry.name);
		expect(new Set(names).size).toBe(names.length);
		expect(names).toHaveLength(
			CANONICAL_STATUSES.length +
				PIPELINE_ROLE_LABELS.length +
				CONVENTIONAL_COMMIT_LABELS.length +
				TRIAGE_LABELS.length +
				Object.keys(declaredAreas()).length,
		);
	});

	it("keeps the lifecycle statuses first, in board column order", () => {
		expect(labels.slice(0, CANONICAL_STATUSES.length).map((entry) => entry.name)).toEqual([...CANONICAL_STATUSES]);
	});

	it("declares no area of its own, so a repository's areas come from its configuration alone", () => {
		expect(labelTaxonomy().some((entry) => entry.name.startsWith("area:"))).toBe(false);
	});

	it("gives every label a hex colour and a description", () => {
		for (const label of labels) {
			expect(label.colour, label.name).toMatch(/^[0-9a-f]{6}$/u);
			expect(label.description.length, label.name).toBeGreaterThan(0);
		}
	});

	it("names the project token as a required secret, because the App cannot write a user board", () => {
		const token = REQUIRED_SECRETS.find((entry) => entry.name === "GH_PROJECT_TOKEN");
		expect(token?.why).toContain("Projects v2");
	});
});

describe("reconciling a board's Status column", () => {
	it("reports a matching column as needing no rewrite", () => {
		expect(statusOptionsMatch([...CANONICAL_STATUSES])).toBe(true);
	});

	it("reports a reordered column as needing a rewrite, because the columns are ordered", () => {
		const reordered = [...CANONICAL_STATUSES];
		reordered.reverse();
		expect(statusOptionsMatch(reordered)).toBe(false);
	});

	it("reports a short column as needing a rewrite", () => {
		expect(statusOptionsMatch(["Backlog", "ToDo"])).toBe(false);
	});

	it("refuses a rewrite that would delete a column somebody added by hand", () => {
		// A single-select field is replaced wholesale, so a custom column takes its items with it.
		expect(customStatusOptions(["Backlog", "Q4 Audit", "Done"])).toEqual(["Q4 Audit"]);
	});

	it("tolerates the legacy default column Projects v2 creates, so no board is blocked forever", () => {
		expect(customStatusOptions([LEGACY_TODO_OPTION, ...CANONICAL_STATUSES])).toEqual([]);
	});

	it("names every column that would be deleted, not just the first", () => {
		expect(customStatusOptions(["A", "B", "C"])).toEqual(["A", "B", "C"]);
	});

	it("sends the option set through one payload whose names are the canonical ones", () => {
		const payload = statusOptionPayload("PVTSSF_lADO");
		expect(payload.variables.fieldId).toBe("PVTSSF_lADO");
		expect(payload.variables.options.map((entry) => entry.name)).toEqual([...CANONICAL_STATUSES]);
		expect(payload.query).toContain("updateProjectV2Field");
	});

	it("reads the applied options back out of the mutation response", () => {
		const response = {
			updateProjectV2Field: { projectV2Field: { options: CANONICAL_STATUSES.map((name) => ({ name })) } },
		};
		expect(appliedStatusOptions(response)).toEqual([...CANONICAL_STATUSES]);
	});

	it("reports no applied options rather than throwing when the response is not the shape expected", () => {
		expect(appliedStatusOptions(null)).toEqual([]);
		expect(appliedStatusOptions({})).toEqual([]);
		expect(appliedStatusOptions({ updateProjectV2Field: {} })).toEqual([]);
	});
});

describe("choosing which credential a call authenticates with", () => {
	const env = { GH_PROJECT_TOKEN: "ghp_personal" };

	it("serves label work with the App's own token", () => {
		expect(appCanAuthenticate(["label", "list"])).toBe(true);
		expect(appCanAuthenticate(["issue", "create"])).toBe(true);
	});

	it("serves any call whose path is one the App holds", () => {
		expect(appCanAuthenticate(["api", "-X", "POST", "repos/o/r/labels"])).toBe(true);
		expect(appCanAuthenticate(["api", "-X", "PATCH", "repos/o/r/issues/1"])).toBe(true);
	});

	it("sends everything else to the personal token, because the App has no administration scope", () => {
		expect(appCanAuthenticate(["api", "-X", "PATCH", "repos/o/r"])).toBe(false);
		expect(appCanAuthenticate(["api", "graphql", "-f", "query=..."])).toBe(false);
		expect(appCanAuthenticate(["secret", "list"])).toBe(false);
	});

	it("gives a repository-settings call the personal token", () => {
		expect(ghEnvironment(["api", "-X", "PATCH", "repos/o/r"], env).GH_TOKEN).toBe("ghp_personal");
	});

	it("leaves a label call on the App, which is the whole reason the list is written this way round", () => {
		expect(ghEnvironment(["label", "create", "x"], env).GH_TOKEN).toBeUndefined();
	});

	it("leaves a board mutation on the personal token: a user-owned board 403s as the App", () => {
		// This is the call that failed as `Resource not accessible by integration`, which reads like
		// a missing permission rather than like the wrong credential.
		expect(ghEnvironment(["api", "graphql", "--input", "-"], env).GH_TOKEN).toBe("ghp_personal");
	});

	it("changes nothing when no personal token is configured, so the call falls through to gh", () => {
		expect(ghEnvironment(["api", "-X", "PATCH", "repos/o/r"], {}).GH_TOKEN).toBeUndefined();
	});

	it("does not claim a call with no arguments is App-capable", () => {
		expect(appCanAuthenticate([])).toBe(false);
	});

	it("names the paths it matches as substrings rather than as whole routes", () => {
		for (const path of APP_CAPABLE_PATHS) expect(path.startsWith("/")).toBe(true);
	});
});

describe("reconciling a branch's required checks", () => {
	const required = ["quality", "verify-bound-issue"];

	it("leaves an unprotected branch alone: installing must not switch protection on", () => {
		expect(assessRequiredChecks(null, required).outcome).toBe("unprotected");
	});

	it("leaves a protected branch with no required checks alone", () => {
		expect(assessRequiredChecks({}, required).outcome).toBe("unchecked");
		expect(assessRequiredChecks({ required_status_checks: {} }, required).outcome).toBe("unchecked");
	});

	it("writes nothing when the contexts already match", () => {
		expect(assessRequiredChecks({ required_status_checks: { contexts: required } }, required).outcome).toBe("current");
	});

	it("ignores the order GitHub returns the contexts in", () => {
		const reversed = { required_status_checks: { contexts: [...required].reverse() } };
		expect(assessRequiredChecks(reversed, required).outcome).toBe("current");
	});

	it("writes when the contexts have drifted, naming both sides", () => {
		// The ChessWithQuests case: protection requiring a caller prefix the new caller no longer uses.
		const stale = { required_status_checks: { contexts: ["pipeline / pipeline (3.10)", "quality"] } };
		const assessment = assessRequiredChecks(stale, required);
		expect(assessment.outcome).toBe("drifted");
		expect(assessment.current).toEqual(["pipeline / pipeline (3.10)", "quality"]);
		expect(assessment.required).toEqual(required);
	});

	it("writes when the contexts are a subset, which blocks merges just as badly as a superset", () => {
		expect(assessRequiredChecks({ required_status_checks: { contexts: ["quality"] } }, required).outcome).toBe(
			"drifted",
		);
	});

	it("writes the contexts strictly, so the branch does not accept a merge from a stale base", () => {
		expect(requiredStatusChecksBody(required)).toEqual({ strict: true, contexts: required });
	});

	it("addresses the protection and its checks sub-resource for the branch being reconciled", () => {
		expect(protectionPaths("o/r", "develop")).toEqual({
			read: "repos/o/r/branches/develop/protection",
			write: "repos/o/r/branches/develop/protection/required_status_checks",
		});
	});
});
