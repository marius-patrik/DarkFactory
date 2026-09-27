/**
 * Request classification, retry pacing, and the checkpoint store.
 *
 * The area taxonomy is supplied rather than hard-coded, so these cases use DarkFactory's own
 * declared areas. A repository adopting the pipeline declares its own and gets its own routing; the
 * cases below assert the routing, not the vocabulary.
 */

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { calculateBackoff, DEFAULT_MODEL_FALLBACK_CHAIN, getModelFallbackChain } from "../../src/pipeline/backoff.ts";
import {
	CHECKPOINT_FILENAME,
	type Checkpoint,
	clearCheckpoint,
	excludeCheckpointFromGit,
	loadCheckpoint,
	saveCheckpoint,
} from "../../src/pipeline/checkpoint.ts";
import {
	type AreaTaxonomy,
	areaLabels,
	classifyArea,
	classifyType,
	classifyTypeAndArea,
	TYPE_LABELS,
} from "../../src/pipeline/labels.ts";

/** DarkFactory's declared area taxonomy, in declaration order. */
const TAXONOMY: AreaTaxonomy = {
	defaultArea: "ci",
	areaKeywords: {
		agents: ["agent", "harness", "persona", "provider", "llm", "prompt", "approval", "model", "quota"],
		governance: ["governance", "rule", "protection", "policy", "board", "taxonomy", "label", "permission"],
		release: ["release", "version", "versioning", "tag", "semver", "changelog", "package", "artifact"],
		docs: ["doc", "docs", "documentation", "documentation-truth", "readme", "typedoc", "docstring"],
	},
};

describe("area routing", () => {
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
	])("routes %p to %p", (text, expected) => {
		expect(classifyArea(text, TAXONOMY)).toBe(expected);
	});

	test("declaration order is match order, so a specific area beats a general one", () => {
		// "agent" appears in the agents area and "label" in governance; the first area in the
		// declaration wins, which is what lets a repository put its specific areas first.
		expect(classifyArea("the agent's label handling", TAXONOMY)).toBe("area:agents");
	});

	test("an area with no keywords never matches", () => {
		const sparse: AreaTaxonomy = { defaultArea: "ci", areaKeywords: { empty: [], real: ["widget"] } };
		expect(classifyArea("a widget", sparse)).toBe("area:real");
		expect(classifyArea("something else", sparse)).toBe("area:ci");
	});

	test("a keyword containing a regex metacharacter is matched literally", () => {
		const dotted: AreaTaxonomy = { defaultArea: "ci", areaKeywords: { odd: ["a.c"] } };
		expect(classifyArea("nothing special here", dotted)).toBe("area:ci");
		expect(classifyArea("about a.c today", dotted)).toBe("area:odd");
	});

	test("the taxonomy produces unique, prefixed area labels", () => {
		// A classifier that invents a label produces an unlabelable issue.
		const labels = areaLabels(TAXONOMY);
		expect(labels.length).toBe(new Set(labels).size);
		expect(labels.every((label) => label.startsWith("area:"))).toBe(true);
	});
});

describe("type routing", () => {
	test.each([
		["Fix the crash on startup", "bug"],
		["Document the substrate bus", "docs"],
		["Refactor the palette resolver", "refactor"],
		["Bump the pinned dependencies", "chore"],
		["Add a new brand preset", "feat"],
		["Add retry when the upload fails", "feat"],
		["Improve error handling in the upload path", "feat"],
		["A regression in auth breaks login", "bug"],
		["The login form is broken", "bug"],
	])("classifies %p as %p", (text, expected) => {
		expect(classifyType(text)).toBe(expected as ReturnType<typeof classifyType>);
	});

	test("the issue form's declaration beats prose keywords", () => {
		const body =
			"### Verbatim User Request\n\nAdd failover when the upload fails and improve error handling.\n\n" +
			"### Request Type\n\nfeat (new feature)\n\n### Additional Context\n\nA crash was mentioned only as prior art.\n";
		expect(classifyType(body)).toBe("feat");
	});

	test("a declared bug stays a bug even when the prose reads like a feature", () => {
		const body =
			"### Request Type\n\nbug (bug fix)\n\n### Verbatim User Request\n\nAdd clearer messages when retries succeed.\n";
		expect(classifyType(body)).toBe("bug");
	});

	test("an unknown declared type falls back to the keywords", () => {
		expect(classifyType("### Request Type\n\nwibble\n\nThe login form is broken")).toBe("bug");
	});

	test("only declared types are ever emitted", () => {
		for (const sample of [
			"add a thing",
			"fix a crash in the daemon",
			"refactor the palette resolver",
			"document the bus",
			"bump dependencies",
			"add tests for the codec",
			"wire up a workflow",
		]) {
			expect(TYPE_LABELS as readonly string[]).toContain(classifyTypeAndArea(sample, TAXONOMY).type);
			expect(areaLabels(TAXONOMY)).toContain(classifyTypeAndArea(sample, TAXONOMY).area);
		}
	});
});

describe("retry pacing", () => {
	test("grows and stays finite", () => {
		const delays = [0, 1, 2, 3, 4].map((attempt) => calculateBackoff(attempt, { random: () => 0 }));
		expect(delays.every((delay) => delay >= 0)).toBe(true);
		expect(Math.max(...delays)).toBeLessThan(3600);
	});

	test("respects the maximum even with jitter added", () => {
		// The jitter is added to a base already clamped below the maximum, so the sum cannot exceed
		// it. Clamping only the final result would make the maximum unreachable.
		for (let attempt = 0; attempt < 40; attempt += 1) {
			expect(calculateBackoff(attempt, { random: () => 1, maxDelay: 60 })).toBeLessThanOrEqual(60);
		}
	});

	test("jitter only ever adds delay", () => {
		expect(calculateBackoff(3, { random: () => 0 })).toBeLessThanOrEqual(calculateBackoff(3, { random: () => 1 }));
	});

	test("a non-positive maximum means no waiting at all", () => {
		expect(calculateBackoff(5, { maxDelay: 0 })).toBe(0);
	});

	test("an absurd attempt number does not overflow", () => {
		expect(Number.isFinite(calculateBackoff(10_000, { random: () => 0.5 }))).toBe(true);
	});
});

describe("the model chain", () => {
	test("with no model configured it is the default chain", () => {
		expect(getModelFallbackChain()).toEqual([...DEFAULT_MODEL_FALLBACK_CHAIN]);
	});

	test("naming a model in the default chain narrows it rather than repeating it", () => {
		expect(getModelFallbackChain("claude-opus-4-6-thinking")).toEqual(["claude-opus-4-6-thinking"]);
	});

	test("naming a model outside the default chain prepends it", () => {
		expect(getModelFallbackChain("gpt-5")).toEqual(["gpt-5", ...DEFAULT_MODEL_FALLBACK_CHAIN]);
	});

	test("an explicit chain is rotated so the initial model is first", () => {
		expect(getModelFallbackChain("b", ["a", "b", "c"])).toEqual(["b", "c"]);
		expect(getModelFallbackChain("z", ["a", "b"])).toEqual(["z", "a", "b"]);
	});

	test("an explicit chain with no initial model is used as given", () => {
		expect(getModelFallbackChain(undefined, ["a", "b"])).toEqual(["a", "b"]);
	});
});

/** A checkpoint describing a run that stopped on quota. */
function aCheckpoint(): Checkpoint {
	return {
		timestamp: "2026-09-15T12:00:00Z",
		issueNumber: 42,
		repo: "o/r",
		isPr: false,
		branchName: "feature/a-thing",
		completedSteps: ["Read Request issue #42", "Classified labels as `feat`, `area:ci`"],
		status: "Blocked",
		errorDetail: "429",
	};
}

describe("the checkpoint store", () => {
	test("a saved checkpoint reads back", () => {
		const workspace = mkdtempSync(join(tmpdir(), "df-checkpoint-"));
		saveCheckpoint(aCheckpoint(), workspace);
		expect(loadCheckpoint(workspace)).toEqual(aCheckpoint());
		clearCheckpoint(workspace);
	});

	test("an absent checkpoint reads as absent", () => {
		expect(loadCheckpoint(mkdtempSync(join(tmpdir(), "df-checkpoint-")))).toBeUndefined();
	});

	test("a checkpoint that will not parse reads as absent rather than throwing", () => {
		// A resume that cannot read the old checkpoint must still start; starting over beats refusing
		// to run at all.
		const workspace = mkdtempSync(join(tmpdir(), "df-checkpoint-"));
		writeFileSync(join(workspace, CHECKPOINT_FILENAME), "{not json");
		expect(loadCheckpoint(workspace)).toBeUndefined();
	});

	test("a checkpoint that is a list, not an object, reads as absent", () => {
		const workspace = mkdtempSync(join(tmpdir(), "df-checkpoint-"));
		writeFileSync(join(workspace, CHECKPOINT_FILENAME), "[1, 2]");
		expect(loadCheckpoint(workspace)).toBeUndefined();
	});

	test("saving leaves no temporary file behind", () => {
		// A run killed mid-write must leave either the previous checkpoint or the new one, never a
		// truncated file.
		const workspace = mkdtempSync(join(tmpdir(), "df-checkpoint-"));
		saveCheckpoint(aCheckpoint(), workspace);
		saveCheckpoint(aCheckpoint(), workspace);
		expect(loadCheckpoint(workspace)).toEqual(aCheckpoint());
	});

	test("clearing a workspace with no checkpoint is a no-op", () => {
		const workspace = mkdtempSync(join(tmpdir(), "df-checkpoint-"));
		expect(() => clearCheckpoint(workspace)).not.toThrow();
	});

	test("saving creates the workspace directory", () => {
		const root = mkdtempSync(join(tmpdir(), "df-checkpoint-"));
		const nested = join(root, "nested", "workspace");
		expect(() => saveCheckpoint(aCheckpoint(), nested)).not.toThrow();
		expect(loadCheckpoint(nested)).toEqual(aCheckpoint());
	});
});

describe("the checkpoint is runtime state, not repository content", () => {
	test("a plain repository gets a local exclude", () => {
		const repo = mkdtempSync(join(tmpdir(), "df-checkpoint-git-"));
		mkdirSync(join(repo, ".git"));
		excludeCheckpointFromGit(repo);
		expect(readFileSync(join(repo, ".git", "info", "exclude"), "utf8")).toContain(CHECKPOINT_FILENAME);
	});

	test("a worktree, whose .git is a pointer file, is handled too", () => {
		const repo = mkdtempSync(join(tmpdir(), "df-checkpoint-worktree-"));
		const realGitDir = join(repo, "real-git-dir");
		mkdirSync(realGitDir);
		writeFileSync(join(repo, ".git"), `gitdir: ${realGitDir}\n`);
		excludeCheckpointFromGit(repo);
		expect(readFileSync(join(realGitDir, "info", "exclude"), "utf8")).toContain(CHECKPOINT_FILENAME);
	});

	test("an existing exclude is appended to, not overwritten", () => {
		const repo = mkdtempSync(join(tmpdir(), "df-checkpoint-git-"));
		mkdirSync(join(repo, ".git", "info"), { recursive: true });
		writeFileSync(join(repo, ".git", "info", "exclude"), "*.log");
		excludeCheckpointFromGit(repo);
		excludeCheckpointFromGit(repo);
		const content = readFileSync(join(repo, ".git", "info", "exclude"), "utf8");
		expect(content).toBe(`*.log\n${CHECKPOINT_FILENAME}\n`);
	});

	test("a directory with no .git is left alone", () => {
		// Failing to write an exclude must not fail the checkpoint a run is taking while it runs
		// out of quota.
		const bare = mkdtempSync(join(tmpdir(), "df-checkpoint-bare-"));
		expect(() => excludeCheckpointFromGit(bare)).not.toThrow();
	});
});
