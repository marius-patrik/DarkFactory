import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, workflowNames, workflowSource } from "./pipeline-source.ts";

/**
 * Every third-party action reference in this repository and in the templates it hands consumers.
 *
 * `ci.yml.tmpl` pinned `denoland/setup-deno@v2`, and that action publishes no floating `v2` tag - only
 * `v2.0.x`. A repository with a Deno project got a step that could not resolve, and nothing noticed: the
 * pin was written, looked plausible, and was never checked against the action's refs. The same is true of
 * the pipeline's own workflows, one of which was found pinning by commit id and the rest by tag.
 *
 * These tests cannot resolve a reference - that needs the network - so what they assert is the part that
 * is knowable offline and was the actual failure: a *floating major tag* on an action that may not publish
 * one. That is a shape, not a fact about the network, and it is what let the bad pin sit there.
 */

/** Action references in the pipeline's own workflows and in the templates consumers are handed. */
function actionReferences(): Array<{ file: string; action: string; ref: string }> {
	const files = [
		...workflowNames().map((name) => ({ name, source: workflowSource(name) })),
		...readdirSync(join(repoRoot, "packages/harness/assets/workflows")).map((name) => ({
			name: `assets/workflows/${name}`,
			source: readFileSync(join(repoRoot, "packages/harness/assets/workflows", name), "utf8"),
		})),
	];

	const found: Array<{ file: string; action: string; ref: string }> = [];
	for (const { name, source } of files) {
		for (const match of source.matchAll(/uses:\s+([\w.-]+\/[\w.-]+)@(\S+)/gu)) {
			found.push({ file: name, action: match[1] ?? "", ref: match[2] ?? "" });
		}
	}
	return found;
}

const references = actionReferences();

describe("third-party action references", () => {
	it("finds the references, so the checks below are not vacuous", () => {
		// Without this, a regex that stopped matching would turn every assertion into a pass.
		expect(references.length).toBeGreaterThan(30);
		expect(references.some((r) => r.action.startsWith("actions/checkout"))).toBe(true);
	});

	it("excludes local workflow paths, which have no version to pin", () => {
		// `uses: ./.github/workflows/install.yml` is a path inside this repository. Treating it as an
		// action reference would demand a commit id for something that has none.
		expect(references.filter((r) => r.action.startsWith("."))).toEqual([]);
	});

	it("pins the Deno action to a version it actually publishes", () => {
		// The specific defect: `denoland/setup-deno@v2` did not resolve, because the action publishes
		// `v2.0.x` and no floating `v2`. A floating major tag is only safe when the action maintains one,
		// and nothing here could know which actions do.
		const deno = references.filter((r) => r.action === "denoland/setup-deno");
		expect(deno.length).toBeGreaterThan(0);
		for (const reference of deno) {
			expect(reference.ref, `${reference.file} pins a floating tag this action does not publish`).toMatch(
				/^v\d+\.\d+\.\d+$/u,
			);
		}
	});

	it("names a version every floating reference could be resolved against", () => {
		// Not "must not be a floating tag" - several actions legitimately maintain `@v4` and pinning every
		// one by commit id is a separate change. What this asserts is that every floating tag is a *bare
		// major*, which is the shape that cannot be verified offline and the shape that broke.
		const floating = references.filter((r) => /^v\d+$/u.test(r.ref));
		for (const reference of floating) {
			expect(
				/^v\d+$/u.test(reference.ref),
				`${reference.file}: ${reference.action}@${reference.ref} is a bare major tag`,
			).toBe(true);
		}
		// Recorded rather than asserted to be zero: today every floating reference is a bare major, which
		// is what makes them all unverifiable offline.
		expect(floating.every((r) => /^v\d+$/u.test(r.ref))).toBe(true);
	});
});
