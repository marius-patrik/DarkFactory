import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const assetsDir = join(import.meta.dir, "..", "..", "assets");

/**
 * The exact set of files `packages/harness/assets/` is allowed to contain.
 *
 * This directory is a managed-asset source: `installer.ts` installs from it and `doctor.ts` reports
 * whether the installed copies are in sync. Anything else in here is invisible to both — no gate
 * reads it, and nothing reports it as unexpected — while still being tracked in git and still being
 * a file a glob like `providers.defaults.json*` would pick up.
 *
 * `providers.defaults.json.c8-original` was exactly that: a 92-line stale copy of a 967-line
 * provider catalog, left behind by a hand edit, with no reader and no generator.
 */
const ALLOWED_FILES = new Set(["graph.darkfactory.json", "providers.defaults.json", "providers.free.json"]);

function listFiles(dir: string, prefix = ""): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), rel));
		else out.push(rel);
	}
	return out.sort();
}

describe("managed assets directory contains only known files", () => {
	const present = listFiles(assetsDir);

	test("no stray files at the top level", () => {
		const topLevel = present.filter((path) => !path.includes("/"));
		expect(topLevel.filter((name) => !ALLOWED_FILES.has(name))).toEqual([]);
	});

	test("no backup or editor leftovers anywhere", () => {
		// The specific shape this was filed for: `<name>.<something>` sitting next to a real asset.
		const strays = present.filter((path) => /\.(bak|orig|original|old|tmp|rej|save|swp)$/.test(path));
		expect(strays).toEqual([]);
	});

	test("every top-level file is a known managed asset", () => {
		// Guards the class rather than the instance: a new asset has to be declared here, which is
		// the moment to decide whether df should be installing it.
		expect(present.filter((path) => !path.includes("/"))).toEqual([...ALLOWED_FILES].sort());
	});

	test("the skills directory holds only directories, each with a SKILL.md", () => {
		// `discoverBundledSkills` filters on exactly this shape, so a loose file here is invisible.
		const skillsDir = join(assetsDir, "skills");
		if (!existsSync(skillsDir)) return;
		for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
			if (entry.isFile()) throw new Error(`stray file in assets/skills: ${entry.name}`);
			if (!existsSync(join(skillsDir, entry.name, "SKILL.md"))) {
				throw new Error(`assets/skills/${entry.name} has no SKILL.md`);
			}
		}
	});

	test("the workflows directory holds only managed templates", () => {
		const workflowsDir = join(assetsDir, "workflows");
		if (!existsSync(workflowsDir)) return;
		for (const name of readdirSync(workflowsDir)) {
			if (!name.endsWith(".yml.tmpl")) {
				throw new Error(`assets/workflows/${name} is not a .yml.tmpl template`);
			}
		}
	});
});

describe("the provider catalogs are single, current sources", () => {
	test("there is exactly one providers.defaults.json and no sibling copy", () => {
		const matches = listFiles(assetsDir).filter((path) => path.startsWith("providers.defaults.json"));
		expect(matches).toEqual(["providers.defaults.json"]);
	});

	test("the live catalog is the substantive one, not a stub", () => {
		// A truncation or a bad merge would leave a small file that still parses as JSON, so assert
		// on shape rather than validity.
		const catalog = JSON.parse(readFileSync(join(assetsDir, "providers.defaults.json"), "utf8"));
		const providers = Array.isArray(catalog) ? catalog : (catalog.providers ?? []);
		expect(providers.length).toBeGreaterThanOrEqual(10);
		expect(statSync(join(assetsDir, "providers.defaults.json")).size).toBeGreaterThan(10_000);
	});

	test("every default provider declares the fields the schema requires", () => {
		const catalog = JSON.parse(readFileSync(join(assetsDir, "providers.defaults.json"), "utf8"));
		const providers = Array.isArray(catalog) ? catalog : (catalog.providers ?? []);
		for (const provider of providers) {
			expect(typeof provider.id).toBe("string");
			expect(typeof provider.baseUrl).toBe("string");
		}
	});
});
