import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { RELEASE_TARGETS, releaseAssetName, releaseBuildMatrix, requireReleaseTarget } from "./release-targets.ts";

/**
 * The release workflow is the only thing that decides what a `df` user can download, so its shape
 * is asserted here rather than reviewed by eye. Two things in particular are load-bearing: every
 * action it runs is pinned to a commit id, because the publish job holds `contents: write`; and its
 * build matrix is derived from the target table rather than written out again, so a target cannot
 * be added to one and forgotten in the other.
 */
const workflowPath = join(import.meta.dir, "..", "..", "..", ".github", "workflows", "release.yml");
const source = await readFile(workflowPath, "utf8");
interface WorkflowStep {
	name: string;
	id?: string;
	uses?: string;
	run?: string;
	if?: string;
}
interface WorkflowJob {
	needs?: string | string[];
	if?: string;
	"runs-on"?: string;
	outputs?: Record<string, string>;
	strategy?: { matrix: unknown; failFast?: boolean };
	steps: WorkflowStep[];
}
const workflow = Bun.YAML.parse(source) as { permissions: Record<string, string>; jobs: Record<string, WorkflowJob> };

/** One `uses: owner/repo@ref # version` reference, split into its parts. */
const ACTION_REFERENCE = /uses:\s*(?<action>[\w.-]+\/[\w.-]+)@(?<ref>\S+)/gu;

/** Every `uses:` reference in the file, in the order they appear. */
function actionReferences(text: string): { action: string; ref: string }[] {
	return [...text.matchAll(ACTION_REFERENCE)].map((match) => ({
		action: match.groups?.action ?? "",
		ref: (match.groups?.ref ?? "").replace(/\s+#.*$/u, ""),
	}));
}

describe("release workflow", () => {
	test("parses as YAML and keeps its write permission and its single concurrency group", () => {
		expect(Object.keys(workflow.jobs).sort()).toEqual(["build", "publish", "resolve"]);
		expect(workflow.permissions).toEqual({ contents: "write" });
	});

	// A floating `@v4` is a tag the action's owner can repoint at new code. In the job that creates
	// a tag and a release that is a supply-chain hole, so every reference names a commit id.
	test("pins every action to a full commit id", () => {
		const references = actionReferences(source);
		expect(references.length).toBeGreaterThan(0);
		const floating = references.filter((entry) => !/^[0-9a-f]{40}$/u.test(entry.ref));
		expect(floating).toEqual([]);
		for (const { action, ref } of references) {
			expect(source).toContain(`uses: ${action}@${ref} # `);
		}
	});

	test("names the version it pinned each action to, so a pin can be audited and refreshed", () => {
		const named = [...source.matchAll(/uses: ([\w.-]+\/[\w.-]+)@([0-9a-f]{40}) # (\S+)/gu)].map((match) => match[3]);
		expect(named.length).toBe(actionReferences(source).length);
		for (const version of named) expect(version).toMatch(/^v\d+\.\d+\.\d+/u);
	});

	test("builds its matrix from the target table rather than repeating the list", () => {
		expect(
			workflow.jobs.resolve?.steps.some((step) => step.run?.includes("packages/harness/scripts/release-targets.ts")),
		).toBe(true);
		expect(workflow.jobs.resolve?.outputs?.matrix ?? "").toContain("steps.targets.outputs.matrix");
		// biome-ignore lint/suspicious/noTemplateCurlyInString: this is a GitHub Actions expression, asserted as the literal text it is
		expect(workflow.jobs.build?.strategy?.matrix).toBe("${{ fromJSON(needs.resolve.outputs.matrix) }}");
		// A literal platform list in the workflow would be a second place to forget a target.
		for (const target of RELEASE_TARGETS) expect(source).not.toContain(`"${target.name}"`);
		expect(source).not.toContain(releaseAssetName("linux-x64"));
	});

	test("runs one build job per published target on that target's own runner", () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: this is a GitHub Actions expression, asserted as the literal text it is
		expect(workflow.jobs.build?.["runs-on"]).toBe("${{ matrix.runner }}");
		expect(source).toContain("fail-fast: false");
		for (const entry of releaseBuildMatrix().include) {
			expect(entry.runner).toBe(requireReleaseTarget(entry.target).runner);
		}
	});

	// Compiling for a platform is not running on it. The build job exists to execute the artifact
	// on the platform it is for, so a target that builds but cannot run fails before it is a
	// release asset rather than on a user's machine.
	test("runs each built binary before it is uploaded as an asset", () => {
		const steps = workflow.jobs.build?.steps ?? [];
		const build = steps.findIndex((step) => step.run?.includes("build --target="));
		const verify = steps.findIndex((step) => step.run?.includes("verify-target.ts"));
		const upload = steps.findIndex((step) => step.uses?.includes("upload-artifact"));
		expect(build).toBeGreaterThanOrEqual(0);
		expect(verify).toBeGreaterThan(build);
		expect(upload).toBeGreaterThan(verify);
	});

	test("gates every publishing job on a release being warranted", () => {
		for (const job of ["build", "publish"]) {
			expect(workflow.jobs[job]?.if).toBe("needs.resolve.outputs.warranted == 'true'");
		}
		expect(workflow.jobs.publish?.needs).toEqual(["resolve", "build"]);
	});

	// One `gh release create` with every asset, so the tag and the complete asset set become public
	// together. A job that reported success without attaching anything is the defect this replaces.
	test("creates the release once, with every asset attached", () => {
		const steps = workflow.jobs.publish?.steps ?? [];
		const create = steps.filter((step) => step.run?.includes("gh release create"));
		expect(create).toHaveLength(1);
		expect(create[0]?.run).toContain('gh release create "$TAG"');
		// biome-ignore lint/suspicious/noTemplateCurlyInString: this is a shell array expansion, asserted as the literal text it is
		expect(create[0]?.run ?? "").toContain('"${ASSETS[@]}"');
		expect(steps.filter((step) => step.run?.includes("gh release upload"))).toHaveLength(0);
		expect(source).toContain("refusing to publish an empty release");
	});

	// The digest is taken where the bytes are built and re-checked where they are published, so a
	// corrupted artifact upload cannot be published with checksums that describe it as intact.
	test("re-verifies the downloaded artifacts against their build-time digests", () => {
		const steps = workflow.jobs.publish?.steps ?? [];
		const verify = steps.findIndex((step) => step.run?.includes("release-checksums.ts"));
		const create = steps.findIndex((step) => step.run?.includes("gh release create"));
		expect(verify).toBeGreaterThanOrEqual(0);
		expect(create).toBeGreaterThan(verify);
		const list = steps.find((step) => step.id === "assets");
		expect(list?.run ?? "").toContain("! -name '*.sha256'");
	});

	test("still resolves the notes, the project assets and the version record through the pipeline", () => {
		expect(source).toContain("--notes-out");
		expect(source).toContain("release.collect_assets");
		expect(source).toContain("--record-version");
		// The notes and the pipeline scripts are per-runner, so the publish job has to be given
		// them rather than assume the resolve job's temporary directory survived.
		expect(source).toContain("name: release-notes");
		expect(source).toContain("--notes-file notes/notes.md");
		for (const job of ["resolve", "publish"]) {
			const sets = (workflow.jobs[job]?.steps ?? []).filter((step) => step.run?.includes("PIPELINE_SCRIPTS="));
			expect(sets).toHaveLength(1);
			expect(sets[0]?.run).toContain("$GITHUB_ENV");
		}
	});
});
