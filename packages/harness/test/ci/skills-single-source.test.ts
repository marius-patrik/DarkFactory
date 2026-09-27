import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..", "..", "..");
const bundledDir = join(root, "packages", "harness", "assets", "skills");
const installedDir = join(root, ".agents", "skills");

describe("skills have exactly one source of truth", () => {
	// #1216. `packages/harness/assets/skills/` is the bundled source df ships; `.agents/skills/` is
	// what `df ci install` writes into a consuming repository. Tracking both in this repository made
	// two byte-identical copies of darkfactory-auth and provider-onboarding, so a fix to one was not a
	// fix to the other and nothing reported the divergence.
	test("the installed skills directory is not tracked", () => {
		if (!existsSync(installedDir)) return;
		const tracked = readdirSync(installedDir);
		expect(tracked).toEqual([]);
	});

	test("every bundled skill is a directory containing exactly one SKILL.md", () => {
		const skills = readdirSync(bundledDir, { withFileTypes: true }).filter((e) => e.isDirectory());
		expect(skills.length).toBeGreaterThanOrEqual(4);
		for (const skill of skills) {
			const entries = readdirSync(join(bundledDir, skill.name));
			expect(entries).toEqual(["SKILL.md"]);
		}
	});

	test("a bundled skill and an installed copy can never diverge silently", () => {
		// If an installed copy exists at all, it must be byte-identical to the bundled source.
		// `.gitignore` keeps it out of the index; this keeps a generated file honest.
		if (!existsSync(installedDir)) return;
		for (const skill of readdirSync(installedDir)) {
			const bundled = join(bundledDir, skill, "SKILL.md");
			if (!existsSync(bundled)) continue;
			expect(readFileSync(join(installedDir, skill, "SKILL.md"), "utf8")).toBe(readFileSync(bundled, "utf8"));
		}
	});

	test("each bundled skill states a name in its frontmatter", () => {
		for (const skill of readdirSync(bundledDir)) {
			const body = readFileSync(join(bundledDir, skill, "SKILL.md"), "utf8");
			expect(body.startsWith("---")).toBe(true);
			expect(body).toMatch(/^name:\s*\S+/mu);
		}
	});
});
